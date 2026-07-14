/**
 * Antreneaza modelul simplu de calitate (ridge regression) + validare 20% test.
 *
 *   npx tsx scripts/train-quality-model.ts
 *   npx tsx scripts/train-quality-model.ts --seed=42
 */
import "../lib/load-env";
import {
  collectQualityDataFromDb,
  DECENT_TEST_RMSE,
  saveQualityDataset,
  saveQualityModel,
  splitTrainTest,
  summarizeQualityDataset,
  trainQualityModel,
} from "@/lib/quality-model";

function parseSeedArg(): number | undefined {
  const match = process.argv.find((arg) => arg.startsWith("--seed="));
  if (!match) return undefined;
  const value = Number.parseInt(match.split("=")[1] ?? "", 10);
  return Number.isFinite(value) ? value : undefined;
}

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

async function main() {
  const seed = parseSeedArg();
  const random = seed != null ? createRng(seed) : Math.random;

  const rows = await collectQualityDataFromDb({
    bootstrap: process.argv.includes("--bootstrap"),
  });
  const summary = summarizeQualityDataset(rows);
  await saveQualityDataset(rows);

  console.log("[train-quality] Vinuri etichetate:", summary.total);
  if (rows.length < 8) {
    console.error(
      "[train-quality] Insuficiente date etichetate (minim 8). Adauga rating-uri sau overrides.",
    );
    process.exit(1);
  }

  const { train, test } = splitTrainTest(rows, 0.2, random);
  const holdout = trainQualityModel(train, {
    testRows: test,
    trainSize: train.length,
    testSize: test.length,
  });

  console.log("\n[train-quality] Validare holdout 20%");
  console.log(`  Train RMSE: ${holdout.trainRmse}`);
  console.log(`  Test RMSE:  ${holdout.testRmse}`);
  console.log(`  Train MAE:  ${holdout.trainMae}`);
  console.log(`  Test MAE:   ${holdout.testMae}`);

  const decent = holdout.testRmse <= DECENT_TEST_RMSE;
  console.log(
    `  Prag decent (RMSE <= ${DECENT_TEST_RMSE}): ${decent ? "OK" : "sub asteptari"}`,
  );

  const finalModel = trainQualityModel(rows, {
    trainSize: rows.length,
    testSize: test.length,
    testRmse: holdout.testRmse,
  });

  const modelPath = await saveQualityModel(finalModel.artifact);
  console.log("\n[train-quality] Model salvat:", modelPath);
  console.log("[train-quality] Retrain pe full dataset, RMSE train:", finalModel.trainRmse);
  console.log("[train-quality] done");
}

main().catch((error) => {
  console.error("[train-quality] fatal:", error);
  process.exit(1);
});
