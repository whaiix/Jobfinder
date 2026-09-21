"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateCvCompatibility, extractAtsKeywords, generateCoverLetters } from "@/lib/jobs/application-assistant";
import { getSpontaneousTargets } from "@/lib/jobs/spontaneous";
import type { ContractType, ExperienceFilter, JobOffer } from "@/lib/jobs/types";
import { analyzeProfile } from "@/lib/profile/analyze-profile";
import { emptyProfile, parseStoredProfile, type ProfileData } from "@/lib/profile/profile-data";

type Props = { initialOffers: JobOffer[] };
type SearchMeta = { mode: "live" | "database" | "empty"; sources: string[]; warnings: string[] };
type Preferences = { jobs: string[]; cities: string[]; contracts: ContractType[]; experience: ExperienceFilter; contract?: ContractType | "all" };

const PREFERENCES_KEY = "jobpilot-search-preferences-v2";
const PROFILE_KEY = "jobpilot-profile-v1";
const contractOptions: Array<{ value: ContractType | "all"; label: string }> = [
  { value: "all", label: "Tous" }, { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" }, { value: "alternance", label: "Alternance" },
  { value: "stage", label: "Stage" },
];
const experienceOptions: Array<{ value: ExperienceFilter; label: string }> = [
  { value: "all", label: "Toute expérience" }, { value: "0-1", label: "0–1 an" },
  { value: "1-3", label: "1–3 ans" }, { value: "3-5", label: "3–5 ans" },
  { value: "5+", label: "5 ans et +" },
];

function ChipInput({ label, placeholder, values, draft, onDraft, onAdd, onRemove }: {
  label: string; placeholder: string; values: string[]; draft: string;
  onDraft: (value: string) => void; onAdd: () => void; onRemove: (value: string) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
      event.preventDefault(); onAdd();
    }
  }
  return (
    <label className="chip-field">
      <span className="field-label">{label}</span>
      <div className="chip-input-shell">
        {values.map((value) => <button key={value} type="button" className="input-chip" onClick={() => onRemove(value)}>{value}<span>×</span></button>)}
        <input value={draft} onChange={(event) => onDraft(event.target.value)} onKeyDown={handleKeyDown} onBlur={onAdd} placeholder={values.length ? "Ajouter…" : placeholder} disabled={values.length >= 3} />
      </div>
      <small>Entrée pour ajouter · 3 maximum</small>
    </label>
  );
}

