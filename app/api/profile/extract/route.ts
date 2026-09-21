import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Le CV ne doit pas dépasser 5 Mo." }, { status: 413 });
  }

  try {
    let text = "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else if (file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name)) {
      text = await file.text();
    } else {
      return NextResponse.json({ error: "Utilisez un CV PDF, TXT ou Markdown." }, { status: 415 });
    }

    return NextResponse.json({ text: text.slice(0, 50_000) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Le texte de ce CV n’a pas pu être extrait." }, { status: 422 });
  }
}
