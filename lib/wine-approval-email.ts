import "server-only";
import { generateObject } from "ai";
import { Resend } from "resend";
import {
  buildWineApprovalEmailUserPrompt,
  WINE_APPROVAL_EMAIL_SYSTEM_PROMPT,
} from "@/lib/ai/prompts";
import { wineApprovalEmailSummarySchema } from "@/lib/ai/schemas";
import { getSommelierModel } from "@/lib/ai/model";
import { envOrUndefined } from "@/lib/env";
import { getResendFromEmail } from "@/lib/site-email";
import { absoluteUrl } from "@/lib/seo";
import { resolveAffiliatePurchaseUrl } from "@/lib/retailer-links";
import type { AffiliateLink, AvailabilityEntry } from "@/lib/schema";
import { sanitizeEditorialText } from "@/lib/editorial-text";

export interface WineApprovalEmailWine {
  id: number;
  name: string;
  slug: string;
  vintage: number | null;
  type: string;
  sweetness: string | null;
  priceAvg: number | null;
  currentPrice: number | null;
  valueScore: number | null;
  descriptionEditorial: string | null;
  tasteProfile: string | null;
  sourceUrl: string | null;
  grapeVarieties: { name: string }[];
  affiliateLinks: AffiliateLink[];
  availability: AvailabilityEntry[];
  winery: { name: string } | null;
  region: { name: string } | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWinePageUrl(slug: string): string {
  return absoluteUrl(`/wines/${slug}`);
}

function formatWineTitle(wine: WineApprovalEmailWine): string {
  return `${wine.name}${wine.vintage ? ` ${wine.vintage}` : ""}`;
}

function fallbackSummary(wine: WineApprovalEmailWine): string {
  const editorial = wine.descriptionEditorial?.trim();
  if (editorial) {
    return sanitizeEditorialText(editorial).slice(0, 320);
  }

  const winery = wine.winery?.name ?? "crama romaneasca";
  return `${formatWineTitle(wine)} de la ${winery} este acum in catalogul VinIntel. Poti vedea analiza completa, scorurile si recomandarile de pairing pe pagina vinului.`;
}

export async function generateWineApprovalEmailSummary(
  wine: WineApprovalEmailWine,
): Promise<string> {
  try {
    const { object } = await generateObject({
      model: getSommelierModel(),
      schema: wineApprovalEmailSummarySchema,
      system: WINE_APPROVAL_EMAIL_SYSTEM_PROMPT,
      prompt: buildWineApprovalEmailUserPrompt({
        name: wine.name,
        vintage: wine.vintage,
        wineryName: wine.winery?.name ?? null,
        regionName: wine.region?.name ?? null,
        type: wine.type,
        sweetness: wine.sweetness,
        grapeVarieties: wine.grapeVarieties.map((grape) => grape.name).join(", "),
        priceAvg: wine.priceAvg,
        valueScore: wine.valueScore,
        descriptionEditorial: wine.descriptionEditorial,
        tasteProfile: wine.tasteProfile,
      }),
      temperature: 0.45,
    });

    return sanitizeEditorialText(object.summary);
  } catch (error) {
    console.error("[wine approval email summary]", error);
    return fallbackSummary(wine);
  }
}

function buildApprovalEmailHtml(input: {
  wine: WineApprovalEmailWine;
  summary: string;
  winePageUrl: string;
  purchaseUrl: string | null;
}): string {
  const title = escapeHtml(formatWineTitle(input.wine));
  const wineryLabel = input.wine.winery?.name
    ? escapeHtml(input.wine.winery.name)
    : "";
  const summary = escapeHtml(input.summary);
  const purchaseButton = input.purchaseUrl
    ? `<p style="margin: 24px 0 0;">
    <a href="${escapeHtml(input.purchaseUrl)}" style="display: inline-block; background: #7C2D12; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;">Cumpara</a>
  </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="ro">
<body style="font-family: Georgia, serif; color: #1c1917; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #7C2D12; font-size: 22px; margin-bottom: 8px;">Vinul tau este live pe VinIntel.ro</h1>
  <p style="margin-top: 0; color: #57534e;">Multumim ca l-ai trimis spre verificare. ${title}${wineryLabel ? ` (${wineryLabel})` : ""} a fost aprobat.</p>
  <p style="margin: 20px 0; color: #44403c;">${summary}</p>
  <p style="margin: 24px 0;">
    <a href="${escapeHtml(input.winePageUrl)}" style="display: inline-block; background: #7C2D12; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 14px;">Vezi pagina vinului</a>
  </p>
  ${purchaseButton}
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0;" />
  <p style="font-size: 12px; color: #a8a29e;">Ai primit acest email pentru ca ai trimis un vin spre verificare pe VinIntel.ro.</p>
</body>
</html>`;
}

function buildApprovalEmailText(input: {
  wine: WineApprovalEmailWine;
  summary: string;
  winePageUrl: string;
  purchaseUrl: string | null;
}): string {
  const lines = [
    `Vinul tau este live pe VinIntel.ro - ${formatWineTitle(input.wine)}`,
    "",
    input.summary,
    "",
    `Pagina vinului: ${input.winePageUrl}`,
  ];

  if (input.purchaseUrl) {
    lines.push(`Cumpara: ${input.purchaseUrl}`);
  }

  lines.push(
    "",
    "Ai primit acest email pentru ca ai trimis un vin spre verificare pe VinIntel.ro.",
  );

  return lines.join("\n");
}

export async function sendWineApprovalEmail(
  wine: WineApprovalEmailWine,
  toEmail: string,
): Promise<{ sent: boolean; skippedReason?: string }> {
  const apiKey = envOrUndefined("RESEND_API_KEY");
  if (!apiKey) {
    console.info("[WINE APPROVAL EMAIL] skipped: RESEND_API_KEY not set");
    return { sent: false, skippedReason: "missing_resend_api_key" };
  }

  const fromEmail = getResendFromEmail();

  const summary = await generateWineApprovalEmailSummary(wine);
  const winePageUrl = buildWinePageUrl(wine.slug);
  const purchaseUrl = resolveAffiliatePurchaseUrl({
    sourceUrl: wine.sourceUrl,
    affiliateLinks: wine.affiliateLinks,
    availability: wine.availability,
  });

  const resend = new Resend(apiKey);
  const subject = `Vinul tau este live: ${formatWineTitle(wine)} | VinIntel.ro`;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: buildApprovalEmailHtml({
        wine,
        summary,
        winePageUrl,
        purchaseUrl,
      }),
      text: buildApprovalEmailText({
        wine,
        summary,
        winePageUrl,
        purchaseUrl,
      }),
    });

    if (error) {
      console.error("[WINE APPROVAL EMAIL] send failed", error);
      return { sent: false, skippedReason: "resend_error" };
    }

    console.info("[WINE APPROVAL EMAIL] sent", {
      wineId: wine.id,
      to: toEmail,
    });
    return { sent: true };
  } catch (error) {
    console.error("[WINE APPROVAL EMAIL] unexpected error", error);
    return { sent: false, skippedReason: "unexpected_error" };
  }
}
