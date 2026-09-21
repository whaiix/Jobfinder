import { SearchExperience } from "@/components/search-experience";
import { getDemoOffers } from "@/lib/jobs/demo-offers";

export default function HomePage() {
  return <SearchExperience initialOffers={getDemoOffers()} />;
}
