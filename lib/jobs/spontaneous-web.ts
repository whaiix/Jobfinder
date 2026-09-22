import type { SpontaneousTarget } from "./spontaneous";

export type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

const blockedHosts = [
  "hellowork.com", "jobijoba.com", "indeed.com", "linkedin.com", "glassdoor.fr",
  "francetravail.fr", "apec.fr", "cadremploi.fr", "meteojob.com", "jooble.org",
  "talent.com", "pagesjaunes.fr", "societe.com", "facebook.com", "instagram.com",
  "wikipedia.org", "youtube.com", "emploi-collectivites.fr", "chooseandconnect.com",
  "institut-superieur-environnement.com", "onisep.fr", "cidj.com", "orientation.com",
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function includesTerm(value: string, terms: string[]) {
  const comparable = normalize(value);
  const ignored = new Set(["charge", "chargee", "assistant", "assistante", "responsable", "manager", "chef", "metier"]);
  return terms.some((term) => normalize(term).split(/\s+/).some((word) => word.length >= 4 && !ignored.has(word) && comparable.includes(word)));
}

function companyName(hostname: string) {
  const domain = hostname.replace(/^www\./, "").split(".")[0] ?? hostname;
  return domain.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function mapSpontaneousWebResult(
  result: SerperOrganicResult,
  jobs: string[],
  cities: string[],
): (SpontaneousTarget & { score: number }) | null {
  if (!result.link || !result.title) return null;
  let url: URL;
  try { url = new URL(result.link); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (blockedHosts.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`))) return null;
  if (/\.pdf$/i.test(url.pathname) || url.searchParams.has("download")) return null;

  const content = `${result.title} ${result.snippet ?? ""}`;
  const path = normalize(`${url.pathname} ${url.search}`);
  const contactSignal = /contact|nous-joindre|nous_contacter/.test(path);
  const careerSignal = /carriere|career|recrut|join-us|nous-rejoindre/.test(path);
  const jobSignal = jobs.length === 0 || includesTerm(content, jobs);
  const citySignal = cities.length === 0 || includesTerm(content, cities);
  const score = (contactSignal ? 5 : 0) + (careerSignal ? 5 : 0) + (jobSignal ? 2 : 0) + (citySignal ? 1 : 0);
  if ((!contactSignal && !careerSignal) || score < 7) return null;

  return {
    name: companyName(hostname),
    description: result.snippet?.trim() || `Site officiel pertinent pour ${jobs.join(", ") || "votre candidature"}.`,
    location: cities.length ? cities.join(" · ") : "France",
    contactUrl: url.toString(),
    specialties: jobs,
    source: "serper",
    pageType: careerSignal ? "careers" : contactSignal ? "contact" : "website",
    score,
  };
}

export function deduplicateSpontaneousTargets(targets: Array<SpontaneousTarget & { score?: number }>) {
  const byHost = new Map<string, SpontaneousTarget & { score?: number }>();
  for (const target of targets) {
    let key = target.contactUrl;
    try { key = new URL(target.contactUrl).hostname.replace(/^www\./, ""); } catch { /* URL déjà filtrée. */ }
    const current = byHost.get(key);
    if (!current || (target.score ?? 0) > (current.score ?? 0)) byHost.set(key, target);
  }
  return [...byHost.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
