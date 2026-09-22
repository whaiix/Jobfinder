import "server-only";
import { groupJobSearchTerms, splitSearchTerms } from "../../../jobs/filter-offers";
import { mapWebSearchResult, type WebSearchResult } from "../../../jobs/providers/web-search-mapper";
import type { ContractType, JobOffer, JobSearchQuery } from "../../../jobs/types";
import { getServerConfig } from "../../config";

type SerperResponse = { organic?: WebSearchResult[] };

const conflictingPlaces = [
  "paris", "nantes", "alencon", "la rochelle", "la reunion", "marseille", "toulouse",
  "bordeaux", "lille", "rennes", "strasbourg", "montpellier", "nice", "grenoble",
  "dijon", "angers", "brest", "rouen", "caen", "clermont-ferrand", "toulon",
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isSearchListing(title: string) {
  return /\b(?:emplois?|offres? d['’]emploi)\b.*\b(?:plus de\s*)?\d+\s+offres?\b|\bvoir les dernières offres\b/i.test(title)
    || /^emplois?\s+/i.test(title)
    || /^offres? d['’]emploi\s+/i.test(title)
    || /^\d+\s+offres? d['’]emploi/i.test(title);
}

function buildQuery(query: JobSearchQuery, jobs: string[], contract?: ContractType) {
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
  const jobGroups = groupJobSearchTerms(query.query);
  const effectiveGroups = jobGroups.length
    ? [...new Set(jobGroups.flat())].map((job) => [job])
    : [["emploi"]];
  const pagesPerGroup = Math.max(1, Math.ceil(10 / effectiveGroups.length));
  const contractVariants: Array<ContractType | undefined> = query.contracts.length
    ? query.contracts
    : [undefined];
  const pages = await Promise.all(contractVariants.flatMap((contract) =>
    effectiveGroups.flatMap((jobs) => {
      const search = buildQuery(query, jobs, contract);
      return Array.from({ length: pagesPerGroup }, (_, index) => fetchPage(search, index + 1));
    }),
  ));
  const locations = splitSearchTerms(query.location);
  const offers = pages.flat().map(mapWebSearchResult).filter((offer): offer is JobOffer => offer !== null)
    .filter((offer) => {
      if (isSearchListing(offer.title)) return false;
      if (locations.length === 0) return true;
      const raw = offer.raw as WebSearchResult | undefined;
      const normalizedTitle = normalize(raw?.title ?? offer.title);
      const selectedLocations = locations.map(normalize);
      if (conflictingPlaces.some((place) => normalizedTitle.includes(place) && !selectedLocations.some((selected) => selected.includes(place) || place.includes(selected)))) return false;
      const content = `${raw?.title ?? offer.title} ${raw?.snippet ?? ""} ${raw?.link ?? offer.applyUrl}`
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return selectedLocations.some((location) => content.includes(location));
    })
    .map((offer) => ({ ...offer, location: query.location || offer.location, city: query.location || offer.city }));
  return [...new Map(offers.map((offer) => [offer.id, offer])).values()];
}
