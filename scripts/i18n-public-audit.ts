import path from "node:path";
import {
  auditPublicRomanianCopy,
  writePublicCopyAuditArtifacts,
} from "../lib/i18n";

interface CliOptions {
  readonly rootDir: string;
  readonly outputDirectory: string;
}

function readArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function cliOptions(): CliOptions {
  const rootDir = path.resolve(readArgument("root") ?? process.cwd());
  const outputDirectory = path.resolve(
    rootDir,
    readArgument("output") ?? "artifacts",
  );
  return { rootDir, outputDirectory };
}

async function main(): Promise<void> {
  const options = cliOptions();
  const audit = await auditPublicRomanianCopy({ rootDir: options.rootDir });
  const artifacts = await writePublicCopyAuditArtifacts(
    audit,
    options.outputDirectory,
  );

  console.log(
    JSON.stringify(
      {
        command: "i18n-public-audit",
        readOnlyScan: audit.readOnlyScan,
        scannedFiles: audit.summary.scannedFiles,
        uniqueEntries: audit.summary.uniqueEntries,
        artifacts,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
