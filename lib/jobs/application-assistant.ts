import type { JobOffer } from "@/lib/jobs/types";

const keywordCatalog = [
  "React", "TypeScript", "JavaScript", "Next.js", "Node.js", "HTML", "CSS",
  "Python", "Java", "C#", ".NET", "Angular", "Vue.js", "PHP", "SQL",
  "PostgreSQL", "Git", "Docker", "Kubernetes", "API REST", "CI/CD", "AWS",
  "Azure", "GCP", "WordPress", "SEO", "SEA", "GA4", "Google Analytics",
  "réseaux sociaux", "communication digitale", "rédaction web", "newsletter",
  "Figma", "CRM", "Salesforce", "Power BI", "Excel", "gestion de projet",
  "Agile", "Scrum", "autonomie", "travail en équipe",
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function extractAtsKeywords(offer: JobOffer) {
  const content = normalize(`${offer.title} ${offer.description}`);
  const detected = keywordCatalog.filter((keyword) => content.includes(normalize(keyword)));

  if (detected.length >= 5) return detected.slice(0, 12);

  const fallback = offer.title
    .replace(/[^\p{L}\p{N}+#. -]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => !["pour", "avec", "dans", "chez", "h/f", "f/h"].includes(word.toLowerCase()));

  return [...new Set([...detected, ...fallback])].slice(0, 12);
}

export function generateCoverLetter(offer: JobOffer, profileText = "") {
  const keywords = extractAtsKeywords(offer);
  const normalizedProfile = normalize(profileText);
  const matchingSkills = keywords.filter((keyword) => normalizedProfile.includes(normalize(keyword)));
  const strengths = (matchingSkills.length ? matchingSkills : keywords).slice(0, 4);
  const skillsSentence = strengths.length
    ? `Mon parcours m’a permis de développer des compétences en ${strengths.join(", ")}, directement mobilisables pour les missions décrites.`
    : "Mon parcours m’a appris à être autonome, rigoureux et à collaborer efficacement autour d’objectifs concrets.";

  return `Objet : Candidature au poste de ${offer.title}

Madame, Monsieur,

Votre offre pour le poste de ${offer.title} chez ${offer.company} a particulièrement retenu mon attention. Les missions présentées correspondent à la suite que je souhaite donner à mon parcours professionnel.

${skillsSentence} Je souhaite mettre ces acquis au service de votre équipe tout en continuant à progresser au contact de vos projets.

Motivé par cette opportunité, je serais heureux de vous présenter plus précisément mon expérience et la manière dont je pourrais contribuer aux objectifs de ${offer.company}.

Je vous remercie pour votre attention et reste disponible pour un entretien.

Cordialement,
[Prénom Nom]`;
}
