import "server-only";
import postgres, { type Sql } from "postgres";
import { getServerConfig } from "../config";

const globalDatabase = globalThis as typeof globalThis & {
  jobPilotSql?: Sql;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(getServerConfig().databaseUrl);
}

export function getDatabase(): Sql {
  const databaseUrl = getServerConfig().databaseUrl;
  if (!databaseUrl) throw new Error("DATABASE_URL n'est pas configurée.");

  if (!globalDatabase.jobPilotSql) {
    globalDatabase.jobPilotSql = postgres(databaseUrl, {
      // Une fonction Vercel peut être démarrée plusieurs fois en parallèle. Une seule
      // connexion par instance évite d'épuiser la limite de la base serverless.
      max: process.env.VERCEL ? 1 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalDatabase.jobPilotSql;
}
