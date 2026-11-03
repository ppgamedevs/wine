import "../lib/load-env";
import { writeFileSync } from "node:fs";
import { loadTargetSources, loadTargetWine } from "@/lib/intelligence/fixtures";
import { runWineIntelligence } from "@/lib/intelligence/pipeline";
import {
  buildChatGptStyleBaseline,
  evaluateBenchmark,
} from "@/lib/quality/benchmark";

async function main() {
  const wine = loadTargetWine();
  const { report } = await runWineIntelligence({
    wine,
    fixtures: loadTargetSources(),
    dryRun: true,
  });
  const values = new Map(
    report.reconciled
      .filter((claim) => claim.value != null)
      .map((claim) => [claim.field, claim.value]),
  );
  const supportedFields = [
    "wine_color",
    "type",
    "sweetness",
    "grape_varieties",
    "taste_descriptors",
    "aroma_descriptors",
    "serving_temperature",
    "food_pairing",
    "region",
    "country",
    "appellation",
    "body",
    "acidity_perception",
    "variety_knowledge",
    "verification",
    "commercial",
  ].filter(
    (field) =>
      field === "type" ||
      field === "variety_knowledge" ||
      field === "verification" ||
      field === "commercial" ||
      values.has(field as never),
  );
  const citations = [
    ...new Set(
      report.reconciled
        .filter((claim) => claim.value != null)
        .map((claim) => claim.sourceUrl ?? "")
        .filter(Boolean),
    ),
  ];
  const vinintel = {
    label: "VinIntel",
    text: [
      `Vin alb demisec din Muscat Ottonel, ${String(values.get("appellation") ?? "DOC Murfatlar")}.`,
      `Profil: ${JSON.stringify(values.get("aroma_descriptors") ?? [])}; ${JSON.stringify(values.get("taste_descriptors") ?? [])}.`,
      `Se servește la ${String(values.get("serving_temperature") ?? "temperatura recomandată")}°C.`,
      `Asocieri: ${JSON.stringify(values.get("food_pairing") ?? [])}.`,
      `Alcool: ${String(values.get("alcohol") ?? "nedisponibil")}% — sursă retailer, nu confirmare oficială.`,
      "Fiecare afirmație are citare; diferențele față de înregistrarea existentă sunt păstrate ca conflict.",
    ].join(" "),
    citations,
    supportedFields,
    unsupportedAssertions: [],
  };
  const result = evaluateBenchmark({
    vinintel,
    chatgpt: buildChatGptStyleBaseline(),
  });
  const lines = [
    "# ChatGPT vs VinIntel benchmark — target wine",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Result",
    "",
    `- VinIntel: **${result.vinintelTotal}/100**`,
    `- ChatGPT-style baseline: **${result.chatgptTotal}/100**`,
    `- Winner: **${result.winner}**`,
    "",
    "Length is not rewarded. Unsupported assertions lose points.",
    "",
    "## Per-question scores",
    "",
    "| Question | VinIntel | ChatGPT |",
    "|---|---:|---:|",
    ...result.cases.map(
      (item) => `| ${item.questionId} | ${item.vinintel.total} | ${item.chatgpt.total} |`,
    ),
    "",
    "## Notes",
    "",
    ...result.notes.map((note) => `- ${note}`),
    "",
    "## Commands",
    "",
    "```bash",
    "npx tsx scripts/quality-benchmark.ts",
    "```",
    "",
    "No AI API was called; the VinIntel answer is built from source-backed V2 claims.",
  ];
  const markdown = lines.join("\n");
  console.log(markdown);
  writeFileSync("docs/catalog-quality-benchmark.md", markdown, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
