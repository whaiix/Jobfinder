"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSpontaneousTargets } from "@/lib/jobs/spontaneous";
import { analyzeProfile } from "@/lib/profile/analyze-profile";
import { parseStoredProfile } from "@/lib/profile/profile-data";

type Preferences = { jobs?: string[] };

const PREFERENCES_KEY = "jobpilot-search-preferences-v2";
const PROFILE_KEY = "jobpilot-profile-v1";

export function SpontaneousExperience() {
  const [jobs, setJobs] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null") as Preferences | null;
      const profile = parseStoredProfile(localStorage.getItem(PROFILE_KEY));
      setJobs(saved?.jobs ?? []);
      setRecommendations(analyzeProfile(profile.cvText).recommendations.slice(0, 3).map((item) => item.title));
    } catch {
      setJobs([]);
    }
  }, []);

  const effectiveJobs = jobs.length ? jobs : recommendations;
  const targets = useMemo(() => getSpontaneousTargets(effectiveJobs), [effectiveJobs]);

  function toggleJob(job: string) {
    setJobs((current) => current.includes(job) ? current.filter((item) => item !== job) : [...current, job].slice(0, 3));
  }

  return (
    <main>
      <section className="page-hero compact-hero">
        <p className="eyebrow">Démarche proactive</p>
        <h1>Candidatures spontanées</h1>
        <p>Contactez directement des entreprises cohérentes avec vos métiers, même lorsqu’aucune offre n’est publiée.</p>
      </section>
      <section className="content-page spontaneous-page">
        {recommendations.length > 0 && <div className="spontaneous-job-picker"><span>Métiers issus de votre CV</span><div>{recommendations.map((job) => <button key={job} type="button" className={effectiveJobs.includes(job) ? "selected" : ""} onClick={() => toggleJob(job)}>{effectiveJobs.includes(job) ? "✓" : "+"} {job}</button>)}</div></div>}
        <div className="results-header"><div><p className="eyebrow">Entreprises ciblées</p><h2>{targets.length} contact{targets.length > 1 ? "s" : ""} pertinent{targets.length > 1 ? "s" : ""}</h2></div><div className="result-notes"><span>Pages officielles</span></div></div>
        <p className="spontaneous-intro">Les suggestions utilisent les métiers mémorisés dans votre recherche et les recommandations de votre profil.</p>
        {targets.length > 0 ? <div className="spontaneous-grid">{targets.map((target) => <article key={target.name}><div className="company-logo">{target.name.slice(0, 1)}</div><div><h3>{target.name}</h3><span>{target.location}</span><p>{target.description}</p></div><a href={target.contactUrl} target="_blank" rel="noreferrer noopener">Page contact ↗</a></article>)}</div> : <div className="empty-state"><span>✦</span><h3>Aucun métier ciblé</h3><p>Ajoutez un métier dans la recherche ou analysez votre CV pour recevoir des contacts pertinents.</p><Link className="primary-link inline-link" href="/offres">Choisir un métier</Link></div>}
      </section>
    </main>
  );
}

