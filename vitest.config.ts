import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Config minimal, dedicat testelor unitare pentru logica pura din `lib/`
 * (scoring, confidence, vintage, pairing, integritate). Nu porneste Next.js
 * si nu are acces la baza de date reala; testele care au nevoie de DB
 * trebuie sa mock-uiasca `@/lib/db`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "scripts/**"],
    globals: false,
  },
});
