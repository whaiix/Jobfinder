import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL doit être défini avant de lancer la migration.");
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.join(currentDirectory, "..", "db", "migrations");
const migrationFiles = (await fs.readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  for (const migrationFile of migrationFiles) {
    const migration = await fs.readFile(path.join(migrationsDirectory, migrationFile), "utf8");
    await sql.unsafe(migration);
    process.stdout.write(`Migration appliquée : ${migrationFile}\n`);
  }
} finally {
  await sql.end();
}
