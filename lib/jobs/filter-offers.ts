import { matchesExperience } from "./experience";
import type { JobOffer, JobSearchQuery } from "./types";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export function splitSearchTerms(value: string): string[] {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 3);
}

export function expandJobSearchTerms(value: string): string[] {
  return [...new Set(groupJobSearchTerms(value).flat())].slice(0, 10);
}

export function groupJobSearchTerms(value: string): string[][] {
  const baseTerms = splitSearchTerms(value).flatMap((item) =>
    item.split(/\s+(?:&|et)\s+|\s*\/\s*/i).map((part) => part.trim()).filter(Boolean),
  );
  return baseTerms.slice(0, 6).map((term) => {
    const normalized = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalized.includes("webmaster") || normalized.includes("webmestre")) {
      return [...new Set([term, "Webmaster", "Webmestre"])];
    }
    if (normalized.includes("communication digitale") || normalized.includes("charge de communication") || normalized.includes("assistant de communication")) {
      return [...new Set([term, "Chargé de communication", "Assistant de communication", "Communication digitale", "Community manager"] )];
    }
    return [term];
  });
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

export function compatibilityScore(offer: JobOffer, query: JobSearchQuery): number {
  const jobs = expandJobSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  const components: Array<{ score: number; weight: number }> = [];

  if (jobs.length > 0) {
    const title = offer.title.toLocaleLowerCase("fr");
    const description = offer.description.toLocaleLowerCase("fr");
    const company = offer.company.toLocaleLowerCase("fr");
    const jobScore = Math.max(...jobs.map((job) => {
      const term = job.toLocaleLowerCase("fr");
      if (title.includes(term)) return 100;
      if (description.includes(term)) return 72;
      if (company.includes(term)) return 55;
      return 0;
    }));
    components.push({ score: jobScore, weight: 50 });
  }
  if (locations.length > 0) components.push({
    score: includesAny(`${offer.location} ${offer.city ?? ""} ${offer.postalCode ?? ""}`, locations) ? 100 : 0,
    weight: 20,
  });
  if (query.contracts.length > 0) components.push({ score: query.contracts.includes(offer.contract) ? 100 : 0, weight: 15 });
  if (query.experience !== "all") components.push({
    score: offer.experienceLevel === "unknown" ? 65 : offer.experienceLevel === query.experience ? 100 : 0,
    weight: 15,
  });
  if (components.length === 0) return 100;
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return Math.round(components.reduce((sum, component) => sum + component.score * component.weight, 0) / totalWeight);
}

export function filterAndSortOffers(offers: JobOffer[], query: JobSearchQuery): JobOffer[] {
  const jobs = expandJobSearchTerms(query.query);
  const locations = splitSearchTerms(query.location);
  const filtered = offers.filter((offer) => {
    const matchesJob = includesAny(offer.title, jobs);
    const matchesLocation = includesAny(
      `${offer.location} ${offer.city ?? ""} ${offer.postalCode ?? ""}`,
      locations,
    );
    return (
      isFreshOffer(offer) &&
      matchesJob &&
      matchesLocation &&
      (query.contracts.length === 0 || query.contracts.includes(offer.contract)) &&
      matchesExperience(offer.experienceLevel, query.experience)
    );
  }).map((offer) => ({ ...offer, compatibilityScore: compatibilityScore(offer, query) }));

  return filtered.sort((left, right) => {
    const difference = (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0);
    if (difference !== 0) return difference;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
}
