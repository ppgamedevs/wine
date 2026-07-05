import "./load-env";
import { analyzeAndSaveWineFromUrl } from "./analyze-wine-service";

const url = process.argv[2];

if (!url) {
  console.error("Usage: tsx lib/add-wine-from-url.ts <url>");
  process.exit(1);
}

async function main() {
  console.log(`[add-wine] url=${url}`);
  const result = await analyzeAndSaveWineFromUrl(url, "admin-cli");

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "rejected") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[add-wine] esuat:", error);
  process.exit(1);
});
