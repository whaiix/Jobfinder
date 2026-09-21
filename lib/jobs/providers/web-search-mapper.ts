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
  const publishedAt = parseWebDate(source.date);
  if (!source.link || !publishedAt) return null;
  let company = source.source || "Site employeur";
  try { company = new URL(source.link).hostname.replace(/^www\./, ""); } catch { /* URL déjà validée par le fournisseur. */ }
  const rawOffer: RawJobOffer = {
    id: `web:${source.link}`,
    source: "Recherche Google",
    title: source.title?.trim() || "Offre publiée sur le web",
    company,
    location: "France",
    description: source.snippet?.trim() || "Consultez la page source pour lire l’offre complète.",
    publishedAt,
    applyUrl: source.link,
    raw: source,
  };
  return normalizeOffer(rawOffer);
}
