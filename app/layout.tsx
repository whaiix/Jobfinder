import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot — Les offres qui te correspondent",
  description:
    "Recherche un stage, une alternance ou un emploi sans perdre les bonnes offres à cause de mauvais tags.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
