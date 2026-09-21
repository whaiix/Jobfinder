import { normalizeOffer } from "../normalize";
import type { JobOffer, RawJobOffer } from "../types";

export type FranceTravailApiOffer = {
  id: string;
  intitule?: string;
  description?: string;
  dateCreation?: string;
  dateActualisation?: string;
  typeContrat?: string;
  typeContratLibelle?: string;
  experienceExige?: string;
  experienceLibelle?: string;
  experienceCommentaire?: string;
  dateFinPublication?: string;
  lieuTravail?: {
    libelle?: string;
    codePostal?: string;
    commune?: string;
    latitude?: number;
    longitude?: number;
  };
  entreprise?: { nom?: string };
  contact?: { urlPostulation?: string };
  origineOffre?: { origine?: string; urlOrigine?: string };
};

export function mapFranceTravailOffer(source: FranceTravailApiOffer): JobOffer {
  const place = source.lieuTravail;
  const rawOffer: RawJobOffer = {
    id: `france-travail:${source.id}`,
    source: source.origineOffre?.origine || "France Travail",
    sourceContract: [source.typeContrat, source.typeContratLibelle].filter(Boolean).join(" "),
    title: source.intitule?.trim() || "Offre sans intitulé",
    company: source.entreprise?.nom?.trim() || "Entreprise non communiquée",
    location: place?.libelle?.trim() || place?.codePostal || "France",
    city: place?.libelle?.trim() || null,
    postalCode: place?.codePostal || null,
    latitude: place?.latitude ?? null,
    longitude: place?.longitude ?? null,
    description: source.description?.trim() || "Description non communiquée.",
    experienceText: [
      source.experienceExige === "D" ? "Débutant accepté" : "",
      source.experienceLibelle,
      source.experienceCommentaire,
    ].filter(Boolean).join(" "),
    publishedAt: source.dateActualisation || source.dateCreation || new Date().toISOString(),
    expiresAt: source.dateFinPublication || null,
    applyUrl:
      source.contact?.urlPostulation ||
      source.origineOffre?.urlOrigine ||
      `https://candidat.francetravail.fr/offres/recherche/detail/${encodeURIComponent(source.id)}`,
    raw: source,
  };

  return normalizeOffer(rawOffer);
}
