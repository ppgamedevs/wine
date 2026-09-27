import { spawn } from "node:child_process";
import path from "node:path";

const scripts = [
  "add-murfatlar-lacrima-ovidiu-rosu-affiliate.ts",
  "add-murfatlar-lacrima-ovidiu-roze-affiliate.ts",
  "add-murfatlar-lacrima-ovidiu-alb-affiliate.ts",
];

function runScript(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["tsx", path.join("scripts", file)],
      { stdio: "inherit", shell: true, cwd: process.cwd() },
    );
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  for (const file of scripts) {
    console.log(`\n=== ${file} ===`);
    const code = await runScript(file);
    if (code !== 0) {
      process.exit(code);
    }
  }
  console.log("\n=== all Lacrima imports done ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
