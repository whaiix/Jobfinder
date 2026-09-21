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

export function compatibilityScore(offer: JobOffer, query: JobSearchQuery): number {
  const jobs = splitSearchTerms(query.query);
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
  if (query.contract !== "all") components.push({ score: offer.contract === query.contract ? 100 : 0, weight: 15 });
  if (query.experience !== "all") components.push({ score: matchesExperience(offer.experienceLevel, query.experience) ? 100 : 0, weight: 15 });
  if (components.length === 0) return 100;
  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  return Math.round(components.reduce((sum, component) => sum + component.score * component.weight, 0) / totalWeight);
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
  }).map((offer) => ({ ...offer, compatibilityScore: compatibilityScore(offer, query) }));

  return filtered.sort((left, right) => {
    const difference = (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0);
    if (difference !== 0) return difference;
    return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
  });
}
