import { describe, expect, it } from "vitest";
import { mapWebSearchResult, parseWebDate } from "./web-search-mapper";

describe("web search mapper", () => {
  it("parses a relative French date", () => {
    expect(parseWebDate("Il y a 2 jours", new Date("2026-09-22T12:00:00Z"))).toBe("2026-09-20T12:00:00.000Z");
  });

  it("rejects a result without a verifiable publication date", () => {
    expect(mapWebSearchResult({ title: "Webmaster", link: "https://example.com/job" })).toBeNull();
  });

  it("extracts the real employer from a HelloWork snippet", () => {
    const offer = mapWebSearchResult({
      title: "Webmaster Junior & Chargé de Communication Digitale H/F",
      link: "https://www.hellowork.com/fr-fr/emplois/123.html",
      date: "Il y a 6 jours",
      snippet: "Découvrez l'offre en CDI pour Espace Gold Change. Espace Gold Change recrute actuellement.",
    });
    expect(offer?.company).toBe("Espace Gold Change");
  });

  it("never presents a job board as the employer", () => {
    const offer = mapWebSearchResult({
      title: "Offre de communication",
      link: "https://www.hellowork.com/fr-fr/emplois/456.html",
      date: "Il y a 2 jours",
      snippet: "Consultez cette annonce et postulez rapidement.",
    });
    expect(offer?.company).toBe("Employeur à vérifier");
  });
});
