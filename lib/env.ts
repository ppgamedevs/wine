const EMPTY_ENV_KEYS = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "XAI_API_KEY",
  "HF_TOKEN",
] as const;

/** Treat blank Vercel-pulled values as unset so fallbacks work. */
export function sanitizeEnv(): void {
  for (const key of EMPTY_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined && value.trim() === "") {
      delete process.env[key];
    }
  }
}

export function envOrUndefined(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function getTursoConfig(): { url: string; authToken?: string } {
  const url = envOrUndefined("TURSO_DATABASE_URL");
  const authToken = envOrUndefined("TURSO_AUTH_TOKEN");

  if (process.env.VERCEL === "1") {
    if (!url || !isTursoUrl(url)) {
      throw new Error(
        "TURSO_DATABASE_URL lipseste sau e invalid pe Vercel. Seteaza variabila pentru Preview si Production.",
      );
    }
    if (!authToken) {
      throw new Error(
        "TURSO_AUTH_TOKEN lipseste pe Vercel. Seteaza tokenul pentru Preview si Production.",
      );
    }
    return { url, authToken };
  }

  return {
    url: url ?? "file:local.db",
    authToken,
  };
}

export function isTursoUrl(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("https://");
}
