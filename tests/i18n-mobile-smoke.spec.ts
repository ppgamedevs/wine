import { expect, test } from "@playwright/test";

const widths = [320, 375, 430] as const;
const routes = [
  "/en",
  "/en/wines",
  "/en/wines/cramele-recas-solo-quinta-roze-2025",
  "/en/top-wines/wines-under-50-ron",
  "/en/wine-for/sarmale",
  "/en/ai-sommelier",
] as const;

for (const width of widths) {
  test.describe(`${width}px English public UI`, () => {
    for (const route of routes) {
      test(`${route} has no overflow or runtime errors`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (
            message.type() === "error" &&
            !message.text().startsWith("Failed to load resource:")
          ) {
            errors.push(message.text());
          }
        });
        page.on("response", (response) => {
          const url = response.url();
          const isLocalVercelTelemetry =
            url.includes("/_vercel/insights/") ||
            url.includes("/_vercel/speed-insights/");
          if (response.status() >= 400 && !isLocalVercelTelemetry) {
            errors.push(`HTTP ${response.status()} ${response.url()}`);
          }
        });
        await page.setViewportSize({ width, height: 844 });
        const response = await page.goto(route, {
          waitUntil: "networkidle",
        });

        expect(response?.status()).toBe(200);
        expect(await page.locator("html").getAttribute("lang")).toBe("en");
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
          overflowing: Array.from(document.querySelectorAll<HTMLElement>("*"))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              let ancestor = element.parentElement;
              let clipped = false;
              while (ancestor) {
                const ancestorRect = ancestor.getBoundingClientRect();
                const overflowX = getComputedStyle(ancestor).overflowX;
                if (
                  overflowX !== "visible" &&
                  (rect.right > ancestorRect.right ||
                    rect.left < ancestorRect.left)
                ) {
                  clipped = true;
                  break;
                }
                ancestor = ancestor.parentElement;
              }
              return {
                tag: element.tagName.toLowerCase(),
                className: element.className.toString().slice(0, 160),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                clipped,
              };
            })
            .filter(
              (element) =>
                !element.clipped &&
                (element.right > document.documentElement.clientWidth + 1 ||
                  element.left < -1),
            )
            .slice(0, 10),
          tableAncestors: (() => {
            const ancestors: Array<{
              tag: string;
              className: string;
              left: number;
              right: number;
              width: number;
              overflowX: string;
            }> = [];
            let element: HTMLElement | null =
              document.querySelector<HTMLElement>("table");
            while (element) {
              const rect = element.getBoundingClientRect();
              ancestors.push({
                tag: element.tagName.toLowerCase(),
                className: element.className.toString().slice(0, 160),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                overflowX: getComputedStyle(element).overflowX,
              });
              element = element.parentElement;
            }
            return ancestors;
          })(),
        }));
        expect(
          dimensions.content,
          `Overflowing elements: ${JSON.stringify(dimensions.overflowing)}. Table ancestors: ${JSON.stringify(dimensions.tableAncestors)}`,
        ).toBeLessThanOrEqual(dimensions.viewport + 1);
        expect(errors).toEqual([]);
      });
    }

    test("mobile header and menu remain usable", async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/en", { waitUntil: "networkidle" });
      const menuButton = page.getByRole("button", { name: "Open menu" });
      await expect(menuButton).toBeVisible();
      await menuButton.click();
      await expect(
        page.getByRole("navigation", { name: "Mobile navigation" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Ask the sommelier" }),
      ).toBeVisible();
    });
  });
}

