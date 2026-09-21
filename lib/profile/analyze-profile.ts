export type JobRecommendation = {
  title: string;
  score: number;
  matchingSkills: string[];
  reason: string;
};

const families = [
  { title: "Webmaster & Chargé de Communication Digitale", skills: ["wordpress", "seo", "html", "css", "google analytics", "ga4", "communication", "réseaux sociaux", "redaction", "cms"] },
  { title: "Développeur front-end", skills: ["html", "css", "javascript", "typescript", "react", "vue", "angular", "figma", "git"] },
  { title: "Développeur full-stack", skills: ["javascript", "typescript", "react", "node", "python", "php", "sql", "api", "git", "docker"] },
  { title: "Chargé de communication digitale", skills: ["communication", "réseaux sociaux", "seo", "newsletter", "canva", "rédaction", "analytics", "contenu"] },
  { title: "Chef de projet digital", skills: ["gestion de projet", "agile", "scrum", "communication", "planning", "budget", "coordination", "digital"] },
  { title: "Content manager / Community manager", skills: ["réseaux sociaux", "contenu", "rédaction", "seo", "newsletter", "canva", "community", "éditorial"] },
  { title: "Data analyst", skills: ["excel", "sql", "power bi", "tableau", "python", "analyse", "statistiques", "data"] },
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function analyzeProfile(text: string) {
  const normalized = normalize(text);
  const recommendations = families
    .map((family) => {
      const matchingSkills = family.skills.filter((skill) => normalized.includes(normalize(skill)));
      const score = Math.min(96, Math.round(30 + (matchingSkills.length / Math.min(family.skills.length, 6)) * 66));
      return {
        title: family.title,
        score: matchingSkills.length ? score : 0,
        matchingSkills,
        reason: matchingSkills.length
          ? `Votre CV contient ${matchingSkills.slice(0, 4).join(", ")}, des compétences souvent demandées pour ce métier.`
          : "",
      } satisfies JobRecommendation;
    })
    .filter((recommendation) => recommendation.matchingSkills.length >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const detectedSkills = [...new Set(recommendations.flatMap((item) => item.matchingSkills))];
  return { detectedSkills, recommendations };
}
