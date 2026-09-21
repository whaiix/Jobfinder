import { describe, expect, it } from "vitest";
import { inferExperience } from "./experience";

describe("inferExperience", () => {
  it.each([
    ["Débutant accepté", "0-1"],
    ["Vous justifiez de 2 ans d'expérience", "1-3"],
    ["Expérience professionnelle de 4 années minimum", "3-5"],
    ["8 à 10 ans d'expérience attendus", "5+"],
    ["Profil senior autonome", "5+"],
  ])("classe %s", (description, expected) => {
    expect(inferExperience({ title: "Développeur", description }).level).toBe(expected);
  });
});
