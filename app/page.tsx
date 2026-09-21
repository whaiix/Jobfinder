import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="landing-hero">
        <div className="hero-grid-glow" aria-hidden="true" />
        <div className="landing-copy">
          <p className="eyebrow">La recherche d’emploi, enfin précise</p>
          <h1>Les bonnes offres.<br /><span>Vraiment pour vous.</span></h1>
          <p className="landing-lead">
            JobPilot analyse les titres et les descriptions pour écarter les faux résultats,
            reconnaître le bon contrat et faire émerger les métiers qui correspondent à vos compétences.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/offres">Découvrir les offres <span>→</span></Link>
            <Link className="secondary-link" href="/profil">Analyser mon CV</Link>
          </div>
          <div className="hero-proof">
            <span>Offres de moins de 14 jours</span>
            <span>Préférences mémorisées</span>
            <span>Sources officielles</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Aperçu de JobPilot">
          <div className="visual-topbar"><i /><i /><i /><span>Recherche ciblée</span></div>
          <div className="visual-filter"><span>Développeur web</span><span>Paris + Lyon</span><b>Rechercher</b></div>
          <div className="visual-card featured">
            <div className="visual-logo">A</div><div><strong>Développeur front-end</strong><p>Atelier Numérique · Paris</p><small>CDI · 0–1 an</small></div><em>92%</em>
          </div>
          <div className="visual-card">
            <div className="visual-logo">S</div><div><strong>Webmaster & communication</strong><p>Studio Horizon · Lyon</p><small>Alternance · Débutant</small></div>
          </div>
          <div className="visual-insight"><span>✦</span><p><strong>Contrat vérifié</strong><br />Le titre et la description correspondent.</p></div>
        </div>
      </section>

      <section className="feature-section">
        <div className="section-intro">
          <p className="eyebrow">Moins de bruit, plus d’opportunités</p>
          <h2>Tout ce qu’il faut pour passer de la recherche à la candidature.</h2>
        </div>
        <div className="feature-grid">
          <article><span>01</span><h3>Un tri qui lit vraiment</h3><p>Contrat, expérience, métier et ville sont vérifiés jusque dans la description de l’annonce.</p></article>
          <article><span>02</span><h3>Une candidature mieux ciblée</h3><p>Repérez les mots-clés ATS et obtenez une base de lettre adaptée à chaque offre.</p></article>
          <article><span>03</span><h3>Des pistes depuis votre CV</h3><p>Découvrez des métiers voisins auxquels vos compétences vous donnent déjà accès.</p></article>
        </div>
      </section>

      <section className="bottom-cta">
        <p className="eyebrow">Prêt à chercher autrement ?</p>
        <h2>Votre prochaine opportunité a peut-être un autre intitulé.</h2>
        <Link className="primary-link light" href="/offres">Lancer ma recherche <span>→</span></Link>
      </section>
    </main>
  );
}
