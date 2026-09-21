import { z } from "zod";
import { contractTypes } from "./types";

const contractValues = ["all", ...contractTypes] as const;

export const jobSearchSchema = z.object({
  query: z.string().trim().max(100),
  location: z.string().trim().max(100),
  contract: z.enum(contractValues),
  radius: z.coerce.number().int().min(5).max(100).default(30),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export function parseJobSearchQuery(params: URLSearchParams) {
  return jobSearchSchema.safeParse({
    query: params.get("q") ?? "",
    location: params.get("location") ?? "",
    contract: params.get("contract") ?? "all",
    radius: params.get("radius") ?? 30,
    limit: params.get("limit") ?? 50,
  });
}
