export type SpontaneousTarget = {
  name: string;
  description: string;
  location: string;
  contactUrl: string;
  specialties: string[];
  source?: "verified" | "serper";
  pageType?: "contact" | "careers" | "website";
};

const communicationTargets: SpontaneousTarget[] = [
  { name: "Publicis Groupe France", description: "Communication, média, création, data et transformation digitale.", location: "France · Paris · Lille", contactUrl: "https://france.publicisgroupe.com/contacts/?lang=fr", specialties: ["communication", "digital", "marketing", "webmaster", "content", "community", "seo"] },
  { name: "Havas France", description: "Réseau d’agences créatives, média et communication intégrée.", location: "France · Puteaux", contactUrl: "https://www.havas.fr/qui-sommes-nous/", specialties: ["communication", "digital", "marketing", "content", "community", "social"] },
  { name: "BETC", description: "Agence de création, stratégie de marque, contenus et communication.", location: "Pantin · Île-de-France", contactUrl: "https://www.betc.com/fr/contact", specialties: ["communication", "marketing", "content", "community", "création"] },
  { name: "TBWA\\Paris", description: "Agence de communication et de création avec un contact carrière dédié.", location: "Boulogne-Billancourt", contactUrl: "https://tbwa-paris.com/contact/", specialties: ["communication", "digital", "marketing", "content", "community"] },
  { name: "VML France", description: "Expérience de marque, expérience client, commerce et transformation digitale.", location: "Paris · Toulouse", contactUrl: "https://www.vml.com/fr/france", specialties: ["communication", "digital", "marketing", "webmaster", "content", "seo", "data"] },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function getSpontaneousTargets(jobs: string[], cities: string[] = []): SpontaneousTarget[] {
  if (jobs.length === 0) return [];
  const terms = normalize(jobs.join(" "));
  const normalizedCities = cities.map(normalize);
  return communicationTargets
    .map((target) => ({ target, score: target.specialties.filter((specialty) => terms.includes(normalize(specialty))).length }))
    .filter(({ target, score }) => score > 0 && (normalizedCities.length === 0 || normalizedCities.some((city) => normalize(target.location).includes(city))))
    .sort((left, right) => right.score - left.score)
    .map(({ target }) => ({ ...target, source: "verified" as const, pageType: "contact" as const }));
}
