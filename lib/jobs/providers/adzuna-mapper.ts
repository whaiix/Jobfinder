import { normalizeOffer } from "../normalize";
import type { JobOffer, RawJobOffer } from "../types";

export type AdzunaApiOffer = {
  id: string | number;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  contract_type?: string;
  contract_time?: string;
  latitude?: number;
  longitude?: number;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
};

export function mapAdzunaOffer(source: AdzunaApiOffer): JobOffer {
  const location = source.location?.display_name || source.location?.area?.at(-1) || "France";
  const rawOffer: RawJobOffer = {
    id: `adzuna:${source.id}`,
    source: "Adzuna",
    sourceContract: [source.contract_type, source.contract_time].filter(Boolean).join(" "),
    title: source.title?.trim() || "Offre sans intitulé",
    company: source.company?.display_name?.trim() || "Entreprise non communiquée",
    location,
    city: location,
    latitude: source.latitude ?? null,
    longitude: source.longitude ?? null,
    description: source.description?.trim() || "Description non communiquée.",
    publishedAt: source.created || new Date().toISOString(),
    applyUrl: source.redirect_url || "https://www.adzuna.fr/",
    raw: source,
  };

  return normalizeOffer(rawOffer);
}
