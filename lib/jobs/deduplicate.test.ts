import { describe, expect, it } from "vitest";
import { normalizeOffer } from "./normalize";
import { deduplicateOffers, enrichUnknownEmployers } from "./deduplicate";

function offer(source: string, title: string) {
  return normalizeOffer({
    id: `${source}:1`,
    source,
    title,
    company: "Acme SAS",
    location: "Paris",
    city: "Paris",
    postalCode: "75001",
    description: "Développement web",
    publishedAt: "2026-09-20T10:00:00Z",
    applyUrl: "https://example.com/job",
  });
}

describe("deduplicateOffers", () => {
  it("fusionne une même offre publiée par plusieurs sources", () => {
    const result = deduplicateOffers([
      offer("France Travail", "Développeur Full Stack H/F"),
      offer("Adzuna", "Développeur Full Stack"),
    ]);

    expect(result).toHaveLength(1);
  });

  it("conserve des intitulés différents dans la même entreprise", () => {
    const result = deduplicateOffers([
      offer("France Travail", "Développeur Front-end"),
      offer("Adzuna", "Développeur Back-end"),
    ]);

    expect(result).toHaveLength(2);
  });

  it("récupère l'employeur d'une annonce similaire provenant d'une autre source", () => {
    const adzuna = offer("Adzuna", "Webmaster & Chargé de Communication Digitale Confirmé H/F");
    const google = {
      ...offer("Recherche Google", "Webmaster Junior & Chargé de Communication Digitale H/F Espace"),
      company: "Employeur à vérifier",
    };
    const result = enrichUnknownEmployers([adzuna, google]);
    expect(result[1]?.company).toBe("Acme SAS");
  });
});
