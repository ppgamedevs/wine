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
  const url = envOrUndefined("TURSO_DATABASE_URL") ?? "file:local.db";
  const authToken = envOrUndefined("TURSO_AUTH_TOKEN");
  return { url, authToken };
}

export function isTursoUrl(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("https://");
}
