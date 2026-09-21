import type { JobOffer } from "./types";

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(h\s*\/\s*f|f\s*\/\s*h|h-f|f-h)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function identityKey(offer: JobOffer): string {
  const place = offer.postalCode || offer.city || offer.location;
  return [offer.title, offer.company, place].map(comparable).join("|");
}

export function deduplicateOffers(offers: JobOffer[]): JobOffer[] {
  const newestFirst = [...offers].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
  const unique = new Map<string, JobOffer>();

  for (const offer of newestFirst) {
    const key = identityKey(offer);
    if (!unique.has(key)) unique.set(key, offer);
  }

  return [...unique.values()];
}
