import "server-only";
import { deduplicateOffers } from "../../jobs/deduplicate";
import { filterAndSortOffers } from "../../jobs/filter-offers";
import { toPublicOffer } from "../../jobs/normalize";
import type { JobOffer, JobSearchQuery, JobSearchResult } from "../../jobs/types";
import { hasAdzunaCredentials, hasFranceTravailCredentials } from "../config";
import { isDatabaseConfigured } from "../db/client";
import { searchAdzuna } from "./providers/adzuna";
import { searchFranceTravail } from "./providers/france-travail";
import { searchStoredOffers, upsertOffers } from "./repository";

export async function searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
  const warnings: string[] = [];
  const attemptedSources: string[] = [];
  const providers: Array<{ name: string; search: () => Promise<JobOffer[]> }> = [];

  if (hasFranceTravailCredentials()) {
    providers.push({ name: "France Travail", search: () => searchFranceTravail(query) });
  }
  if (hasAdzunaCredentials()) {
    providers.push({ name: "Adzuna", search: () => searchAdzuna(query) });
  }

  if (providers.length > 0) {
    const settled = await Promise.allSettled(providers.map((provider) => provider.search()));
    const liveOffers: JobOffer[] = [];
    const sources: string[] = [];

    settled.forEach((result, index) => {
      const provider = providers[index];
      if (result.status === "fulfilled") {
        attemptedSources.push(provider.name);
        liveOffers.push(...result.value);
        sources.push(provider.name);
      } else {
        warnings.push(
          `${provider.name} indisponible : ${result.reason instanceof Error ? result.reason.message : "erreur inconnue"}`,
        );
      }
    });

    const uniqueOffers = filterAndSortOffers(deduplicateOffers(liveOffers), query).slice(
      0,
      query.limit,
    );
    if (uniqueOffers.length > 0) {
      if (isDatabaseConfigured()) {
        try {
          await upsertOffers(uniqueOffers);
        } catch (error) {
          warnings.push(
            `Sauvegarde PostgreSQL indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
          );
        }
      }
      return {
        offers: uniqueOffers.map(toPublicOffer),
        mode: "live",
        sources,
        warnings,
      };
    }
  }

  if (isDatabaseConfigured()) {
    try {
      const storedOffers = await searchStoredOffers(query);
      if (storedOffers.length > 0) {
        return { offers: storedOffers, mode: "database", sources: ["Base enregistrée"], warnings };
      }
    } catch (error) {
      warnings.push(
        `PostgreSQL indisponible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }

  return {
    offers: [],
    mode: "empty",
    sources: attemptedSources,
    warnings:
      providers.length === 0
        ? [...warnings, "Aucune source d’offres n’est configurée."]
        : warnings,
  };
}
