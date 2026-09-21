import "server-only";
import {
  mapAdzunaOffer,
  type AdzunaApiOffer,
} from "../../../jobs/providers/adzuna-mapper";
import { expandJobSearchTerms, splitSearchTerms } from "../../../jobs/filter-offers";
import type { JobOffer, JobSearchQuery } from "../../../jobs/types";
import { getServerConfig } from "../../config";

type SearchResponse = { results?: AdzunaApiOffer[] };

function keywords(query: JobSearchQuery): string[] {
  const jobs = expandJobSearchTerms(query.query);
  const values = jobs.length > 0 ? jobs : [""];
  if (query.contract === "stage") return values.map((value) => `${value} stage`.trim());
  if (query.contract === "alternance") {
    return values.map((value) => `${value} alternance`.trim());
  }
  return values;
}

async function fetchAdzunaLocation(query: JobSearchQuery, location: string): Promise<JobOffer[]> {
  const { adzuna } = getServerConfig();
  if (!adzuna.appId || !adzuna.appKey) throw new Error("Identifiants Adzuna absents.");

  const base = adzuna.apiBaseUrl.replace(/\/$/, "");
  const url = new URL(`${base}/jobs/${encodeURIComponent(adzuna.country)}/search/1`);
  url.searchParams.set("app_id", adzuna.appId);
  url.searchParams.set("app_key", adzuna.appKey);
  url.searchParams.set("results_per_page", String(Math.min(query.limit * 2, 50)));
  url.searchParams.set("content-type", "application/json");
  const searchKeywords = keywords(query).filter(Boolean);
  if (searchKeywords.length === 1) url.searchParams.set("what", searchKeywords[0]);
  if (searchKeywords.length > 1) url.searchParams.set("what_or", searchKeywords.join(" "));
  if (location) url.searchParams.set("where", location);
  if (query.contract === "cdi") url.searchParams.set("permanent", "1");

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
    .filter((offer) => query.contract === "all" || offer.contract === query.contract);
}

export async function searchAdzuna(query: JobSearchQuery): Promise<JobOffer[]> {
  const locations = splitSearchTerms(query.location);
  const batches = await Promise.all(
    (locations.length > 0 ? locations : [""]).map((location) =>
      fetchAdzunaLocation(query, location),
    ),
  );
  return [...new Map(batches.flat().map((offer) => [offer.id, offer])).values()];
}
