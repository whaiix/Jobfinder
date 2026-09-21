import "server-only";
import { normalizeOffer, toPublicOffer } from "../../jobs/normalize";
import type { JobOffer, JobSearchQuery } from "../../jobs/types";
import { getDatabase } from "../db/client";

type JobRow = {
  id: string;
  source: string;
  source_job_id: string;
  source_contract: string | null;
  title: string;
  company: string;
  location: string;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string;
  published_at: Date;
  expires_at: Date | null;
  apply_url: string;
  raw_offer: unknown;
};

function rowToOffer(row: JobRow): JobOffer {
  return toPublicOffer(
    normalizeOffer({
      id: row.id,
      source: row.source,
      sourceContract: row.source_contract,
      title: row.title,
      company: row.company,
      location: row.location,
      city: row.city,
      postalCode: row.postal_code,
      latitude: row.latitude,
      longitude: row.longitude,
      description: row.description,
      publishedAt: row.published_at.toISOString(),
      expiresAt: row.expires_at?.toISOString() ?? null,
      applyUrl: row.apply_url,
      raw: row.raw_offer,
    }),
  );
}

export async function upsertOffers(offers: JobOffer[]): Promise<void> {
  if (offers.length === 0) return;
  const sql = getDatabase();

  await sql.begin(async (transaction) => {
    for (const offer of offers) {
      const sourceJobId = offer.id.includes(":")
        ? offer.id.split(":").slice(1).join(":")
        : offer.id;
      await transaction`
        INSERT INTO job_offers (
          id, source, source_job_id, source_contract, title, company, location,
          city, postal_code, latitude, longitude, description, published_at,
          expires_at, apply_url, contract, classification_reason, raw_offer, updated_at
        ) VALUES (
          ${offer.id}, ${offer.source}, ${sourceJobId}, ${offer.sourceContract ?? null},
          ${offer.title}, ${offer.company}, ${offer.location}, ${offer.city ?? null},
          ${offer.postalCode ?? null}, ${offer.latitude ?? null}, ${offer.longitude ?? null},
          ${offer.description}, ${offer.publishedAt}, ${offer.expiresAt ?? null},
          ${offer.applyUrl}, ${offer.contract}, ${offer.classificationReason},
          ${transaction.json(JSON.parse(JSON.stringify(offer.raw ?? {})))}, NOW()
        )
        ON CONFLICT (source, source_job_id) DO UPDATE SET
          source_contract = EXCLUDED.source_contract,
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          location = EXCLUDED.location,
          city = EXCLUDED.city,
          postal_code = EXCLUDED.postal_code,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          description = EXCLUDED.description,
          published_at = EXCLUDED.published_at,
          expires_at = EXCLUDED.expires_at,
          apply_url = EXCLUDED.apply_url,
          contract = EXCLUDED.contract,
          classification_reason = EXCLUDED.classification_reason,
          raw_offer = EXCLUDED.raw_offer,
          updated_at = NOW()
      `;
    }
  });
}

export async function searchStoredOffers(query: JobSearchQuery): Promise<JobOffer[]> {
  const sql = getDatabase();
  const textPattern = `%${query.query}%`;
  const locationPattern = `%${query.location}%`;
  const rows = await sql<JobRow[]>`
    SELECT *
    FROM job_offers
    WHERE
      (${query.query} = '' OR title ILIKE ${textPattern} OR description ILIKE ${textPattern} OR company ILIKE ${textPattern})
      AND (${query.location} = '' OR location ILIKE ${locationPattern} OR city ILIKE ${locationPattern} OR postal_code ILIKE ${locationPattern})
      AND (${query.contract} = 'all' OR contract = ${query.contract})
      AND (expires_at IS NULL OR expires_at >= NOW())
    ORDER BY published_at DESC
    LIMIT ${query.limit}
  `;

  return rows.map(rowToOffer);
}
