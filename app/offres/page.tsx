import { SearchExperience } from "@/components/search-experience";
import { SiteHeader } from "@/components/site-header";

export default function OffersPage() {
  return (
    <main>
      <SiteHeader />
      <SearchExperience initialOffers={[]} />
    </main>
  );
}
