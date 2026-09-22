import { describe, expect, it } from "vitest";
import { expandJobSearchTerms, filterAndSortOffers, groupJobSearchTerms, isFreshOffer } from "./filter-offers";
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
  radius: 30, limit: 50,
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

  it("keeps the union when several contract types are selected", () => {
    const result = filterAndSortOffers([
      offer({ id: "cdi", contract: "cdi" }),
      offer({ id: "cdd", contract: "cdd" }),
      offer({ id: "stage", contract: "stage" }),
    ], { ...query, contracts: ["cdi", "cdd"] });
    expect(result.map((item) => item.id).sort()).toEqual(["cdd", "cdi"]);
  });

  it("sorts by compatibility and uses recency to break equal scores", () => {
    const result = filterAndSortOffers([
      offer({ id: "description", title: "Ingénieur logiciel", publishedAt: "2026-09-22T10:00:00.000Z" }),
      offer({ id: "older-title", publishedAt: "2026-09-20T10:00:00.000Z" }),
      offer({ id: "newer-title", publishedAt: "2026-09-21T10:00:00.000Z" }),
    ], query);
    expect(result.map((item) => item.id)).toEqual(["newer-title", "older-title", "description"]);
    expect(result[0]?.compatibilityScore).toBeGreaterThan(result[2]?.compatibilityScore ?? 0);
  });
});
