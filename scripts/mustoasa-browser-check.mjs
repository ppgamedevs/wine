import { chromium } from "playwright";

const baseUrl = process.env.BROWSER_BASE_URL ?? "http://127.0.0.1:3126";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  if (/_vercel|insights|Failed to load resource/i.test(message.text())) return;
  errors.push(message.text());
});

await page.goto(`${baseUrl}/soiuri/mustoasa-de-maderat`, { waitUntil: "networkidle" });
const accept = page.getByRole("button", { name: /accept|accepta/i });
if (await accept.count()) await accept.first().click();
await page.waitForTimeout(300);
const heading = page.locator("h1").first();
const profile = page.getByRole("heading", { name: /Profil de degustare/i });
const editorial = page.getByRole("heading", { name: /Lectură de somelier/i });
const checklist = page.getByRole("heading", { name: /Checklist de cumpărare/i });
const wrong = page.getByRole("heading", { name: /Ce poate merge prost/i });
await page.screenshot({ path: "docs/mustoasa-hero-desktop.png", fullPage: false });
await profile.scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await page.screenshot({ path: "docs/mustoasa-editorial-desktop.png", fullPage: false });
const desktopOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
const result = {
  heading: await heading.isVisible(),
  profile: await profile.isVisible(),
  editorial: await editorial.isVisible(),
  checklist: await checklist.isVisible(),
  wrong: await wrong.isVisible(),
  desktopOverflow,
  errors,
};

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const acceptMobile = page.getByRole("button", { name: /accept|accepta/i });
if (await acceptMobile.count()) await acceptMobile.first().click();
await page.waitForTimeout(250);
const mobileProfile = page.getByRole("heading", { name: /Profil de degustare/i });
await mobileProfile.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth + 1,
);
await page.screenshot({ path: "docs/mustoasa-editorial-mobile.png", fullPage: false });
result.mobileProfile = await mobileProfile.isVisible();
result.mobileOverflow = mobileOverflow;

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(`${baseUrl}/en/soiuri/mustoasa-de-maderat`, { waitUntil: "networkidle" });
const englishProfile = await page
  .getByRole("heading", { name: /Tasting profile/i })
  .isVisible();
result.englishProfile = englishProfile;
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (
  !result.heading ||
  !result.profile ||
  !result.editorial ||
  !result.checklist ||
  !result.wrong ||
  !result.mobileProfile ||
  !result.englishProfile ||
  result.desktopOverflow ||
  result.mobileOverflow ||
  errors.length > 0
) {
  process.exit(1);
}
