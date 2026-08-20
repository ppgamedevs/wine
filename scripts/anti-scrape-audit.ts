import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  runAntiScrapeAudit,
  type AuditSourceFile,
} from "../lib/security/anti-scrape-audit";

const MUTATION_FLAGS = ["--apply", "--fix", "--output", "--write"] as const;

function repositoryRoot(): string {
  const rootArgument = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--root="));
  return path.resolve(rootArgument?.slice("--root=".length) ?? process.cwd());
}

function assertReadOnlyArguments(): void {
  const mutationFlag = MUTATION_FLAGS.find((flag) =>
    process.argv.slice(2).some((argument) => argument === flag || argument.startsWith(`${flag}=`)),
  );
  if (mutationFlag) {
    throw new Error(`The audit is read-only and refuses ${mutationFlag}.`);
  }
  const unsupported = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--root="));
  if (unsupported) throw new Error(`Unsupported argument: ${unsupported}`);
}

async function collectRouteSources(root: string): Promise<AuditSourceFile[]> {
  const apiRoot = path.join(root, "app", "api");
  const files: AuditSourceFile[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name === "route.ts") {
        files.push({
          path: path.relative(root, absolutePath).replaceAll("\\", "/"),
          content: await readFile(absolutePath, "utf8"),
        });
      }
    }
  }

  await visit(apiRoot);
  return files;
}

function trackedPaths(root: string): string[] {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return output
    .split("\0")
    .filter(Boolean)
    .filter((item) => existsSync(path.join(root, item)))
    .map((item) => item.replaceAll("\\", "/"));
}

async function main(): Promise<void> {
  assertReadOnlyArguments();
  const root = repositoryRoot();
  const report = runAntiScrapeAudit({
    sourceFiles: await collectRouteSources(root),
    trackedPaths: trackedPaths(root),
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.summary.findingCount > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
