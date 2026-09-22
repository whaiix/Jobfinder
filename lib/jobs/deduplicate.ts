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

const unknownCompanies = new Set(["employeur a verifier", "entreprise non communiquee", "site employeur"]);
const titleNoise = new Set(["offre", "emploi", "cdi", "cdd", "junior", "confirme", "confirmee", "hf", "fh", "france", "travail"]);

function titleTokens(title: string) {
  return new Set(comparable(title).split(" ").filter((token) => token.length > 2 && !titleNoise.has(token)));
}

function titleSimilarity(left: string, right: string) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  const smallest = Math.min(leftTokens.size, rightTokens.size);
  if (smallest === 0) return 0;
  return [...leftTokens].filter((token) => rightTokens.has(token)).length / smallest;
}

function samePlace(left: JobOffer, right: JobOffer) {
  const leftPlace = comparable(left.city || left.location);
  const rightPlace = comparable(right.city || right.location);
  return leftPlace.includes(rightPlace) || rightPlace.includes(leftPlace);
}

export function enrichUnknownEmployers(offers: JobOffer[]): JobOffer[] {
  const known = offers.filter((offer) => !unknownCompanies.has(comparable(offer.company)));
  return offers.map((offer) => {
    if (!unknownCompanies.has(comparable(offer.company))) return offer;
    const match = known
      .filter((candidate) => samePlace(offer, candidate))
      .map((candidate) => ({ candidate, score: titleSimilarity(offer.title, candidate.title) }))
      .filter(({ score }) => score >= 0.7)
      .sort((left, right) => right.score - left.score)[0]?.candidate;
    return match ? { ...offer, company: match.company } : offer;
  });
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
