export const contractTypes = ["alternance", "stage", "cdi", "cdd", "interim", "other"] as const;
export const experienceLevels = ["0-1", "1-3", "3-5", "5+"] as const;

export type ContractType = (typeof contractTypes)[number];
export type ContractFilter = ContractType | "all";
export type ExperienceLevel = (typeof experienceLevels)[number] | "unknown";
export type ExperienceFilter = (typeof experienceLevels)[number] | "all";
export type ClassificationReason = "title" | "source" | "description" | "fallback";
export type ExperienceReason = "explicit" | "keyword" | "unknown";

export type RawJobOffer = {
  id: string;
  source: string;
  sourceContract?: string | null;
  title: string;
  company: string;
  location: string;
  city?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  experienceText?: string | null;
  publishedAt: string;
  publicationDateVerified?: boolean;
  expiresAt?: string | null;
  applyUrl: string;
  raw?: unknown;
};

export type JobOffer = RawJobOffer & {
  contract: ContractType;
  contractLabel: string;
  classificationReason: ClassificationReason;
  publishedLabel: string;
  experienceLevel: ExperienceLevel;
  experienceLabel: string;
  experienceReason: ExperienceReason;
  compatibilityScore?: number;
};

export type JobSearchQuery = {
  query: string;
  location: string;
  contracts: ContractType[];
  experience: ExperienceFilter;
  radius: number;
  limit: number;
};

export type JobSearchResult = {
  offers: JobOffer[];
  mode: "live" | "database" | "empty";
  sources: string[];
  warnings: string[];
};

export function isContractType(value: string): value is ContractFilter {
  return value === "all" || contractTypes.includes(value as ContractType);
}
