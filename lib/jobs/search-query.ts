import { z } from "zod";
import { contractTypes, experienceLevels } from "./types";

const experienceValues = ["all", ...experienceLevels] as const;

export const jobSearchSchema = z.object({
  query: z.string().trim().max(240),
  location: z.string().trim().max(240),
  contracts: z.array(z.enum(contractTypes)).max(contractTypes.length),
  experience: z.enum(experienceValues).default("all"),
  radius: z.coerce.number().int().min(5).max(100).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export function parseJobSearchQuery(params: URLSearchParams) {
  return jobSearchSchema.safeParse({
    query: params.get("q") ?? "",
    location: params.get("location") ?? "",
    contracts: (params.get("contract") ?? "all")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== "all"),
    experience: params.get("experience") ?? "all",
    radius: params.get("radius") ?? 30,
    limit: params.get("limit") ?? 100,
  });
}
