import { config } from "dotenv";
import { getTursoConfig, sanitizeEnv } from "./lib/env";

config({ path: ".env.local" });
config({ path: ".env" });
sanitizeEnv();

import { defineConfig } from "drizzle-kit";

const { url, authToken } = getTursoConfig();

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken,
  },
});
