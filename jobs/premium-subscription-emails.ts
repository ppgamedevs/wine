/**
 * Trimite emailuri automate Premium: reminder (7 zile) si expirare.
 *
 * Rulare manuala:
 *   npm run jobs:premium-emails
 *   npm run jobs:premium-emails -- --dry-run
 */
import "../lib/load-env";
import { runPremiumSubscriptionEmailJob } from "../lib/premium-subscription-emails";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await runPremiumSubscriptionEmailJob({ dryRun });

  console.log(
    dryRun ? "[premium-emails] dry-run complete" : "[premium-emails] complete",
    result,
  );
}

main().catch((error) => {
  console.error("[premium-emails] failed", error);
  process.exit(1);
});
