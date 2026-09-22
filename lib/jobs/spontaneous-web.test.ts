import { describe, expect, it } from "vitest";
import { deduplicateSpontaneousTargets, mapSpontaneousWebResult } from "./spontaneous-web";
import { getSpontaneousTargets } from "./spontaneous";

describe("spontaneous web results", () => {
  it("keeps an official contact page matching the job and city", () => {
    const result = mapSpontaneousWebResult({ title: "Contact | Studio Nova", link: "https://studio-nova.fr/contact", snippet: "Agence de communication digitale à Lyon." }, ["communication digitale"], ["Lyon"]);
    expect(result?.source).toBe("serper");
    expect(result?.pageType).toBe("contact");
  });

  it("rejects job boards", () => {
    expect(mapSpontaneousWebResult({ title: "Offres communication", link: "https://www.hellowork.com/fr-fr/emploi", snippet: "Lyon" }, ["communication"], ["Lyon"])).toBeNull();
  });

  it("keeps only the best page for a company domain", () => {
    const base = { name: "Nova", description: "", location: "Lyon", specialties: [], source: "serper" as const };
    const targets = deduplicateSpontaneousTargets([
      { ...base, contactUrl: "https://nova.fr/", score: 2 },
      { ...base, contactUrl: "https://nova.fr/contact", score: 8 },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.contactUrl).toContain("contact");
  });

  it("does not use a verified Paris contact for a Lyon-only search", () => {
    const targets = getSpontaneousTargets(["communication"], ["Lyon"]);
    expect(targets.every((target) => target.location.includes("Lyon"))).toBe(true);
  });
});
