import { normalizeOffer } from "../normalize";
import type { JobOffer, RawJobOffer } from "../types";

export type WebSearchResult = {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  position?: number;
};

const aggregatorHosts = [
  "hellowork.com", "jobijoba.com", "adzuna.fr", "indeed.com", "apec.fr",
  "cadremploi.fr", "meteojob.com", "profilculture.com", "lyon-emplois.com",
  "francetravail.fr", "welcometothejungle.com", "glassdoor.fr", "talent.com",
  "linkedin.com", "instagram.com", "emploi-territorial.fr", "choisirleservicepublic.gouv.fr",
  "jobculture.fr", "isarta.fr",
];

function cleanCompany(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s+(?:recrute|recherche)$/i, "").trim();
}

function extractCompany(source: WebSearchResult, hostname: string) {
  const snippet = source.snippet?.trim() ?? "";
  const repeatedEmployer = snippet.match(/\b(?:pour|chez)\s+([^.!?]{2,80}?)\.\s+\1\s+recrute\b/i)?.[1];
  const namedEmployer = snippet.match(/\b(?:pour|chez)\s+([A-ZÀ-ÖØ-Þ][\p{L}\p{N}&'’+.-]*(?:\s+[A-ZÀ-ÖØ-Þ\d][\p{L}\p{N}&'’+.-]*){0,6})(?=[.,]|\s+recrute\b|$)/u)?.[1];
  const candidate = cleanCompany(repeatedEmployer || namedEmployer || "");
  if (candidate && !/^(?:un|une|le|la|les|notre|son)\b|client|compte/i.test(candidate)) return candidate;

  if (hostname.endsWith("profilculture.com")) {
    const commaEmployer = source.title?.match(/^[^-]+-\s*([^,]+),/)?.[1]?.trim();
    if (commaEmployer && commaEmployer.length <= 80) return commaEmployer;
  }

  const isAggregator = aggregatorHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (isAggregator) return "Employeur à vérifier";
  const parts = hostname.split(".");
  const genericSubdomains = new Set(["carriere", "career", "careers", "jobs", "recrutement", "emploi"]);
  const domain = genericSubdomains.has(parts[0] ?? "") && parts.length >= 3 ? parts[1] : parts[0] ?? hostname;
  return domain.split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function parseWebDate(value?: string, now = new Date()): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  const relative = normalized.match(/(?:il y a\s*)?(\d+)\s*(minute|heure|jour|semaine|month|day|hour|week)s?/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2];
    const milliseconds = unit.startsWith("minute") ? 60_000 : unit.startsWith("heure") || unit.startsWith("hour") ? 3_600_000 : unit.startsWith("semaine") || unit.startsWith("week") ? 604_800_000 : unit.startsWith("month") ? 2_592_000_000 : 86_400_000;
    return new Date(now.getTime() - amount * milliseconds).toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function mapWebSearchResult(source: WebSearchResult): JobOffer | null {
  const parsedDate = parseWebDate(source.date);
  if (!source.link) return null;
  let hostname = "site-employeur.fr";
  try { hostname = new URL(source.link).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* URL déjà validée par le fournisseur. */ }
  const company = extractCompany(source, hostname);
  const rawOffer: RawJobOffer = {
    id: `web:${source.link}`,
    source: "Recherche Google",
    title: source.title?.trim() || "Offre publiée sur le web",
    company,
    location: "France",
    description: source.snippet?.trim() || "Consultez la page source pour lire l’offre complète.",
    publishedAt: parsedDate ?? new Date().toISOString(),
    publicationDateVerified: Boolean(parsedDate),
    applyUrl: source.link,
    raw: source,
  };
  return normalizeOffer(rawOffer);
}
