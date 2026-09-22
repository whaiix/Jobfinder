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

async function fetchAdzunaLocation(query: JobSearchQuery, location: string, keyword: string, contract?: ContractType): Promise<JobOffer[]> {
  const { adzuna } = getServerConfig();
  if (!adzuna.appId || !adzuna.appKey) throw new Error("Identifiants Adzuna absents.");

  const base = adzuna.apiBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/jobs/${encodeURIComponent(adzuna.country)}/search/1`);
  url.searchParams.set("app_id", adzuna.appId);
  url.searchParams.set("app_key", adzuna.appKey);
  url.searchParams.set("results_per_page", String(Math.min(query.limit * 2, 50)));
  url.searchParams.set("content-type", "application/json");
  if (keyword) url.searchParams.set("what", keyword);
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
  const tasks = (locations.length > 0 ? locations : [""]).flatMap((location) =>
    contractVariants.flatMap((contract) =>
      keywords(query, contract).map((keyword) => () => fetchAdzunaLocation(query, location, keyword, contract)),
    ),
  );
  const settled: PromiseSettledResult<JobOffer[]>[] = [];
  for (let index = 0; index < tasks.length; index += 4) {
    settled.push(...await Promise.allSettled(tasks.slice(index, index + 4).map((task) => task())));
  }
  const batches = settled
    .filter((result): result is PromiseFulfilledResult<JobOffer[]> => result.status === "fulfilled")
    .map((result) => result.value);
  if (batches.length === 0) {
    const failure = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
    throw failure?.reason ?? new Error("Adzuna n’a renvoyé aucun résultat exploitable.");
  }
  return [...new Map(batches.flat().map((offer) => [offer.id, offer])).values()];
}
