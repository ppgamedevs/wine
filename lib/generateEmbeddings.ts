import "./load-env";
import { db } from "@/lib/db";
import {
  buildWineDocumentText,
  embedText,
  ensureVectorIndex,
  saveWineEmbedding,
} from "@/lib/embeddings";
import type { WineWithRelations } from "@/types";

async function main() {
  await ensureVectorIndex();

  const rows = await db.query.wines.findMany({
    with: { winery: true, region: true },
  });

  console.log(`Generating embeddings for ${rows.length} wines...`);

  if (rows.length === 0) {
    console.log(
      "Baza de date este goala. Ruleaza mai intai: npm run db:seed",
    );
    return;
  }

  let done = 0;
  for (const wine of rows as WineWithRelations[]) {
    try {
      const text = buildWineDocumentText(wine);
      console.log(`Embedding: ${wine.slug}...`);
      const embedding = await embedText(text);
      await saveWineEmbedding(wine.id, embedding);
      done += 1;
      await sleep(800);
    } catch (error) {
      console.error(`Failed embedding ${wine.slug}:`, error);
    }
  }

  console.log(`Done. Embedded ${done}/${rows.length} wines.`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("generateEmbeddings failed:", error);
  process.exit(1);
});
