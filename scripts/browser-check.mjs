import { chromium } from "playwright";

const baseUrl = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3114";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => {
  if (message.type() !== "error") return;
  // Local `next start` has no Vercel analytics endpoints; these are not app
  // errors and are filtered together with their generic resource failures.
  if (/_vercel|insights/i.test(message.text())) return;
  if (/Failed to load resource/i.test(message.text())) return;
  consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(`${baseUrl}/soiuri`, { waitUntil: "networkidle" });
const accept = page.getByRole("button", { name: /accept|accepta/i });
if (await accept.count()) await accept.first().click();
await page.waitForTimeout(400);
const cards = page.locator("a[href*='/soiuri/']");
const cardCount = await cards.count();
const images = page.locator("a[href*='/soiuri/'] img");
const imageCount = await images.count();
const imageAlts = await images.evaluateAll((nodes) =>
  nodes.map((node) => node.getAttribute("alt") ?? ""),
);
const loadedImages = await images.evaluateAll((nodes) =>
  nodes.filter((node) => node.naturalWidth > 0).length,
);
const photoAlts = imageAlts.filter((alt) => /^(Fotografie|Photograph)/.test(alt)).length;
const illustrationLabels = await page
  .locator("a[href*='/soiuri/']")
  .getByText("Ilustrație", { exact: true })
  .count();
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
await cards.first().screenshot({ path: "docs/soiuri-card-desktop.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const acceptMobile = page.getByRole("button", { name: /accept|accepta/i });
if (await acceptMobile.count()) await acceptMobile.first().click();
await page.waitForTimeout(300);
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
const mobileImageVisible = await cards.first().locator("img").isVisible();
await cards.first().screenshot({ path: "docs/soiuri-card-mobile.png" });

await page.setViewportSize({ width: 1280, height: 900 });
const wineSlug =
  process.env.BROWSER_WINE_SLUG ??
  "murfatlar-zestrea-muscat-ottonel-demisec-0-75l";
await page.goto(`${baseUrl}/wines/${wineSlug}`, { waitUntil: "networkidle" });
const profileHeading = page.getByRole("heading", { name: /profil universal/i });
const profileVisible = await profileHeading.isVisible();
await profileHeading.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "docs/wine-universal-profile-desktop.png", fullPage: false });

await page.goto(`${baseUrl}/soiuri/feteasca-neagra`, { waitUntil: "networkidle" });
const detail = page.locator("main figure").first();
const detailVisible = await detail.isVisible();
const detailCredit = await page.getByText(/Credit foto|Image credit/i).first().isVisible();
await page.screenshot({ path: "docs/soiuri-detail-desktop.png", fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(300);
await page.screenshot({ path: "docs/soiuri-detail-mobile.png", fullPage: false });

const result = {
  baseUrl,
  cardCount,
  imageCount,
  loadedImages,
  photoAlts,
  illustrationLabels,
  detailVisible,
  detailCredit,
  allImagesHaveAlt: imageAlts.every((alt) => alt.trim().length > 10),
  overflow,
  mobileOverflow,
  mobileImageVisible,
  profileVisible,
  consoleErrors,
  pageErrors,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (
  cardCount < 10 ||
  imageCount < 13 ||
  loadedImages < 13 ||
  photoAlts < 4 ||
  illustrationLabels < 8 ||
  !detailVisible ||
  !detailCredit ||
  !result.allImagesHaveAlt ||
  overflow ||
  mobileOverflow ||
  !mobileImageVisible ||
  !profileVisible ||
  consoleErrors.length > 0 ||
  pageErrors.length > 0
) {
  process.exit(1);
}
