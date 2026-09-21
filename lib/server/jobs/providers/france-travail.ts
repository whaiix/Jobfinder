import "server-only";
import {
  mapFranceTravailOffer,
  type FranceTravailApiOffer,
} from "../../../jobs/providers/france-travail-mapper";
import { expandJobSearchTerms, splitSearchTerms } from "../../../jobs/filter-offers";
import type { ContractType, JobOffer, JobSearchQuery } from "../../../jobs/types";
import { getServerConfig } from "../../config";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type SearchResponse = { resultats?: FranceTravailApiOffer[] };
type TokenCache = { token: string; expiresAt: number } | null;

let tokenCache: TokenCache = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const { franceTravail } = getServerConfig();
  if (!franceTravail.clientId || !franceTravail.clientSecret) {
    throw new Error("Identifiants France Travail absents.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: franceTravail.clientId,
    client_secret: franceTravail.clientSecret,
    scope: franceTravail.scope,
  });
  const response = await fetch(franceTravail.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        `Token France Travail refusé (${response.status}).`,
    );
  }

  tokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 1_200) * 1_000,
  };
  return payload.access_token;
}

async function resolveCommuneCode(location: string): Promise<string | null> {
  if (!location) return null;
  if (/^\d{5}$/.test(location)) return location;

  const url = new URL("https://geo.api.gouv.fr/communes");
  url.searchParams.set("nom", location);
  url.searchParams.set("fields", "code,nom,population");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) return null;
  const communes = (await response.json()) as Array<{ code?: string }>;
  return communes[0]?.code ?? null;
}

function keywordForContract(query: string, contract?: ContractType): string {
  if (contract === "stage") return `${query} stage`.trim();
  if (contract === "alternance") return `${query} alternance`.trim();
  return query;
}

async function fetchVariant(
  query: JobSearchQuery,
  keyword: string,
  communeCode: string | null,
  token: string,
): Promise<JobOffer[]> {
  const { franceTravail } = getServerConfig();
  const url = new URL(`${franceTravail.apiBaseUrl.replace(/\/$/, "")}/offres/search`);
  if (keyword) url.searchParams.set("motsCles", keyword);
  if (communeCode) {
    url.searchParams.set("commune", communeCode);
    url.searchParams.set("distance", String(query.radius));
  }
  const singleContract = query.contracts.length === 1 ? query.contracts[0] : undefined;
  if (singleContract === "cdi") url.searchParams.set("typeContrat", "CDI");
  if (singleContract === "cdd") url.searchParams.set("typeContrat", "CDD");
  url.searchParams.set("range", `0-${Math.min(query.limit, 49)}`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 204) return [];
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Recherche France Travail refusée (${response.status}) : ${detail.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as SearchResponse;
  return (payload.resultats ?? []).map(mapFranceTravailOffer);
}

export async function searchFranceTravail(query: JobSearchQuery): Promise<JobOffer[]> {
  const jobs = expandJobSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  const effectiveJobs = jobs.length > 0 ? jobs : [""];
  const effectiveLocations = locations.length > 0 ? locations : [""];
  const [token, communeCodes] = await Promise.all([
    getAccessToken(),
    Promise.all(effectiveLocations.map(resolveCommuneCode)),
  ]);
  const batches = await Promise.all(
    effectiveJobs.flatMap((job) =>
      communeCodes.map((communeCode) =>
        fetchVariant(query, keywordForContract(job, query.contracts.length === 1 ? query.contracts[0] : undefined), communeCode, token),
      ),
    ),
  );
  const deduplicated = new Map(batches.flat().map((offer) => [offer.id, offer]));

  return [...deduplicated.values()]
    .filter((offer) => query.contracts.length === 0 || query.contracts.includes(offer.contract))
    .slice(0, query.limit * 3);
}
