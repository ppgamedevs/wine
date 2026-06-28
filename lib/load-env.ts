import { config } from "dotenv";
import { sanitizeEnv } from "./env";

// .env.local first, then .env. Blank values from Vercel pull are stripped after load.
config({ path: ".env.local" });
config({ path: ".env" });
sanitizeEnv();
