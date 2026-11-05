import { chromium } from "playwright";

const baseUrl = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3122";
const wineSlug =
  process.env.BROWSER_VINTAGE_WINE_SLUG ??
  process.env.BROWSER_WINE_SLUG ??
  "zestrea-muscat-ottonel-demisec-2021-demo";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  if (/_vercel|insights|Failed to load resource/i.test(message.text())) return;
  errors.push(message.text());
});

async function dismiss() {
  const accept = page.getByRole("button", { name: /accept|accepta/i });
  if (await accept.count()) await accept.first().click();
}

await page.goto(`${baseUrl}/wines/${wineSlug}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
await dismiss();
const story = page.getByRole("heading", { name: /povestea recoltei|harvest story/i });
await story.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const storyVisible = await story.isVisible();
const classificationVisible = await page.getByText(/favorabil|favorable|mixt|mixed/i).first().isVisible();
const sourcesVisible = await page.getByText(/surse și transparență|sources and transparency/i).first().isVisible();
const comparisonHeading = page.getByRole("heading", { name: /compară recoltele|compare vintages/i });
const comparisonVisible = await comparisonHeading.isVisible();
const comparisonText = comparisonVisible
  ? await comparisonHeading.locator("..").locator("..").innerText()
  : "";
const bothVintageAssessmentsVisible =
  /2021/.test(comparisonText) && /2025/.test(comparisonText) &&
  /favorabil/i.test(comparisonText) && /mixt/i.test(comparisonText);
const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
await page.screenshot({ path: "docs/vintage-story-desktop.png", fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
await dismiss();
await story.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const mobileStoryVisible = await story.isVisible();
await page.screenshot({ path: "docs/vintage-story-mobile.png", fullPage: false });

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${baseUrl}/ghid-recolte`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await dismiss();
const guideHeading = page.getByRole("heading", { name: /ghidul recoltelor|vintage guide/i }).first();
const guideVisible = await guideHeading.isVisible();
await page.screenshot({ path: "docs/vintage-guide-desktop.png", fullPage: false });

await page.goto(`${baseUrl}/en/vintage-guide`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(700);
const englishGuide = await page
  .getByRole("heading", { name: /vintage guide/i })
  .first()
  .isVisible();
await page.goto(`${baseUrl}/en/wines/${wineSlug}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
const englishStory = await page
  .getByRole("heading", { name: /harvest story/i })
  .first()
  .isVisible();

console.log(JSON.stringify({
  baseUrl,
  wineSlug,
  storyVisible,
  classificationVisible,
  sourcesVisible,
  comparisonVisible,
  bothVintageAssessmentsVisible,
  desktopOverflow,
  mobileOverflow,
  mobileStoryVisible,
  guideVisible,
  englishGuide,
  englishStory,
  errors,
}, null, 2));
await browser.close();
if (!storyVisible || !classificationVisible || !sourcesVisible || !comparisonVisible || !bothVintageAssessmentsVisible || desktopOverflow || mobileOverflow || !mobileStoryVisible || !guideVisible || !englishGuide || !englishStory || errors.length > 0) {
  process.exit(1);
}
