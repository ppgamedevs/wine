/**
 * Read-only production invariant snapshot and comparator.
 */
import "../lib/load-env";
import { readFile, writeFile } from "node:fs/promises";
import {
  captureProductionInvariantSnapshot,
  compareProductionInvariantSnapshots,
  type ProductionInvariantSnapshot,
} from "../lib/tech-facts/production-snapshot";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(
    prefix.length,
  );
}

async function main() {
  const current = await captureProductionInvariantSnapshot();
  const comparePath = argValue("compare");
  const comparison = comparePath
    ? compareProductionInvariantSnapshots(
        JSON.parse(
          await readFile(comparePath, "utf8"),
        ) as ProductionInvariantSnapshot,
        current,
      )
    : null;
  const outputPath = argValue("output");
  if (outputPath) {
    await writeFile(
      outputPath,
      `${JSON.stringify(current, null, 2)}\n`,
      "utf8",
    );
  }
  console.log(JSON.stringify({ current, comparison }, null, 2));
  if (comparison && !comparison.identical) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
