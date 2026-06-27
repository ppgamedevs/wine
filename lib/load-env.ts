import { config } from "dotenv";

// Vercel writes pulled env vars to .env.local; load it first, then fall back
// to .env. Next.js loads these automatically, but tsx/drizzle-kit do not.
config({ path: ".env.local" });
config();