export function SearchExperience({ initialOffers }: Props) {
  const [jobs, setJobs] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [jobDraft, setJobDraft] = useState("");
  const [cityDraft, setCityDraft] = useState("");
  const [recommendedJobs, setRecommendedJobs] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<"offers" | "spontaneous">("offers");
  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [experience, setExperience] = useState<ExperienceFilter>("all");
  const [profileData, setProfileData] = useState<ProfileData>(emptyProfile);
  const [offers, setOffers] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [letterVersion, setLetterVersion] = useState<"direct" | "narrative">("direct");
  const [copied, setCopied] = useState(false);
  const assistantRef = useRef<HTMLDivElement>(null);
  const searchRequestRef = useRef(0);
  const [searchMeta, setSearchMeta] = useState<SearchMeta>({ mode: "empty", sources: [], warnings: [] });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null") as Preferences | null;
      const requestedJob = new URLSearchParams(window.location.search).get("metier");
      if (requestedJob) setJobs([requestedJob]); else if (saved?.jobs) setJobs(saved.jobs);
      if (saved?.cities) setCities(saved.cities);
      if (saved?.contracts) setContracts(saved.contracts);
      else if (saved?.contract && saved.contract !== "all") setContracts([saved.contract]);
      if (saved?.experience) setExperience(saved.experience);
      const profile = parseStoredProfile(localStorage.getItem(PROFILE_KEY));
      setProfileData(profile);
      setRecommendedJobs(analyzeProfile(profile.cvText).recommendations.slice(0, 3).map((item) => item.title));
    } catch { /* Une préférence corrompue est simplement ignorée. */ }
  }, []);

  useEffect(() => {
    if (!selectedOffer) return;
    const close = (event: globalThis.KeyboardEvent) => event.key === "Escape" && setSelectedOffer(null);
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [selectedOffer]);

  const categoryCounts = useMemo(() => offers.reduce<Record<string, number>>((counts, offer) => {
    counts[offer.contract] = (counts[offer.contract] ?? 0) + 1; return counts;
  }, {}), [offers]);
  const spontaneousTargets = useMemo(() => getSpontaneousTargets(jobs), [jobs]);

  function addValue(draft: string, values: string[], setter: (value: string[]) => void, clear: () => void) {
    const value = draft.replace(/,$/, "").trim();
    if (value && values.length < 3 && !values.some((item) => item.toLowerCase() === value.toLowerCase())) setter([...values, value]);
    clear();
  }

  function toggleRecommendedJob(job: string) {
    if (jobs.includes(job)) {
      setJobs(jobs.filter((item) => item !== job));
      return;
    }
    if (jobs.length < 3) setJobs([...jobs, job]);
  }

  async function runSearch(selection: { jobs: string[]; cities: string[]; contracts: ContractType[]; experience: ExperienceFilter }) {
    const requestId = ++searchRequestRef.current;
    const { jobs: nextJobs, cities: nextCities, contracts: nextContracts, experience: nextExperience } = selection;
    setJobs(nextJobs); setCities(nextCities); setJobDraft(""); setCityDraft("");
    const preferences: Preferences = { jobs: nextJobs, cities: nextCities, contracts: nextContracts, experience: nextExperience };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    setLoading(true); setHasSearched(true);
    const params = new URLSearchParams({ q: nextJobs.join(","), location: nextCities.join(","), contract: nextContracts.length ? nextContracts.join(",") : "all", experience: nextExperience, limit: "100" });
    try {
      const response = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = (await response.json()) as { offers: JobOffer[]; meta: SearchMeta };
      if (!response.ok) throw new Error("La recherche n’a pas pu être effectuée.");
      if (requestId !== searchRequestRef.current) return;
      const scored = data.offers.map((offer) => ({ ...offer, compatibilityScore: calculateCvCompatibility(offer, profileData.cvText) }))
        .sort((left, right) => (right.compatibilityScore ?? 0) - (left.compatibilityScore ?? 0) || Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
      setOffers(scored); setSearchMeta(data.meta);
    } catch (error) {
      if (requestId !== searchRequestRef.current) return;
      setOffers([]); setSearchMeta({ mode: "empty", sources: [], warnings: [error instanceof Error ? error.message : "Erreur de recherche."] });
    } finally { if (requestId === searchRequestRef.current) setLoading(false); }
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const nextJobs = jobDraft.trim() && jobs.length < 3 ? [...jobs, jobDraft.trim()] : jobs;
    const nextCities = cityDraft.trim() && cities.length < 3 ? [...cities, cityDraft.trim()] : cities;
    await runSearch({ jobs: nextJobs, cities: nextCities, contracts, experience });
  }

  function toggleContract(value: ContractType | "all") {
    const nextContracts = value === "all" ? [] : contracts.includes(value) ? contracts.filter((item) => item !== value) : [...contracts, value];
    setContracts(nextContracts);
    if (hasSearched) void runSearch({ jobs, cities, contracts: nextContracts, experience });
  }

  function changeExperience(value: ExperienceFilter) {
    setExperience(value);
    if (hasSearched) void runSearch({ jobs, cities, contracts, experience: value });
  }

  function openOffer(offer: JobOffer) { setSelectedOffer(offer); setShowAssistant(false); setLetterVersion("direct"); setCopied(false); }
  const atsKeywords = selectedOffer ? extractAtsKeywords(selectedOffer) : [];
  const coverLetters = selectedOffer ? generateCoverLetters(selectedOffer, profileData) : { direct: "", narrative: "" };
  const coverLetter = coverLetters[letterVersion];

  async function copyLetter() {
    await navigator.clipboard.writeText(coverLetter); setCopied(true);
  }

  function openAssistant() {
    setShowAssistant(true);
    setTimeout(() => assistantRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  return (
    <>
      <section className="search-hero">
        <div><p className="eyebrow">Offres vérifiées et récentes</p><h1>Votre recherche,<br /><span>sans faux positifs.</span></h1><p>Les annonces de plus de 30 jours sont écartées. Le contrat et l’expérience sont aussi contrôlés dans le titre et la description.</p></div>
      </section>

      <section className="search-workspace">
        <form className="advanced-search" onSubmit={search}>
          <div className="multi-fields">
            <div>
              <ChipInput label="Métiers" placeholder="Ex. développeur web" values={jobs} draft={jobDraft} onDraft={setJobDraft} onAdd={() => addValue(jobDraft, jobs, setJobs, () => setJobDraft(""))} onRemove={(value) => setJobs(jobs.filter((item) => item !== value))} />
              {recommendedJobs.length > 0 && (
                <div className="recommended-job-picker">
                  <span>Recommandés depuis votre CV</span>
                  <div>
                    {recommendedJobs.map((job) => {
                      const selected = jobs.includes(job);
                      return <button key={job} type="button" className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => toggleRecommendedJob(job)} disabled={!selected && jobs.length >= 3}><b>{selected ? "✓" : "+"}</b>{job}</button>;
                    })}
                  </div>
                </div>
              )}
            </div>
            <ChipInput label="Villes" placeholder="Ex. Paris" values={cities} draft={cityDraft} onDraft={setCityDraft} onAdd={() => addValue(cityDraft, cities, setCities, () => setCityDraft(""))} onRemove={(value) => setCities(cities.filter((item) => item !== value))} />
          </div>
          <div className="filter-row">
            <div className="contract-tabs" aria-label="Type de contrat">
              {contractOptions.map((option) => {
                const active = option.value === "all" ? contracts.length === 0 : contracts.includes(option.value);
                return <button key={option.value} type="button" className={active ? "active" : ""} aria-pressed={active} onClick={() => toggleContract(option.value)}>{option.label}{option.value !== "all" && hasSearched && <span>{categoryCounts[option.value] ?? 0}</span>}</button>;
              })}
            </div>
            <label className="select-field"><span>Expérience</span><select value={experience} onChange={(event) => changeExperience(event.target.value as ExperienceFilter)}>{experienceOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={loading}>{loading ? "Recherche…" : "Rechercher"}</button>
          </div>
          <p className="memory-note">Vos critères sont mémorisés dans ce navigateur pour votre prochaine visite.</p>
        </form>

        <div className="search-mode-tabs" role="tablist" aria-label="Type de recherche">
          <button type="button" role="tab" aria-selected={activeView === "offers"} className={activeView === "offers" ? "active" : ""} onClick={() => setActiveView("offers")}>Offres d’emploi</button>
          <button type="button" role="tab" aria-selected={activeView === "spontaneous"} className={activeView === "spontaneous" ? "active" : ""} onClick={() => setActiveView("spontaneous")}>Candidature spontanée</button>
        </div>

        {activeView === "offers" ? <>
          <div className="results-header">
            <div><p className="eyebrow">Résultats</p><h2>{hasSearched ? `${offers.length} offre${offers.length > 1 ? "s" : ""} compatible${offers.length > 1 ? "s" : ""}` : "Lancez votre recherche"}</h2></div>
            <div className="result-notes"><span>30 jours maximum</span><span>{searchMeta.mode === "live" ? `${searchMeta.sources.join(" + ")} en direct` : searchMeta.mode === "database" ? "Résultats enregistrés" : searchMeta.sources.length ? `${searchMeta.sources.join(" + ")} consultés` : "Sources officielles"}</span></div>
          </div>
          {searchMeta.warnings.length > 0 && <div className="search-warning" role="status">{searchMeta.warnings.join(" · ")}</div>}

          <div className="offer-list">
            {offers.map((offer) => (
              <button className="offer-card" type="button" key={offer.id} onClick={() => openOffer(offer)}>
                {offer.experienceLevel === "unknown" && <span className="experience-warning">Expérience non indiquée par le recruteur</span>}
                <div className="company-logo" aria-hidden="true">{offer.company.slice(0, 1).toUpperCase()}</div>
                <div className="offer-main">
                  <div className="offer-title-row"><div><h3>{offer.title}</h3><p>{offer.company} · {offer.location}</p></div><span className={`contract-badge ${offer.contract}`}>{offer.contractLabel}</span></div>
                  <p className="offer-description">{offer.description}</p>
                  <div className="offer-meta"><span className="compatibility-label">{offer.compatibilityScore ?? 100}% compatible</span><span>{offer.publishedLabel}</span><span>{offer.experienceLabel}</span><span>{offer.source}</span>{offer.classificationReason !== "source" && <span className="corrected-label">Contrat vérifié dans l’annonce</span>}</div>
                </div>
                <span className="open-offer">Ouvrir <b>→</b></span>
              </button>
            ))}
            {!loading && !hasSearched && <div className="empty-state"><span>⌕</span><h3>À vous de jouer</h3><p>Ajoutez jusqu’à trois métiers et trois villes, puis lancez la recherche.</p></div>}
            {!loading && hasSearched && offers.length === 0 && <div className="empty-state"><span>⌕</span><h3>Aucune offre correspondante</h3><p>Essayez d’élargir le métier ou le type de contrat.</p></div>}
          </div>
        </> : <section className="spontaneous-section">
          <div className="results-header"><div><p className="eyebrow">Démarche proactive</p><h2>Entreprises à contacter directement</h2></div><div className="result-notes"><span>Liens officiels vérifiés</span></div></div>
          <p className="spontaneous-intro">Ces entreprises correspondent aux métiers sélectionnés. Consultez leur page officielle avant d’adapter votre candidature à leurs activités.</p>
          {spontaneousTargets.length > 0 ? <div className="spontaneous-grid">{spontaneousTargets.map((target) => <article key={target.name}><div className="company-logo">{target.name.slice(0, 1)}</div><div><h3>{target.name}</h3><span>{target.location}</span><p>{target.description}</p></div><a href={target.contactUrl} target="_blank" rel="noreferrer noopener">Page contact ↗</a></article>)}</div> : <div className="empty-state"><span>✦</span><h3>Sélectionnez un métier</h3><p>Les contacts pertinents apparaîtront ici, notamment pour la communication, le marketing et le digital.</p></div>}
        </section>}
      </section>

      {selectedOffer && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedOffer(null)}>
          <section className="offer-modal" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
            <button className="modal-close" type="button" onClick={() => setSelectedOffer(null)} aria-label="Fermer">×</button>
            <div className="modal-company"><div className="company-logo">{selectedOffer.company.slice(0, 1).toUpperCase()}</div><div><p>{selectedOffer.company}</p><span>{selectedOffer.location}</span></div></div>
            <h2 id="offer-modal-title">{selectedOffer.title}</h2>
            <div className="modal-badges"><span className={`contract-badge ${selectedOffer.contract}`}>{selectedOffer.contractLabel}</span><span className="modal-compatibility">{selectedOffer.compatibilityScore ?? 100}% compatible</span><span>{selectedOffer.experienceLabel}</span><span>{selectedOffer.publishedLabel}</span></div>
            <div className="modal-description"><h3>Description du poste</h3><p>{selectedOffer.description}</p></div>

            {showAssistant && <div className="application-assistant" ref={assistantRef}><div className="assistant-heading"><div><p className="eyebrow">Assistant candidature</p><h3>Mots-clés ATS à reprendre naturellement</h3></div></div><div className="ats-keywords">{atsKeywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div><div className="letter-heading"><h3>Deux versions personnalisées</h3><button type="button" onClick={copyLetter}>{copied ? "Copiée ✓" : "Copier cette version"}</button></div><div className="letter-version-tabs"><button type="button" className={letterVersion === "direct" ? "active" : ""} onClick={() => { setLetterVersion("direct"); setCopied(false); }}>Version directe</button><button type="button" className={letterVersion === "narrative" ? "active" : ""} onClick={() => { setLetterVersion("narrative"); setCopied(false); }}>Version plus personnelle</button></div><pre>{coverLetter}</pre><small>Les éléments chiffrés viennent de l’annonce. Relisez et complétez avec un exemple précis de votre parcours.</small></div>}

            <footer className="modal-footer"><button className="assistant-button" type="button" onClick={openAssistant}>{showAssistant ? "Aller à l’assistant" : "Préparer ma candidature"}</button><a className="primary-link" href={selectedOffer.applyUrl} target="_blank" rel="noreferrer noopener">Voir l’offre originale <span>↗</span></a></footer>
          </section>
        </div>
      )}
    </>
  );
}
