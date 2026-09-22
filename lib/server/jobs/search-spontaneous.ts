import "server-only";
import { deduplicateSpontaneousTargets, mapSpontaneousWebResult, type SerperOrganicResult } from "../../jobs/spontaneous-web";
import type { SpontaneousTarget } from "../../jobs/spontaneous";
import { getServerConfig, hasSerperCredentials } from "../config";

type SerperResponse = { organic?: SerperOrganicResult[] };

function quotedOr(values: string[], fallback: string) {
  return values.length ? `(${values.map((value) => `"${value}"`).join(" OR ")})` : fallback;
}

async function serperSearch(search: string): Promise<SerperOrganicResult[]> {
  const { serper } = getServerConfig();
  if (!serper.apiKey) return [];
  const response = await fetch(serper.apiBaseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": serper.apiKey },
    body: JSON.stringify({ q: search, gl: "fr", hl: "fr", num: 20 }),
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
  const jobPart = quotedOr(jobs, "communication OR digital OR marketing");
  const cityPart = quotedOr(cities, "France");
  const common = `${jobPart} ${cityPart} (agence OR entreprise OR studio OR cabinet)`;

  try {
    const pages = await Promise.all([
      serperSearch(`${common} (contact OR "nous contacter" OR "nous joindre") -emploi -offre`),
      serperSearch(`${common} (carrière OR recrutement OR "nous rejoindre" OR candidature)`),
    ]);
    const mapped = pages.flat()
      .map((result) => mapSpontaneousWebResult(result, jobs, cities))
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

