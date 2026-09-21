import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Accueil JobPilot">
        <span className="brand-mark" aria-hidden="true">J</span>
        <span>JobPilot</span>
      </Link>
      <nav className="main-nav" aria-label="Navigation principale">
        <Link href="/offres">Les offres</Link>
        <Link href="/profil">Mon profil</Link>
      </nav>
      <Link className="header-cta" href="/offres">Rechercher</Link>
    </header>
  );
}
