"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { analyzeProfile } from "@/lib/profile/analyze-profile";
import { emptyProfile, inferContactDetails, parseStoredProfile, type ProfileData } from "@/lib/profile/profile-data";

const STORAGE_KEY = "jobpilot-profile-v1";

export function ProfileExperience() {
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const analysis = useMemo(() => analyzeProfile(profile.cvText), [profile.cvText]);

  useEffect(() => {
    const saved = parseStoredProfile(localStorage.getItem(STORAGE_KEY));
    const hydrated = saved.cvText && !saved.firstName && !saved.lastName && !saved.email && !saved.phone
      ? { ...saved, ...inferContactDetails(saved.cvText), contactConfirmed: false }
      : saved;
    setProfile(hydrated);
    if (hydrated.cvText) localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage("");
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/profile/extract", { method: "POST", body: form });
      const data = (await response.json()) as { text?: string; error?: string };
      if (!response.ok || !data.text) throw new Error(data.error || "CV illisible.");
      const detected = inferContactDetails(data.text);
      const nextProfile = { ...profile, ...detected, cvText: data.text, contactConfirmed: false };
      setProfile(nextProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
      setMessage("CV analysé. Vérifiez maintenant vos coordonnées détectées.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’analyser le CV.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(emptyProfile);
    setFileName("");
    setMessage("Profil effacé de ce navigateur.");
  }

  function updateProfile(field: keyof ProfileData, value: string) {
    setProfile((current) => ({ ...current, [field]: value, contactConfirmed: false }));
  }

  function confirmContactDetails() {
    const nextProfile = { ...profile, contactConfirmed: true };
    setProfile(nextProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    setMessage("Coordonnées confirmées. Elles personnaliseront vos lettres de motivation.");
  }

  return (
    <section className="profile-page">
      <div className="profile-heading">
        <p className="eyebrow">Mon profil professionnel</p>
        <h1>Votre CV raconte plus<br /><span>qu’un seul métier.</span></h1>
        <p>Importez-le pour repérer vos compétences transférables et découvrir des intitulés auxquels vous n’auriez peut-être pas pensé.</p>
      </div>

      <div className="profile-layout">
        <aside className="upload-panel">
          <div className="upload-icon" aria-hidden="true">↑</div>
          <h2>Analyser mon CV</h2>
          <p>PDF, TXT ou Markdown · 5 Mo maximum</p>
          <label className="upload-button">
            {loading ? "Analyse en cours…" : "Choisir un fichier"}
            <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" onChange={handleFile} disabled={loading} />
          </label>
          {fileName && <strong className="file-name">{fileName}</strong>}
          {message && <p className="profile-message" role="status">{message}</p>}
          <p className="privacy-note">Le fichier est lu temporairement pour en extraire le texte. Le serveur ne le conserve pas. Le texte reste uniquement dans votre navigateur.</p>
          {profile.cvText && <button className="text-button danger" type="button" onClick={clearProfile}>Effacer mon profil local</button>}
        </aside>

        <div className="recommendation-panel">
          {profile.cvText && <section className="identity-confirmation">
            <div><p className="eyebrow">Identité détectée</p><h2>Ces informations sont-elles correctes ?</h2><p>Corrigez-les si nécessaire, puis confirmez. Elles restent dans ce navigateur.</p></div>
            <div className="identity-grid">
              <label><span>Prénom</span><input value={profile.firstName} onChange={(event) => updateProfile("firstName", event.target.value)} placeholder="Votre prénom" /></label>
              <label><span>Nom</span><input value={profile.lastName} onChange={(event) => updateProfile("lastName", event.target.value)} placeholder="Votre nom" /></label>
              <label><span>Adresse e-mail</span><input type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} placeholder="nom@exemple.fr" /></label>
              <label><span>Téléphone</span><input type="tel" value={profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} placeholder="06 00 00 00 00" /></label>
            </div>
            <button className="confirm-profile-button" type="button" onClick={confirmContactDetails}>{profile.contactConfirmed ? "Informations confirmées ✓" : "Confirmer mes informations"}</button>
          </section>}
          <div className="panel-heading">
            <div><p className="eyebrow">Métiers compatibles</p><h2>Vos pistes recommandées</h2></div>
            {analysis.detectedSkills.length > 0 && <span>{analysis.detectedSkills.length} compétences détectées</span>}
          </div>

          {analysis.recommendations.length > 0 ? (
            <div className="recommendation-list">
              {analysis.recommendations.map((recommendation) => (
                <article className="recommendation-card" key={recommendation.title}>
                  <div className="score-ring"><strong>{recommendation.score}</strong><small>%</small></div>
                  <div>
                    <h3>{recommendation.title}</h3>
                    <p>{recommendation.reason}</p>
                    <div className="skill-list">{recommendation.matchingSkills.slice(0, 6).map((skill) => <span key={skill}>{skill}</span>)}</div>
                  </div>
                  <Link href={`/offres?metier=${encodeURIComponent(recommendation.title)}`}>Voir les offres →</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty">
              <span>✦</span>
              <h3>Vos recommandations apparaîtront ici</h3>
              <p>Nous cherchons des correspondances entre vos compétences et plusieurs familles de métiers, pas seulement le titre actuel de votre CV.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
