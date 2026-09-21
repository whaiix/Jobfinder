import { z } from "zod";
import { contractTypes, experienceLevels, sortModes } from "./types";

const contractValues = ["all", ...contractTypes] as const;
const experienceValues = ["all", ...experienceLevels] as const;

export const jobSearchSchema = z.object({
  query: z.string().trim().max(240),
  location: z.string().trim().max(240),
  contract: z.enum(contractValues),
  experience: z.enum(experienceValues).default("all"),
  sort: z.enum(sortModes).default("recent"),
  radius: z.coerce.number().int().min(5).max(100).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parseJobSearchQuery(params: URLSearchParams) {
  return jobSearchSchema.safeParse({
    query: params.get("q") ?? "",
    location: params.get("location") ?? "",
    contract: params.get("contract") ?? "all",
    experience: params.get("experience") ?? "all",
    sort: params.get("sort") ?? "recent",
    radius: params.get("radius") ?? 30,
    limit: params.get("limit") ?? 50,
  });
}
