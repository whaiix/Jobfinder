import { NextRequest } from "next/server";
import { parseJobSearchQuery } from "@/lib/jobs/search-query";
import { searchJobs } from "@/lib/server/jobs/search-jobs";

export async function GET(request: NextRequest) {
  const parsed = parseJobSearchQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return Response.json(
      { error: "Paramètres de recherche invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await searchJobs(parsed.data);
  return Response.json({
    offers: result.offers,
    meta: {
      ...parsed.data,
      mode: result.mode,
      warnings: result.warnings,
    },
  });
}
