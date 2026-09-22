import { classifyContract } from "./classify";
import { inferExperience } from "./experience";
import type { ContractType, JobOffer, RawJobOffer } from "./types";

const contractLabels: Record<ContractType, string> = {
  alternance: "Alternance",
  stage: "Stage",
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  other: "Autre",
};

const relativeDateFormatter = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

function formatPublishedDate(date: string): string {
  const elapsedDays = Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
  return relativeDateFormatter.format(elapsedDays, "day");
}

export function normalizeOffer(rawOffer: RawJobOffer): JobOffer {
  const classification = classifyContract(rawOffer);
  const experience = inferExperience(rawOffer);
  return {
    ...rawOffer,
    contract: classification.contract,
    contractLabel: contractLabels[classification.contract],
    classificationReason: classification.reason,
    publishedLabel: rawOffer.publicationDateVerified === false
      ? "Date non précisée · résultat Google du dernier mois"
      : formatPublishedDate(rawOffer.publishedAt),
    experienceLevel: experience.level,
    experienceLabel: experience.label,
    experienceReason: experience.reason,
  };
}

export function toPublicOffer(offer: JobOffer): JobOffer {
  const { raw: _raw, ...publicOffer } = offer;
  return publicOffer;
}
