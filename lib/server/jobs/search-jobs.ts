import "server-only";
import { searchDemoOffers } from "../../jobs/demo-offers";
import { toPublicOffer } from "../../jobs/normalize";
import type { JobSearchQuery, JobSearchResult } from "../../jobs/types";
import { hasFranceTravailCredentials } from "../config";
import { isDatabaseConfigured } from "../db/client";
import { searchFranceTravail } from "./providers/france-travail";
import { searchStoredOffers, upsertOffers } from "./repository";

export async function searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
  const warnings: string[] = [];

  if (hasFranceTravailCredentials()) {
    try {
      const liveOffers = await searchFranceTravail(query);
      if (isDatabaseConfigured()) {
        try {
          await upsertOffers(liveOffers);
        } catch (error) {
          warnings.push(
            `Sauvegarde PostgreSQL indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
          );
        }
      }
      return { offers: liveOffers.map(toPublicOffer), mode: "live", warnings };
    } catch (error) {
      warnings.push(
        `France Travail indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  if (isDatabaseConfigured()) {
    try {
      const storedOffers = await searchStoredOffers(query);
      return { offers: storedOffers, mode: "database", warnings };
    } catch (error) {
      warnings.push(
        `PostgreSQL indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  return {
    offers: searchDemoOffers(query).slice(0, query.limit),
    mode: "demo",
    warnings,
  };
}
