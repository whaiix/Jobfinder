export const contractTypes = ["alternance", "stage", "cdi", "cdd", "interim", "other"] as const;

export type ContractType = (typeof contractTypes)[number];
export type ContractFilter = ContractType | "all";
export type ClassificationReason = "title" | "source" | "description" | "fallback";

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
  publishedAt: string;
  expiresAt?: string | null;
  applyUrl: string;
  raw?: unknown;
};

export type JobOffer = RawJobOffer & {
  contract: ContractType;
  contractLabel: string;
  classificationReason: ClassificationReason;
  publishedLabel: string;
};

export type JobSearchQuery = {
  query: string;
  location: string;
  contract: ContractFilter;
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
