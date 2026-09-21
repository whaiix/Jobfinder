"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ContractFilter, JobOffer } from "@/lib/jobs/types";

type Props = {
  initialOffers: JobOffer[];
};

type SearchMeta = {
  mode: "live" | "database" | "empty";
  sources: string[];
  warnings: string[];
};

const contractOptions: Array<{ value: ContractFilter; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "alternance", label: "Alternance" },
  { value: "stage", label: "Stage" },
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
];

export function SearchExperience({ initialOffers }: Props) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [contract, setContract] = useState<ContractFilter>("all");
  const [offers, setOffers] = useState(initialOffers);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchMeta>({
    mode: "empty",
    sources: [],
    warnings: [],
  });

  const categoryCounts = useMemo(
    () =>
      offers.reduce<Record<string, number>>((counts, offer) => {
        counts[offer.contract] = (counts[offer.contract] ?? 0) + 1;
        return counts;
      }, {}),
    [offers],
  );

  async function search(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setHasSearched(true);
    const params = new URLSearchParams({ q: query, location, contract });

    try {
      const response = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = (await response.json()) as { offers: JobOffer[]; meta: SearchMeta };
      if (!response.ok) throw new Error("La recherche n'a pas pu être effectuée.");
      setOffers(data.offers);
      setSearchMeta(data.meta);
    } catch (error) {
      setSearchMeta({
        mode: "empty",
        sources: [],
        warnings: [error instanceof Error ? error.message : "Erreur de recherche."],
      });
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  function chooseContract(value: ContractFilter) {
    setContract(value);
    setHasSearched(true);
    queueMicrotask(() => {
      const params = new URLSearchParams({ q: query, location, contract: value });
      setLoading(true);
      fetch(`/api/jobs/search?${params.toString()}`)
        .then((response) => response.json())
        .then((data: { offers: JobOffer[]; meta: SearchMeta }) => {
          setOffers(data.offers);
          setSearchMeta(data.meta);
        })
        .catch(() =>
          setSearchMeta({
            mode: "empty",
            sources: [],
            warnings: ["La recherche n'a pas pu être effectuée."],
          }),
        )
        .finally(() => setLoading(false));
    });
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Accueil JobPilot">
          <span className="brand-mark" aria-hidden="true">J</span>
          <span>JobPilot</span>
        </a>
        <button className="profile-button" type="button">Mon espace</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Ta recherche, sans offres mal classées</p>
          <h1>Trouve le bon poste.<br /><span>Pas le bon tag.</span></h1>
          <p className="hero-description">
            Nous lisons aussi le titre de chaque annonce pour reconnaître les stages et les
            alternances, même lorsque la source les classe par erreur en CDD.
          </p>
        </div>

        <form className="search-panel" onSubmit={search}>
          <label>
            <span>Quel métier ?</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex. développeur, marketing…"
            />
          </label>
          <label>
            <span>Où ?</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ex. Paris, Lyon…"
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Recherche…" : "Rechercher"}
          </button>
        </form>

        <div className="contract-tabs" aria-label="Filtrer par contrat">
          {contractOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={contract === option.value ? "active" : ""}
              onClick={() => chooseContract(option.value)}
              aria-pressed={contract === option.value}
            >
              {option.label}
              {option.value !== "all" && (
                <span>{categoryCounts[option.value] ?? 0}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="results-section" aria-live="polite">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Offres récentes</p>
            <h2>
              {hasSearched
                ? `${offers.length} opportunité${offers.length > 1 ? "s" : ""}`
                : "Lance ta première recherche"}
            </h2>
          </div>
          <div className="result-notes">
            <p className="quality-note"><span /> Classification enrichie par le titre</p>
            <p className={`data-mode ${searchMeta.mode}`}>
              {searchMeta.mode === "live"
                ? `${searchMeta.sources.join(" + ")} en direct`
                : searchMeta.mode === "database"
                  ? "Résultats enregistrés"
                  : hasSearched
                    ? "Aucun résultat en direct"
                    : "Sources officielles en direct"}
            </p>
          </div>
        </div>

        {searchMeta.warnings.length > 0 && (
          <div className="search-warning" role="status">
            {searchMeta.warnings.join(" · ")}
          </div>
        )}

        <div className="offer-list">
          {offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <div className="company-logo" aria-hidden="true">
                {offer.company.slice(0, 1).toUpperCase()}
              </div>
              <div className="offer-main">
                <div className="offer-title-row">
                  <div>
                    <h3>{offer.title}</h3>
                    <p>{offer.company} · {offer.location}</p>
                  </div>
                  <span className={`contract-badge ${offer.contract}`}>{offer.contractLabel}</span>
                </div>
                <p className="offer-description">{offer.description}</p>
                <div className="offer-meta">
                  <span>{offer.publishedLabel}</span>
                  <span>{offer.source}</span>
                  {offer.classificationReason === "title" && (
                    <span className="corrected-label">Catégorie détectée dans le titre</span>
                  )}
                </div>
              </div>
              <a
                className="offer-link"
                href={offer.applyUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Voir l’offre <span>→</span>
              </a>
            </article>
          ))}

          {!loading && !hasSearched && (
            <div className="empty-state welcome-state">
              <p>Indique un métier et une ville pour interroger les offres disponibles.</p>
            </div>
          )}

          {!loading && hasSearched && offers.length === 0 && (
            <div className="empty-state">
              <p>Aucune offre dans cette sélection.</p>
              <button type="button" onClick={() => chooseContract("all")}>Voir toutes les offres</button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
