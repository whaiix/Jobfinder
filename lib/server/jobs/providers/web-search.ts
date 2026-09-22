import "server-only";
import { expandJobSearchTerms, splitSearchTerms } from "../../../jobs/filter-offers";
import { mapWebSearchResult, type WebSearchResult } from "../../../jobs/providers/web-search-mapper";
import type { ContractType, JobOffer, JobSearchQuery } from "../../../jobs/types";
import { getServerConfig } from "../../config";

type SerperResponse = { organic?: WebSearchResult[] };

function buildQuery(query: JobSearchQuery, contract?: ContractType) {
  const jobs = expandJobSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  const jobPart = jobs.length ? `(${jobs.map((job) => `"${job}"`).join(" OR ")})` : "emploi";
  const locationPart = locations.length ? `(${locations.map((location) => `"${location}"`).join(" OR ")})` : "France";
  const contractPart = contract ? `"${contract}"` : "";
  return `${jobPart} ${locationPart} ${contractPart} (emploi OR recrutement OR carrière)`.trim();
}

async function fetchPage(search: string, page: number): Promise<WebSearchResult[]> {
  const { serper } = getServerConfig();
  if (!serper.apiKey) return [];
  const response = await fetch(serper.apiBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": serper.apiKey },
    body: JSON.stringify({ q: search, gl: "fr", hl: "fr", page, num: 10, tbs: "qdr:m" }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Recherche web refusée (${response.status}).`);
  return ((await response.json()) as SerperResponse).organic ?? [];
}

export async function searchWeb(query: JobSearchQuery): Promise<JobOffer[]> {
  const contractVariants: Array<ContractType | undefined> = query.contracts.length
    ? query.contracts
    : [undefined];
  const pages = await Promise.all(contractVariants.flatMap((contract) => {
    const search = buildQuery(query, contract);
    return [1, 2, 3, 4, 5].map((page) => fetchPage(search, page));
  }));
  const offers = pages.flat().map(mapWebSearchResult).filter((offer): offer is JobOffer => offer !== null).map((offer) => ({
    ...offer,
    location: query.location || offer.location,
    city: query.location || offer.city,
  }));
  return [...new Map(offers.map((offer) => [offer.id, offer])).values()];
}
