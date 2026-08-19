import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { COPY_CATEGORIES, type AuditArtifactPaths, type PublicCopyAudit } from "./types";

function markdownText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\r?\n/g, " ")
    .trim();
}

export function renderPublicCopyAuditMarkdown(audit: PublicCopyAudit): string {
  const lines: string[] = [
    "# Public Romanian Copy Audit",
    "",
    `Generated: ${audit.generatedAt}`,
    `Read-only scan: ${audit.readOnlyScan ? "yes" : "no"}`,
    `Scan roots: ${audit.scanRoots.join(", ")}`,
    "",
    "## Summary",
    "",
    `- Scanned files: ${audit.summary.scannedFiles}`,
    `- Excluded paths: ${audit.summary.excludedFiles}`,
    `- Candidate nodes: ${audit.summary.candidateNodes}`,
    `- Likely Romanian nodes: ${audit.summary.likelyRomanianNodes}`,
    `- Unique entries: ${audit.summary.uniqueEntries}`,
    "",
    "## Categories",
    "",
  ];

  for (const category of COPY_CATEGORIES) {
    lines.push(`- ${category}: ${audit.summary.byCategory[category]}`);
  }

  for (const category of COPY_CATEGORIES) {
    const entries = audit.entries.filter((entry) => entry.category === category);
    if (entries.length === 0) continue;
    lines.push("", `## ${category}`, "");
    for (const entry of entries) {
      lines.push(
        `- \`${entry.file}:${entry.line}:${entry.column}\` ` +
          `[${entry.surface}] ${markdownText(entry.text)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export async function writePublicCopyAuditArtifacts(
  audit: PublicCopyAudit,
  outputDirectory: string,
): Promise<AuditArtifactPaths> {
  const absoluteOutputDirectory = path.resolve(outputDirectory);
  const jsonPath = path.join(
    absoluteOutputDirectory,
    "i18n-public-audit.json",
  );
  const markdownPath = path.join(
    absoluteOutputDirectory,
    "i18n-public-audit.md",
  );

  await mkdir(absoluteOutputDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(audit, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, renderPublicCopyAuditMarkdown(audit), "utf8"),
  ]);

  return { jsonPath, markdownPath };
}
