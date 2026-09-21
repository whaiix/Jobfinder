import { describe, expect, it } from "vitest";
import { calculateCvCompatibility, generateCoverLetters } from "./application-assistant";
import type { JobOffer } from "./types";

const offer = { title: "Webmaster SEO", company: "Acme", description: "Piloter WordPress et le SEO pour 3 sites.", compatibilityScore: 100 } as JobOffer;

describe("application assistant", () => {
  it("produces two personalized letters without placeholder", () => {
    const letters = generateCoverLetters(offer, { cvText: "WordPress SEO", firstName: "Hugo", lastName: "Georges", email: "", phone: "", contactConfirmed: true });
    expect(letters.direct).toContain("Hugo Georges");
    expect(letters.narrative).toContain("Acme");
    expect(letters.direct).not.toContain("[Prénom Nom]");
  });

  it("reduces compatibility when the CV misses offer keywords", () => {
    expect(calculateCvCompatibility(offer, "Comptabilité générale")).toBeLessThan(100);
  });
});
