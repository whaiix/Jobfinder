import "server-only";
import { deduplicateSpontaneousTargets, mapSpontaneousWebResult, type SerperOrganicResult } from "../../jobs/spontaneous-web";
import type { SpontaneousTarget } from "../../jobs/spontaneous";
import { getServerConfig, hasSerperCredentials } from "../config";

type SerperResponse = { organic?: SerperOrganicResult[] };

function quotedOr(values: string[], fallback: string) {
  return values.length ? `(${values.map((value) => `"${value}"`).join(" OR ")})` : fallback;
}

function targetingTerms(jobs: string[]) {
  const joined = jobs.join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/communication|community|content|webmaster|digital|marketing/.test(joined)) {
    return ["agence de communication", "agence digitale", "agence web", "studio créatif"];
  }
  if (/developpe|logiciel|informatique|data|devops/.test(joined)) {
    return ["entreprise numérique", "éditeur logiciel", "agence web", "startup tech"];
  }
  if (/graphis|design|ux|ui|creation/.test(joined)) {
    return ["studio de design", "agence créative", "agence digitale"];
  }
  return jobs.map((job) => `entreprise ${job}`);
}

async function serperSearch(search: string): Promise<SerperOrganicResult[]> {
  const { serper } = getServerConfig();
  if (!serper.apiKey) return [];
  const response = await fetch(serper.apiBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": serper.apiKey },
    body: JSON.stringify({ q: search, gl: "fr", hl: "fr", num: 10 }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Recherche Serper refusée (${response.status}).`);
  return ((await response.json()) as SerperResponse).organic ?? [];
}

export async function searchSpontaneousTargets(jobs: string[], cities: string[]): Promise<{
  targets: SpontaneousTarget[];
  source: "serper" | "fallback";
  warning?: string;
}> {
  if (!hasSerperCredentials()) return { targets: [], source: "fallback", warning: "Serper n’est pas configuré." };
  const targetTerms = targetingTerms(jobs);
  const jobPart = quotedOr(targetTerms, "communication OR digital OR marketing");
  const cityPart = quotedOr(cities, "France");
  const common = `${jobPart} ${cityPart} (agence OR entreprise OR studio OR cabinet)`;

  try {
    const pages = await Promise.all([
      serperSearch(`${common} (contact OR "nous contacter" OR "nous joindre") -emploi -offre -formation`),
      serperSearch(`${common} (carrière OR recrutement OR "nous rejoindre" OR candidature)`),
    ]);
    const mapped = pages.flat()
      .map((result) => mapSpontaneousWebResult(result, targetTerms, cities))
      .map((target) => target ? { ...target, specialties: jobs } : null)
      .filter((target): target is NonNullable<typeof target> => target !== null);
    return { targets: deduplicateSpontaneousTargets(mapped).slice(0, 30), source: "serper" };
  } catch (error) {
    return {
      targets: [],
      source: "fallback",
      warning: error instanceof Error ? error.message : "La recherche Serper est indisponible.",
    };
  }
}
