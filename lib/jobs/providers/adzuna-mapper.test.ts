import { describe, expect, it } from "vitest";
import { mapAdzunaOffer } from "./adzuna-mapper";

describe("mapAdzunaOffer", () => {
  it("laisse le titre alternance corriger un contrat permanent", () => {
    const offer = mapAdzunaOffer({
      id: "42",
      title: "Alternant développeur web H/F",
      description: "Rejoignez notre équipe",
      contract_type: "permanent",
      created: "2026-09-20T10:00:00Z",
      redirect_url: "https://www.adzuna.fr/details/42",
      company: { display_name: "Acme" },
      location: { display_name: "Paris" },
    });

    expect(offer.contract).toBe("alternance");
    expect(offer.classificationReason).toBe("title");
    expect(offer.source).toBe("Adzuna");
  });
});
