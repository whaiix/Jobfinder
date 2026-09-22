"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseTrackedOffers, TRACKING_KEY, type TrackedOffer, type TrackingStatus } from "@/lib/jobs/tracking";

type Filter = "all" | TrackingStatus;

export function TrackingExperience() {
  const [items, setItems] = useState<TrackedOffer[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => setItems(parseTrackedOffers(localStorage.getItem(TRACKING_KEY))), []);

  const visible = useMemo(() => items
    .filter((item) => filter === "all" || item.status === filter)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)), [items, filter]);

  function save(next: TrackedOffer[]) {
    setItems(next);
    localStorage.setItem(TRACKING_KEY, JSON.stringify(next));
  }

  function setStatus(id: string, status: TrackingStatus) {
    save(items.map((item) => item.offer.id === id ? { ...item, status, savedAt: new Date().toISOString() } : item));
  }

  function remove(id: string) {
    save(items.filter((item) => item.offer.id !== id));
  }

  return (
    <main>
      <section className="page-hero compact-hero"><p className="eyebrow">Votre suivi</p><h1>Mes candidatures</h1><p>Retrouvez vos favoris et les offres auxquelles vous avez déjà postulé.</p></section>
      <section className="content-page tracking-page">
        <div className="tracking-filters" aria-label="Filtrer les offres suivies">
          {([[
            "all", "Toutes",
          ], ["favorite", "Favoris"], ["applied", "Postulées"]] as Array<[Filter, string]>).map(([value, label]) => <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}<span>{value === "all" ? items.length : items.filter((item) => item.status === value).length}</span></button>)}
        </div>
        {visible.length > 0 ? <div className="tracking-list">{visible.map(({ offer, status }) => <article className="tracking-card" key={offer.id}><div className="company-logo">{offer.company.slice(0, 1).toUpperCase()}</div><div><span className={`tracking-status ${status}`}>{status === "applied" ? "Candidature envoyée" : "Favori"}</span><h2>{offer.title}</h2><p>{offer.company} · {offer.location}</p><div className="offer-meta"><span>{offer.contractLabel}</span><span>{offer.publishedLabel}</span><span>{offer.source}</span></div></div><div className="tracking-actions"><a href={offer.applyUrl} target="_blank" rel="noreferrer noopener">Voir l’offre ↗</a>{status === "favorite" ? <button type="button" onClick={() => setStatus(offer.id, "applied")}>Marquer postulée</button> : <button type="button" onClick={() => setStatus(offer.id, "favorite")}>Remettre en favoris</button>}<button className="danger" type="button" onClick={() => remove(offer.id)}>Retirer</button></div></article>)}</div> : <div className="empty-state"><span>☆</span><h3>Aucune offre ici</h3><p>Ajoutez des favoris depuis la page des offres pour les retrouver ici.</p><Link className="primary-link inline-link" href="/offres">Voir les offres</Link></div>}
      </section>
    </main>
  );
}

