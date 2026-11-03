import "../lib/load-env";
import { seedGrapeVarietyKnowledge } from "@/lib/intelligence/variety-knowledge";

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Dry run: grape variety knowledge seed is available but not applied. Re-run with --apply after reviewing migration 0028.",
    );
    return;
  }
  const count = await seedGrapeVarietyKnowledge();
  console.log(`Seeded ${count} grape variety knowledge rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
