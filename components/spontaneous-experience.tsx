"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { getSpontaneousTargets, type SpontaneousTarget } from "@/lib/jobs/spontaneous";
import { deduplicateSpontaneousTargets } from "@/lib/jobs/spontaneous-web";
import { analyzeProfile } from "@/lib/profile/analyze-profile";
import { parseStoredProfile } from "@/lib/profile/profile-data";

type Preferences = { jobs?: string[]; cities?: string[]; [key: string]: unknown };
type Suggestion = { name: string; label: string };

const PREFERENCES_KEY = "jobpilot-search-preferences-v2";
const PROFILE_KEY = "jobpilot-profile-v1";

function ChipEditor({ id, label, placeholder, values, draft, onDraft, onAdd, onRemove, suggestions = [], onSuggestion }: {
  id: string; label: string; placeholder: string; values: string[]; draft: string;
  onDraft: (value: string) => void; onAdd: () => void; onRemove: (value: string) => void;
  suggestions?: Suggestion[]; onSuggestion?: (value: string) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) { event.preventDefault(); onAdd(); }
  }
  return <div className="chip-field"><label className="field-label" htmlFor={id}>{label}</label><div className="chip-input-shell">{values.map((value) => <button className="input-chip" type="button" key={value} onClick={() => onRemove(value)}>{value}<span>×</span></button>)}<input id={id} autoComplete="off" value={draft} onChange={(event) => onDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={values.length ? "Ajouter…" : placeholder} disabled={values.length >= 3} /></div>{suggestions.length > 0 && draft.trim().length >= 2 && <div className="field-suggestions">{suggestions.map((suggestion) => <button type="button" key={`${suggestion.name}-${suggestion.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onSuggestion?.(suggestion.name)}><strong>{suggestion.name}</strong><span>{suggestion.label}</span></button>)}</div>}<small>Entrée pour ajouter · 3 maximum</small></div>;
}

export function SpontaneousExperience() {
  const [jobs, setJobs] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [jobDraft, setJobDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<Suggestion[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [targets, setTargets] = useState<SpontaneousTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [warning, setWarning] = useState("");
  const [source, setSource] = useState<"serper" | "fallback" | "">("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null") as Preferences | null;
      const profile = parseStoredProfile(localStorage.getItem(PROFILE_KEY));
      setJobs(saved?.jobs ?? []); setCities(saved?.cities ?? []);
      setRecommendations(analyzeProfile(profile.cvText).recommendations.slice(0, 3).map((item) => item.title));
    } catch { /* Les données locales invalides sont ignorées. */ }
  }, []);

  useEffect(() => {
    const term = cityDraft.trim();
    if (term.length < 2 || cities.length >= 3) { setCitySuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setCitySuggestions((data.suggestions ?? []).filter((suggestion) => !cities.some((city) => city.toLowerCase() === suggestion.name.toLowerCase())));
      } catch { if (!controller.signal.aborted) setCitySuggestions([]); }
    }, 220);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [cityDraft, cities]);

  const verifiedTargets = useMemo(() => getSpontaneousTargets(jobs, cities), [jobs, cities]);

  function addValue(draft: string, values: string[], setter: (values: string[]) => void, clear: () => void) {
    const value = draft.replace(/,$/, "").trim();
    if (value && values.length < 3 && !values.some((item) => item.toLowerCase() === value.toLowerCase())) setter([...values, value]);
    clear();
  }

  function toggleRecommendedJob(job: string) {
    setJobs((current) => current.includes(job) ? current.filter((item) => item !== job) : [...current, job].slice(0, 3));
  }

  function chooseCity(city: string) {
    if (cities.length < 3 && !cities.some((item) => item.toLowerCase() === city.toLowerCase())) setCities([...cities, city]);
    setCityDraft(""); setCitySuggestions([]);
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    const nextJobs = jobDraft.trim() && jobs.length < 3 ? [...jobs, jobDraft.trim()] : jobs;
    const nextCities = cityDraft.trim() && cities.length < 3 ? [...cities, cityDraft.trim()] : cities;
    if (nextJobs.length === 0) { setWarning("Ajoutez au moins un métier pour cibler les entreprises."); return; }
    setJobs(nextJobs); setCities(nextCities); setJobDraft(""); setCityDraft(""); setLoading(true); setHasSearched(true); setWarning("");
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}") as Preferences;
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...saved, jobs: nextJobs, cities: nextCities }));
      const params = new URLSearchParams({ q: nextJobs.join(","), location: nextCities.join(",") });
      const response = await fetch(`/api/spontaneous/search?${params.toString()}`);
      const data = (await response.json()) as { targets?: SpontaneousTarget[]; source?: "serper" | "fallback"; warning?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "La recherche n’a pas pu être effectuée.");
      const verified = getSpontaneousTargets(nextJobs, nextCities);
      setTargets(deduplicateSpontaneousTargets([...(data.targets ?? []), ...verified]).slice(0, 30));
      setSource(data.source ?? "fallback"); setWarning(data.warning ?? "");
    } catch (error) {
      setTargets(verifiedTargets); setSource("fallback");
      setWarning(error instanceof Error ? error.message : "Recherche temporairement indisponible.");
    } finally { setLoading(false); }
  }

  return <main>
    <section className="page-hero compact-hero"><p className="eyebrow">Démarche proactive</p><h1>Candidatures spontanées</h1><p>Indiquez vos métiers et vos villes : JobPilot recherche les pages Contact, Carrières et Recrutement d’entreprises pertinentes.</p></section>
    <section className="content-page spontaneous-page">
      <form className="advanced-search spontaneous-search-form" onSubmit={search}>
        <div className="multi-fields">
          <div><ChipEditor id="spontaneous-job" label="Métiers recherchés" placeholder="Ex. chargé de communication" values={jobs} draft={jobDraft} onDraft={setJobDraft} onAdd={() => addValue(jobDraft, jobs, setJobs, () => setJobDraft(""))} onRemove={(value) => setJobs(jobs.filter((item) => item !== value))} />{recommendations.length > 0 && <div className="recommended-job-picker"><span>Recommandés depuis votre CV</span><div>{recommendations.map((job) => { const selected = jobs.includes(job); return <button key={job} type="button" className={selected ? "selected" : ""} onClick={() => toggleRecommendedJob(job)} disabled={!selected && jobs.length >= 3}><b>{selected ? "✓" : "+"}</b>{job}</button>; })}</div></div>}</div>
          <ChipEditor id="spontaneous-city" label="Villes ciblées" placeholder="Ex. Lyon" values={cities} draft={cityDraft} onDraft={setCityDraft} onAdd={() => addValue(cityDraft, cities, setCities, () => setCityDraft(""))} onRemove={(value) => setCities(cities.filter((item) => item !== value))} suggestions={citySuggestions} onSuggestion={chooseCity} />
        </div>
        <div className="spontaneous-search-actions"><p className="memory-note">Ces critères sont partagés avec votre recherche d’offres et mémorisés dans ce navigateur.</p><button className="primary-button" type="submit" disabled={loading}>{loading ? "Recherche des entreprises…" : "Trouver des entreprises"}</button></div>
      </form>
      <div className="results-header"><div><p className="eyebrow">Entreprises ciblées</p><h2>{hasSearched ? `${targets.length} contact${targets.length > 1 ? "s" : ""} pertinent${targets.length > 1 ? "s" : ""}` : "Lancez votre recherche"}</h2></div><div className="result-notes"><span>{source === "serper" ? "Google + contacts vérifiés" : "Pages officielles"}</span></div></div>
      {warning && <div className="search-warning" role="status">{warning}</div>}
      <p className="spontaneous-intro">Les annuaires et sites d’offres sont écartés. Vérifiez la page de l’entreprise avant d’envoyer une candidature personnalisée.</p>
      {targets.length > 0 ? <div className="spontaneous-grid">{targets.map((target) => <article key={target.contactUrl}><div className="company-logo">{target.name.slice(0, 1).toUpperCase()}</div><div><div className="spontaneous-card-heading"><h3>{target.name}</h3><span>{target.source === "serper" ? "Trouvé via Google" : "Contact vérifié"}</span></div><span>{target.location}</span><p>{target.description}</p></div><a href={target.contactUrl} target="_blank" rel="noreferrer noopener">{target.pageType === "careers" ? "Page recrutement" : "Page contact"} ↗</a></article>)}</div> : <div className="empty-state"><span>✦</span><h3>{hasSearched ? "Aucune entreprise suffisamment fiable" : "Définissez votre cible"}</h3><p>{hasSearched ? "Essayez un métier plus large ou ajoutez une autre ville." : "Saisissez jusqu’à trois métiers et trois villes pour trouver les bons interlocuteurs."}</p></div>}
    </section>
  </main>;
}
