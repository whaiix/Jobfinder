import { NextRequest } from "next/server";
import { splitSearchTerms } from "@/lib/jobs/filter-offers";
import { searchSpontaneousTargets } from "@/lib/server/jobs/search-spontaneous";

export async function GET(request: NextRequest) {
  const jobs = splitSearchTerms(request.nextUrl.searchParams.get("q") ?? "");
  const cities = splitSearchTerms(request.nextUrl.searchParams.get("location") ?? "");
  if (jobs.length === 0) {
    return Response.json({ error: "Ajoutez au moins un métier." }, { status: 400 });
  }
  const result = await searchSpontaneousTargets(jobs, cities);
  return Response.json({ ...result, jobs, cities });
}
