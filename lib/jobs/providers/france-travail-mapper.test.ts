import { describe, expect, it } from "vitest";
import { mapFranceTravailOffer } from "./france-travail-mapper";

describe("mapFranceTravailOffer", () => {
  it("corrige en stage une offre France Travail marquée CDD", () => {
    const offer = mapFranceTravailOffer({
      id: "123",
      intitule: "Stage développeur web H/F",
      typeContrat: "CDD",
      typeContratLibelle: "Contrat à durée déterminée",
      description: "Découverte de l'équipe produit.",
    });

    expect(offer.contract).toBe("stage");
    expect(offer.classificationReason).toBe("title");
  });

  it("corrige en alternance une offre marquée CDD", () => {
    const offer = mapFranceTravailOffer({
      id: "456",
      intitule: "Alternant data analyst",
      typeContrat: "CDD",
      description: "Formation en entreprise.",
    });

    expect(offer.contract).toBe("alternance");
  });

  it("utilise le champ d'expérience structuré de France Travail", () => {
    const offer = mapFranceTravailOffer({
      id: "789",
      intitule: "Webmaster",
      description: "Gestion du site internet.",
      experienceExige: "D",
      experienceLibelle: "Débutant accepté",
    });

    expect(offer.experienceLevel).toBe("0-1");
    expect(offer.experienceReason).toBe("keyword");
  });
});
