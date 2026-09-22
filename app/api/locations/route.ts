import { NextRequest, NextResponse } from "next/server";

type Commune = {
  nom?: string;
  code?: string;
  codeDepartement?: string;
};

const majorCities = [
  ["Paris", "75"], ["Marseille", "13"], ["Lyon", "69"], ["Toulouse", "31"],
  ["Nice", "06"], ["Nantes", "44"], ["Montpellier", "34"], ["Strasbourg", "67"],
  ["Bordeaux", "33"], ["Lille", "59"], ["Rennes", "35"], ["Reims", "51"],
  ["Toulon", "83"], ["Saint-Étienne", "42"], ["Le Havre", "76"], ["Grenoble", "38"],
  ["Dijon", "21"], ["Angers", "49"], ["Nîmes", "30"], ["Villeurbanne", "69"],
  ["Clermont-Ferrand", "63"], ["Aix-en-Provence", "13"], ["Brest", "29"], ["Tours", "37"],
] as const;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function localSuggestions(query: string) {
  const normalized = normalize(query);
  return majorCities
    .filter(([name]) => normalize(name).startsWith(normalized))
    .map(([name, department]) => ({ name, label: `${name} (${department})` }));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ suggestions: [] });
  const local = localSuggestions(query);

  const url = new URL("https://geo.api.gouv.fr/communes");
  url.searchParams.set("nom", query.slice(0, 80));
  url.searchParams.set("fields", "nom,code,codeDepartement,population");
  url.searchParams.set("boost", "population");
  url.searchParams.set("limit", "7");

  try {
    const response = await fetch(url, { next: { revalidate: 86_400 } });
    if (!response.ok) throw new Error("Service indisponible");
    const communes = (await response.json()) as Commune[];
    const remote = communes
      .filter((commune) => commune.nom && commune.code)
      .map((commune) => ({
        name: commune.nom as string,
        label: commune.codeDepartement
          ? `${commune.nom} (${commune.codeDepartement})`
          : (commune.nom as string),
      }));
    const suggestions = [...local, ...remote]
      .filter((suggestion, index, all) => all.findIndex((item) => item.name.toLowerCase() === suggestion.name.toLowerCase()) === index)
      .slice(0, 7);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: local });
  }
}
