/**
 * Compatibility export for the public trust API.
 *
 * Public pages resolve trust only from the current wine row and persisted
 * evidence. Recovery results are intentionally not accepted here.
 */
export {
  getVerifiedTechnicalValue,
  publicTechStatusLabel,
  resolvePublicTechnicalTrust,
} from "@/lib/tech-facts/public-trust";
export type {
  PublicTechnicalField,
  PublicTechnicalTrust,
  PublicTechSource,
  PublicTechStatus,
} from "@/lib/tech-facts/public-trust";
