export type ProfileData = {
  cvText: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  contactConfirmed: boolean;
};

export const emptyProfile: ProfileData = {
  cvText: "", firstName: "", lastName: "", email: "", phone: "", contactConfirmed: false,
};

export function parseStoredProfile(value: string | null): ProfileData {
  if (!value) return emptyProfile;
  try {
    const parsed = JSON.parse(value) as Partial<ProfileData>;
    if (parsed && typeof parsed === "object" && typeof parsed.cvText === "string") {
      return { ...emptyProfile, ...parsed };
    }
  } catch { /* L'ancien format contenait directement le texte du CV. */ }
  return { ...emptyProfile, cvText: value };
}

export function inferContactDetails(cvText: string): Pick<ProfileData, "firstName" | "lastName" | "email" | "phone"> {
  const email = cvText.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] ?? "";
  const phone = cvText.match(/(?:(?:\+33|0033)[ .-]?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}/)?.[0]?.trim() ?? "";
  const excluded = /curriculum|vitae|profil|compétences|expérience|formation|contact|objectif|assistant|chargé|développeur|webmaster/i;
  const nameLine = cvText.split(/\r?\n/).slice(0, 10).map((line) => line.trim())
    .find((line) => line.length >= 4 && line.length <= 50 && /^[\p{L}'’-]+(?:\s+[\p{L}'’-]+){1,3}$/u.test(line) && !excluded.test(line));
  const parts = nameLine?.split(/\s+/) ?? [];
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    email,
    phone,
  };
}

export function profileFullName(profile: Pick<ProfileData, "firstName" | "lastName">) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
}
