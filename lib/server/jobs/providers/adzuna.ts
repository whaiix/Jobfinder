import "server-only";
import {
  mapAdzunaOffer,
  type AdzunaApiOffer,
} from "../../../jobs/providers/adzuna-mapper";
import { expandJobSearchTerms, splitSearchTerms } from "../../../jobs/filter-offers";
import type { ContractType, JobOffer, JobSearchQuery } from "../../../jobs/types";
import { getServerConfig } from "../../config";

type SearchResponse = { results?: AdzunaApiOffer[] };

function keywords(query: JobSearchQuery, contract?: ContractType): string[] {
  const jobs = expandJobSearchTerms(query.query);
  const values = jobs.length > 0 ? jobs : [""];
  if (contract === "stage") return values.map((value) => `${value} stage`.trim());
  if (contract === "alternance") {
    return values.map((value) => `${value} alternance`.trim());
  }
  return values;
}

async function fetchAdzunaLocation(query: JobSearchQuery, location: string, contract?: ContractType): Promise<JobOffer[]> {
  const { adzuna } = getServerConfig();
  if (!adzuna.appId || !adzuna.appKey) throw new Error("Identifiants Adzuna absents.");

  const base = adzuna.apiBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/jobs/${encodeURIComponent(adzuna.country)}/search/1`);
  url.searchParams.set("app_id", adzuna.appId);
  url.searchParams.set("app_key", adzuna.appKey);
  url.searchParams.set("results_per_page", String(Math.min(query.limit * 2, 50)));
  url.searchParams.set("content-type", "application/json");
  const searchKeywords = keywords(query, contract).filter(Boolean);
  if (searchKeywords.length === 1) url.searchParams.set("what", searchKeywords[0]);
  if (searchKeywords.length > 1) url.searchParams.set("what_or", searchKeywords.join(" "));
  if (location) url.searchParams.set("where", location);
  if (contract === "cdi") url.searchParams.set("permanent", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Recherche Adzuna refusée (${response.status}) : ${detail.slice(0, 180)}`);
  }

  const payload = (await response.json()) as SearchResponse;
  return (payload.results ?? [])
    .map(mapAdzunaOffer)
    .filter((offer) => query.contracts.length === 0 || query.contracts.includes(offer.contract));
}

export async function searchAdzuna(query: JobSearchQuery): Promise<JobOffer[]> {
  const locations = splitSearchTerms(query.location);
  const contractVariants: Array<ContractType | undefined> = query.contracts.length > 0
    ? query.contracts
    : [undefined];
  const batches = await Promise.all(
    (locations.length > 0 ? locations : [""]).flatMap((location) =>
      contractVariants.map((contract) => fetchAdzunaLocation(query, location, contract)),
    ),
  );
  return [...new Map(batches.flat().map((offer) => [offer.id, offer])).values()];
}
