import type {
  ClassificationReason,
  ContractType,
  RawJobOffer,
} from "./types";

type Classification = {
  contract: ContractType;
  reason: ClassificationReason;
};

const highConfidenceTitleRules: Array<{ contract: ContractType; pattern: RegExp }> = [
  {
    contract: "alternance",
    pattern:
      /\b(alternance|alternant(?:e)?|apprenti(?:e)?|apprentissage|contrat\s+de\s+professionnalisation|contrat\s+pro)\b/i,
  },
  {
    contract: "stage",
    pattern: /\b(stage|stagiaire|internship)\b/i,
  },
];

const generalRules: Array<{ contract: ContractType; pattern: RegExp }> = [
  ...highConfidenceTitleRules,
  { contract: "cdi", pattern: /\b(cdi|contrat\s+a\s+duree\s+indeterminee|permanent)\b/i },
  { contract: "cdd", pattern: /\b(cdd|contrat\s+a\s+duree\s+determinee|fixed[ -]term)\b/i },
  { contract: "interim", pattern: /\b(interim|mission\s+temporaire|temporary)\b/i },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[-_/|()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchRules(value: string, rules = generalRules): ContractType | null {
  const normalized = normalize(value);
  return rules.find(({ pattern }) => pattern.test(normalized))?.contract ?? null;
}

export function classifyContract(offer: Pick<RawJobOffer, "title" | "sourceContract" | "description">): Classification {
  // A clear internship/apprenticeship title must override a generic or incorrect source tag.
  const titleOverride = matchRules(offer.title, highConfidenceTitleRules);
  if (titleOverride) return { contract: titleOverride, reason: "title" };

  const sourceContract = matchRules(offer.sourceContract ?? "");
  if (sourceContract) return { contract: sourceContract, reason: "source" };

  const titleContract = matchRules(offer.title);
  if (titleContract) return { contract: titleContract, reason: "title" };

  const descriptionContract = matchRules(offer.description);
  if (descriptionContract) return { contract: descriptionContract, reason: "description" };

  return { contract: "other", reason: "fallback" };
}
