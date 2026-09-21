import "server-only";

export type ServerConfig = {
  databaseUrl: string | null;
  franceTravail: {
    clientId: string | null;
    clientSecret: string | null;
    scope: string;
    tokenUrl: string;
    apiBaseUrl: string;
  };
};

export function getServerConfig(): ServerConfig {
  return {
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    franceTravail: {
      clientId: process.env.FRANCE_TRAVAIL_CLIENT_ID?.trim() || null,
      clientSecret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.trim() || null,
      scope: process.env.FRANCE_TRAVAIL_SCOPE?.trim() || "api_offresdemploiv2 o2dsoffre",
      tokenUrl:
        process.env.FRANCE_TRAVAIL_TOKEN_URL?.trim() ||
        "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
      apiBaseUrl:
        process.env.FRANCE_TRAVAIL_API_BASE_URL?.trim() ||
        "https://api.francetravail.io/partenaire/offresdemploi/v2",
    },
  };
}

export function hasFranceTravailCredentials(config = getServerConfig()): boolean {
  return Boolean(config.franceTravail.clientId && config.franceTravail.clientSecret);
}
