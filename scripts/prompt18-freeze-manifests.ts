/**
 * Freeze the exact Prompt 17 approved actions into immutable local artifacts.
 * This command is read-only against production.
 */
import "../lib/load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  APPROVED_MANIFEST_A,
  APPROVED_MANIFEST_B_IDENTITIES,
  PROMPT_17_CHECKPOINT,
  PROMPT_18_MANIFEST_VERSION,
  deterministicManifestHash,
  evidenceManifestKey,
  validateManifestA,
  validateManifestB,
  validateManifestC,
  type Prompt18EvidenceManifestEntry,
  type Prompt18ManifestEnvelope,
  type Prompt18SourceManifestEntry,
} from "../lib/tech-facts/prompt18-manifests";
import { runReadOnlyCatalogRecovery } from "../lib/tech-facts/run-recovery";
import type { TechFactClaim } from "../lib/tech-facts/types";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function envelope<T>(
  batch: "A" | "B" | "C",
  frozenAt: string,
  entries: T[],
): Prompt18ManifestEnvelope<T> {
  return {
    prompt: 18,
    batch,
    version: PROMPT_18_MANIFEST_VERSION,
    prompt17Commit: PROMPT_17_CHECKPOINT,
    frozenAt,
    entriesHash: deterministicManifestHash(entries),
    entries,
  };
}

function claimKey(wineId: number, claim: TechFactClaim): string {
  return evidenceManifestKey({
    wineId,
    field: claim.field,
    sourceHash: claim.claimIdentityHash,
  });
}

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error("Manifest freezing is read-only and refuses --apply");
  }
  const outputDir = argValue("output-dir");
  if (!outputDir) {
    throw new Error("Provide a new immutable directory with --output-dir=<path>");
  }

  const runs = await Promise.all([
    runReadOnlyCatalogRecovery({ winerySlug: "balla-geza", includeAll: true }),
    runReadOnlyCatalogRecovery({ winerySlug: "avincis", includeAll: true }),
  ]);
  const claims = new Map<string, TechFactClaim>();
  for (const run of runs) {
    for (const recovery of run.recoveries) {
      for (const field of recovery.fields) {
        for (const claim of field.claims) {
          claims.set(claimKey(recovery.wineId, claim), claim);
        }
      }
    }
  }

  const manifestB: Prompt18EvidenceManifestEntry[] =
    APPROVED_MANIFEST_B_IDENTITIES.map((approved) => {
      const claim = claims.get(evidenceManifestKey(approved));
      if (!claim) {
        throw new Error(`Approved claim was not reproduced: ${evidenceManifestKey(approved)}`);
      }
      if (
        claim.sourceUrl !== approved.sourceUrl ||
        claim.sourceWineName == null ||
        claim.value !== approved.value
      ) {
        throw new Error(`Approved claim metadata drifted: ${evidenceManifestKey(approved)}`);
      }
      return {
        wineId: approved.wineId,
        slug: approved.slug,
        winery: approved.winery,
        field: approved.field,
        expectedStoredValue: approved.expectedStoredValue,
        value: approved.value,
        unit: claim.unit,
        sourceUrl: approved.sourceUrl,
        sourceType: claim.sourceType,
        sourceWineName: claim.sourceWineName,
        sourceVintage: claim.sourceVintage,
        sourceDocumentTitle: claim.sourceDocumentTitle,
        excerpt: claim.excerpt,
        extractionMethod: claim.extractionMethod,
        identityMatchClass: claim.identityMatchClass,
        confidence: claim.confidence,
        observedAt: claim.observedAt,
        sourceHash: approved.sourceHash,
        qualification: "QUALIFIED_MATCH_EXISTING",
        stability: "STABLE",
      };
    });

  const manifestA: Prompt18SourceManifestEntry[] = APPROVED_MANIFEST_A;
  const manifestC: never[] = [];
  validateManifestA(manifestA);
  validateManifestB(manifestB);
  validateManifestC(manifestC);

  const frozenAt = new Date().toISOString();
  const artifacts = [
    ["manifest-a.json", envelope("A", frozenAt, manifestA)],
    ["manifest-b.json", envelope("B", frozenAt, manifestB)],
    ["manifest-c.json", envelope("C", frozenAt, manifestC)],
  ] as const;
  const absoluteOutputDir = resolve(outputDir);
  await mkdir(dirname(absoluteOutputDir), { recursive: true });
  await mkdir(absoluteOutputDir, { recursive: false });
  for (const [filename, artifact] of artifacts) {
    await writeFile(
      resolve(absoluteOutputDir, filename),
      `${JSON.stringify(artifact, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  }

  console.log(
    JSON.stringify(
      {
        command: "prompt18:freeze-manifests",
        readOnly: true,
        outputDir: absoluteOutputDir,
        prompt17Commit: PROMPT_17_CHECKPOINT,
        manifests: Object.fromEntries(
          artifacts.map(([filename, artifact]) => [
            artifact.batch,
            {
              filename,
              count: artifact.entries.length,
              hash: artifact.entriesHash,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
