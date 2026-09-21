import { normalizeOffer } from "./normalize";
import type { ContractFilter, RawJobOffer } from "./types";

const rawOffers: RawJobOffer[] = [
  {
    id: "demo-1",
    source: "Source partenaire",
    sourceContract: "CDD",
    title: "Alternant Développeur Front-end H/F",
    company: "Northstar",
    location: "Paris",
    description: "Rejoins une équipe produit pour développer des interfaces React accessibles.",
    publishedAt: "2026-09-21T08:30:00Z",
    applyUrl: "#",
  },
  {
    id: "demo-2",
    source: "Source partenaire",
    sourceContract: "CDD",
    title: "Stage — Assistant marketing digital",
    company: "Maison Junot",
    location: "Lyon",
    description: "Participation aux campagnes, contenus sociaux et analyses de performance.",
    publishedAt: "2026-09-20T10:00:00Z",
    applyUrl: "#",
  },
  {
    id: "demo-3",
    source: "France Travail",
    sourceContract: "CDI",
    title: "Développeur TypeScript H/F",
    company: "Kanso",
    location: "Bordeaux",
    description: "Conception d’applications métier avec TypeScript, Node.js et PostgreSQL.",
    publishedAt: "2026-09-19T14:00:00Z",
    applyUrl: "#",
  },
  {
    id: "demo-4",
    source: "Adzuna",
    sourceContract: "contract",
    title: "Apprentie chargée de communication",
    company: "Atelier Moka",
    location: "Nantes",
    description: "Création éditoriale et accompagnement de la stratégie de marque.",
    publishedAt: "2026-09-18T09:15:00Z",
    applyUrl: "#",
  },
  {
    id: "demo-5",
    source: "France Travail",
    sourceContract: "CDD",
    title: "Chef de projet web H/F",
    company: "Lumen",
    location: "Lille",
    description: "Pilotage des projets digitaux, coordination et suivi des livraisons.",
    publishedAt: "2026-09-17T11:45:00Z",
    applyUrl: "#",
  },
];

export function getDemoOffers() {
  return rawOffers.map(normalizeOffer);
}

export function searchDemoOffers(filters: {
  query: string;
  location: string;
  contract: ContractFilter;
}) {
  const query = filters.query.toLocaleLowerCase("fr");
  const location = filters.location.toLocaleLowerCase("fr");

  return getDemoOffers().filter((offer) => {
    const searchableText = `${offer.title} ${offer.company} ${offer.description}`.toLocaleLowerCase("fr");
    const matchesQuery = !query || searchableText.includes(query);
    const matchesLocation = !location || offer.location.toLocaleLowerCase("fr").includes(location);
    const matchesContract = filters.contract === "all" || offer.contract === filters.contract;
    return matchesQuery && matchesLocation && matchesContract;
  });
}
