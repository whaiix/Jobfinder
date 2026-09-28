import { describe, expect, it } from "vitest";
import { expandJobSearchTerms, filterAndSortOffers, filterOffersByContracts, groupJobSearchTerms, isFreshOffer, matchesExactJobTitle } from "./filter-offers";
import type { JobOffer, JobSearchQuery } from "./types";

const now = Date.parse("2026-09-22T12:00:00.000Z");

function offer(overrides: Partial<JobOffer> = {}): JobOffer {
  return {
    id: "1", source: "test", title: "Développeur React junior", company: "Acme",
    location: "Paris", city: "Paris", description: "CDI, débutant accepté. React et TypeScript.",
    publishedAt: "2026-09-20T12:00:00.000Z", applyUrl: "https://example.com",
    contract: "cdi", contractLabel: "CDI", classificationReason: "description",
    publishedLabel: "Il y a 2 jours", experienceLevel: "0-1", experienceLabel: "0–1 an",
    experienceReason: "keyword", ...overrides,
  };
}

const query: JobSearchQuery = {
  query: "React", location: "Paris", contracts: ["cdi"], experience: "0-1",
  exactTitle: false, radius: 30,
};

describe("offer quality filter", () => {
  it("expands composite recommended job titles", () => {
    const terms = expandJobSearchTerms("Webmaster & Chargé de Communication Digitale");
    expect(terms).toContain("Webmaster");
    expect(terms).toContain("Chargé de communication");
    expect(terms).toContain("Assistant de communication");
  });
  it("keeps several selected jobs in separate search groups", () => {
    const groups = groupJobSearchTerms("Webmaster,Chargé de communication");
    expect(groups).toHaveLength(2);
    expect(groups[0]).toContain("Webmaster");
    expect(groups[0]).not.toContain("Assistant de communication");
    expect(groups[1]).toContain("Assistant de communication");
  });
  it("rejects offers older than thirty days", () => {
    expect(isFreshOffer(offer({ publishedAt: "2026-08-23T12:00:00.000Z" }), now)).toBe(true);
    expect(isFreshOffer(offer({ publishedAt: "2026-08-23T11:59:59.000Z" }), now)).toBe(false);
  });

  it("keeps only matching contract, experience, job and location", () => {
    const result = filterAndSortOffers([
      offer(),
      offer({ id: "2", contract: "cdd" }),
      offer({ id: "3", experienceLevel: "3-5" }),
      offer({ id: "4", location: "Lyon", city: "Lyon" }),
    ], query);
    expect(result.map((item) => item.id)).toEqual(["1"]);
  });

  it("rejects an offer when the job only appears incidentally in its description", () => {
    const result = filterAndSortOffers([
      offer({ id: "commercial", title: "Commercial itinérant", description: "Utilisation ponctuelle de React pour communiquer avec l’équipe." }),
    ], query);
    expect(result).toEqual([]);
  });

  it("matches an exact requested job as a complete phrase in the offer title", () => {
    expect(matchesExactJobTitle("Chargé de communication digitale H/F", "Chargé de communication")).toBe(true);
    expect(matchesExactJobTitle("Assistant de communication H/F", "Chargé de communication")).toBe(false);
  });

  it("keeps any exact title when several jobs are selected", () => {
    const result = filterAndSortOffers([
      offer({ id: "webmaster", title: "Webmaster junior H/F" }),
      offer({ id: "communication", title: "Chargé de communication digitale" }),
      offer({ id: "approximation", title: "Community manager" }),
    ], { ...query, query: "Webmaster,Chargé de communication", exactTitle: true });
    expect(result.map((item) => item.id).sort()).toEqual(["communication", "webmaster"]);
  });

  it("keeps the union when several contract types are selected", () => {
    const result = filterAndSortOffers([
      offer({ id: "cdi", contract: "cdi" }),
      offer({ id: "cdd", contract: "cdd" }),
      offer({ id: "stage", contract: "stage" }),
    ], { ...query, contracts: ["cdi", "cdd"] });
    expect(result.map((item) => item.id).sort()).toEqual(["cdd", "cdi"]);
  });

  it("never reduces a contract union when another contract is selected", () => {
    const catalog = [
      offer({ id: "cdi-1", contract: "cdi" }),
      offer({ id: "cdi-2", contract: "cdi" }),
      offer({ id: "cdd-1", contract: "cdd" }),
    ];
    expect(filterOffersByContracts(catalog, ["cdi"])).toHaveLength(2);
    expect(filterOffersByContracts(catalog, ["cdi", "cdd"])).toHaveLength(3);
  });

  it("does not impose an application-level maximum of one hundred offers", () => {
    const manyOffers = Array.from({ length: 140 }, (_, index) => offer({ id: String(index) }));
    expect(filterAndSortOffers(manyOffers, query)).toHaveLength(140);
  });

  it("sorts equally relevant offers by recency", () => {
    const result = filterAndSortOffers([
      offer({ id: "older-title", publishedAt: "2026-09-20T10:00:00.000Z" }),
      offer({ id: "newer-title", publishedAt: "2026-09-21T10:00:00.000Z" }),
    ], query);
    expect(result.map((item) => item.id)).toEqual(["newer-title", "older-title"]);
  });
});
