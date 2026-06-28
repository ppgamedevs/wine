import { config } from "dotenv";

// .env.local first (Vercel pull / secrets), then .env — existing keys are not overwritten.
config({ path: ".env.local" });
config({ path: ".env" });
