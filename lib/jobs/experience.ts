import type {
  ExperienceFilter,
  ExperienceLevel,
  ExperienceReason,
  RawJobOffer,
} from "./types";

type Experience = {
  level: ExperienceLevel;
  label: string;
  reason: ExperienceReason;
};

const labels: Record<ExperienceLevel, string> = {
  "0-1": "0–1 an",
  "1-3": "1–3 ans",
  "3-5": "3–5 ans",
  "5+": "5 ans et +",
  unknown: "Non précisée",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase();
}

function levelFromYears(years: number): ExperienceLevel {
  if (years <= 1) return "0-1";
  if (years <= 3) return "1-3";
  if (years <= 5) return "3-5";
  return "5+";
}

export function inferExperience(
  offer: Pick<RawJobOffer, "title" | "description">,
): Experience {
  const text = normalize(`${offer.title} ${offer.description}`);
  const patterns = [
    /(?:minimum|min\.?|au moins|minimum de|experience de|experience professionnelle de|justifiez de)\s*(\d{1,2})\s*(?:ans?|annees?)/i,
    /(\d{1,2})\s*(?:a|à|-)\s*\d{1,2}\s*(?:ans?|annees?)(?:\s+d[' ]experience)?/i,
    /(\d{1,2})\s*(?:ans?|annees?)\s+d[' ]experience/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const level = levelFromYears(Number(match[1]));
      return { level, label: labels[level], reason: "explicit" };
    }
  }

  if (/\b(debutant(?:e)?s? accepte(?:e)?s?|sans experience|junior|premiere experience)\b/i.test(text)) {
    return { level: "0-1", label: labels["0-1"], reason: "keyword" };
  }
  if (/\b(senior|expert(?:e)?)\b/i.test(text)) {
    return { level: "5+", label: labels["5+"], reason: "keyword" };
  }
  if (/\b(confirme(?:e)?|experimente(?:e)?)\b/i.test(text)) {
    return { level: "3-5", label: labels["3-5"], reason: "keyword" };
  }

  return { level: "unknown", label: labels.unknown, reason: "unknown" };
}

export function matchesExperience(level: ExperienceLevel, filter: ExperienceFilter): boolean {
  return filter === "all" || level === filter;
}
