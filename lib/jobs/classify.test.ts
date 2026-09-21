import { describe, expect, it } from "vitest";
import { classifyContract } from "./classify";

describe("classifyContract", () => {
  it.each([
    ["Alternant développeur web H/F", "alternance"],
    ["Alternante chargée de communication", "alternance"],
    ["Apprenti mécanicien", "alternance"],
    ["Contrat de professionnalisation — vente", "alternance"],
    ["Stage assistant marketing", "stage"],
    ["Stagiaire UX designer H/F", "stage"],
  ])("classe %s grâce au titre", (title, expected) => {
    expect(
      classifyContract({ title, sourceContract: "CDD", description: "" }),
    ).toEqual({ contract: expected, reason: "title" });
  });

  it("garde le contrat source lorsque le titre ne donne pas d'indice prioritaire", () => {
    expect(
      classifyContract({
        title: "Développeur TypeScript H/F",
        sourceContract: "CDI",
        description: "Poste à temps plein",
      }),
    ).toEqual({ contract: "cdi", reason: "source" });
  });

  it("utilise la description seulement en dernier recours", () => {
    expect(
      classifyContract({
        title: "Assistant communication",
        sourceContract: null,
        description: "Stage de six mois à partir de janvier.",
      }),
    ).toEqual({ contract: "stage", reason: "description" });
  });

  it("renvoie other lorsqu'aucun signal n'est fiable", () => {
    expect(
      classifyContract({
        title: "Assistant communication",
        sourceContract: "contract",
        description: "Rejoignez notre équipe.",
      }),
    ).toEqual({ contract: "other", reason: "fallback" });
  });
});
