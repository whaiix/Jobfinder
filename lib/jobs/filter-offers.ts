import { matchesExperience } from "./experience";
import type { JobOffer, JobSearchQuery } from "./types";

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1_000;

export function splitSearchTerms(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 3);
}

export function isFreshOffer(offer: Pick<JobOffer, "publishedAt">, now = Date.now()): boolean {
  const published = Date.parse(offer.publishedAt);
  return Number.isFinite(published) && published >= now - MAX_AGE_MS;
}

function includesAny(value: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const comparable = value.toLocaleLowerCase("fr");
  return terms.some((term) => comparable.includes(term.toLocaleLowerCase("fr")));
}

function relevanceScore(offer: JobOffer, query: JobSearchQuery): number {
  const jobs = splitSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  let score = 0;
  for (const job of jobs) {
    if (offer.title.toLocaleLowerCase("fr").includes(job.toLocaleLowerCase("fr"))) score += 8;
    if (offer.description.toLocaleLowerCase("fr").includes(job.toLocaleLowerCase("fr"))) score += 2;
  }
  if (includesAny(`${offer.location} ${offer.city ?? ""} ${offer.postalCode ?? ""}`, locations)) {
    score += 4;
  }
  return score;
}

export function filterAndSortOffers(offers: JobOffer[], query: JobSearchQuery): JobOffer[] {
  const jobs = splitSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  const filtered = offers.filter((offer) => {
    const matchesJob = includesAny(`${offer.title} ${offer.description} ${offer.company}`, jobs);
    const matchesLocation = includesAny(
      `${offer.location} ${offer.city ?? ""} ${offer.postalCode ?? ""}`,
      locations,
    );
    return (
      isFreshOffer(offer) &&
      matchesJob &&
      matchesLocation &&
      (query.contract === "all" || offer.contract === query.contract) &&
      matchesExperience(offer.experienceLevel, query.experience)
    );
  });

  return filtered.sort((left, right) => {
    if (query.sort === "relevance") {
      const difference = relevanceScore(right, query) - relevanceScore(left, query);
      if (difference !== 0) return difference;
    }
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
}
