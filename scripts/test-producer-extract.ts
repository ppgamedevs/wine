import { readFileSync } from "node:fs";
import { extractProducerPageFromHtml } from "../lib/producer-page-extract";

const av = readFileSync("tmp-avincis.html", "utf8");
const rec = readFileSync("tmp-recas.html", "utf8");

const a = extractProducerPageFromHtml(
  av,
  "https://www.avincis.ro/vin-spumant-metoda-traditionala-vin-avincis-42-ro.htm",
);
const r = extractProducerPageFromHtml(
  rec,
  "https://cramelerecas.ro/la-stejari-chardonnay/",
);

console.log("Avincis medals:", a.medals.length);
console.log(JSON.stringify(a.medals, null, 2));
console.log("Recas medals:", r.medals.length);
console.log(JSON.stringify(r.medals, null, 2));
console.log("Recas viticulture len:", r.content.viticulture?.length ?? 0);
console.log("Recas tasting len:", r.content.tastingNotes?.length ?? 0);
