import type { JobOffer } from "./types";
import { profileFullName, type ProfileData } from "../profile/profile-data";

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

export function calculateCvCompatibility(offer: JobOffer, profileText: string) {
  const keywords = extractAtsKeywords(offer);
  if (!profileText.trim()) return Math.min(88, offer.compatibilityScore ?? 70);
  const normalizedProfile = normalize(profileText);
  const matched = keywords.filter((keyword) => normalizedProfile.includes(normalize(keyword))).length;
  const profileScore = keywords.length ? 28 + (matched / keywords.length) * 72 : 45;
  const searchScore = offer.compatibilityScore ?? 70;
  return Math.max(35, Math.min(96, Math.round(searchScore * 0.55 + profileScore * 0.45)));
}

function offerHighlights(offer: JobOffer) {
  const sentences = offer.description.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim());
  const numeric = sentences.find((sentence) => /\b\d+[\d.,]*\s*(?:%|ans?|€|k€|mois|jours?)\b/i.test(sentence));
  const mission = sentences.find((sentence) => /mission|responsabilit|vous (?:serez|aurez|interviendrez|contribuerez)|objectif/i.test(sentence));
  return { numeric: numeric?.slice(0, 220) ?? "", mission: mission?.slice(0, 220) ?? "" };
}

export function generateCoverLetters(offer: JobOffer, profile: ProfileData) {
  const keywords = extractAtsKeywords(offer);
  const normalizedProfile = normalize(profile.cvText);
  const matchingSkills = keywords.filter((keyword) => normalizedProfile.includes(normalize(keyword)));
  const strengths = (matchingSkills.length ? matchingSkills : keywords).slice(0, 4);
  const highlights = offerHighlights(offer);
  const name = profileFullName(profile);
  const signature = name ? `Cordialement,\n${name}` : "Cordialement";
  const skills = strengths.length ? strengths.join(", ") : "l’autonomie, la rigueur et le travail en équipe";
  const specificDetail = highlights.numeric || highlights.mission;
  const company = /^Employeur à vérifier$/i.test(offer.company) ? "l’entreprise qui recrute" : offer.company;

  const direct = `Objet : Candidature – ${offer.title}

Madame, Monsieur,

Je souhaite rejoindre ${company} au poste de ${offer.title}. Mon expérience de ${skills} répond directement aux compétences mises en avant dans votre annonce.

${specificDetail ? `J’ai notamment relevé cet enjeu : « ${specificDetail} » Cette priorité fait écho à ma façon de travailler : partir d’un objectif concret, mesurer l’avancement et livrer un résultat directement exploitable par l’équipe.` : `Les missions décrites demandent une combinaison de maîtrise opérationnelle, d’autonomie et de collaboration que j’ai développée au fil de mon parcours.`}

Je pourrais ainsi contribuer rapidement à vos projets, tout en m’adaptant aux méthodes et aux objectifs propres à ${company}. Je serais heureux d’échanger avec vous sur des exemples précis de réalisations en lien avec vos besoins.

${signature}`;

  const narrative = `Objet : Envie de contribuer aux projets de ${company}

Madame, Monsieur,

Ce qui m’attire dans votre offre de ${offer.title}, c’est la possibilité de mettre mes compétences au service d’une entreprise et d’une équipe identifiées, plutôt que de candidater à un intitulé générique. La manière dont ${company} présente ce poste laisse apparaître un besoin concret auquel je souhaite contribuer.

Mon parcours m’a permis de construire une base solide autour de ${skills}. ${highlights.mission ? `Votre annonce insiste notamment sur le point suivant : « ${highlights.mission} » C’est précisément le type de responsabilité dans lequel je peux mobiliser mes acquis tout en continuant à progresser.` : `Ces compétences me permettraient d’aborder vos missions avec méthode, curiosité et sens du collectif.`}

Je souhaite vous apporter une implication durable, une communication claire et la capacité à transformer un besoin en actions concrètes. Un entretien me permettrait de comprendre vos priorités actuelles et de vous expliquer comment mon profil pourrait y répondre.

${signature}`;

  return { direct, narrative };
}
