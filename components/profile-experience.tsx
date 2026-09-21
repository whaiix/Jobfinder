"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { analyzeProfile } from "@/lib/profile/analyze-profile";

const STORAGE_KEY = "jobpilot-profile-v1";

export function ProfileExperience() {
  const [cvText, setCvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const analysis = useMemo(() => analyzeProfile(cvText), [cvText]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCvText(saved);
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
      setCvText(data.text);
      localStorage.setItem(STORAGE_KEY, data.text);
      setMessage("CV analysé et enregistré dans ce navigateur.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’analyser le CV.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function clearProfile() {
    localStorage.removeItem(STORAGE_KEY);
    setCvText("");
    setFileName("");
    setMessage("Profil effacé de ce navigateur.");
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
          {cvText && <button className="text-button danger" type="button" onClick={clearProfile}>Effacer mon profil local</button>}
        </aside>

        <div className="recommendation-panel">
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
