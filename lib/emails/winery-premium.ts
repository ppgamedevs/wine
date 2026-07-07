import "server-only";
import { Resend } from "resend";
import { envOrUndefined } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo";
import { getPremiumPlan } from "@/lib/stripe/premium-plans";
import type { PremiumCheckoutPlan } from "@/lib/schema";
import { getContactFormEmail, getResendFromEmail } from "@/lib/site-email";

const WINE = "#7C2D12";
const CREAM = "#faf7f5";

export interface PremiumEmailContext {
  email: string;
  wineryName: string;
  winerySlug: string | null;
  plan: PremiumCheckoutPlan;
  startedAt: Date;
  expiresAt: Date;
  hasActiveStripeSubscription?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function computePremiumExpiryDate(
  plan: PremiumCheckoutPlan,
  start: Date,
): Date {
  const expires = new Date(start);
  if (plan === "monthly") {
    expires.setMonth(expires.getMonth() + 1);
  } else {
    expires.setFullYear(expires.getFullYear() + 1);
  }
  return expires;
}

export function formatPremiumDate(date: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function toSqlTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function dashboardUrl(ctx: PremiumEmailContext): string {
  if (ctx.winerySlug) {
    return absoluteUrl(`/wineries/${ctx.winerySlug}/dashboard`);
  }
  return absoluteUrl("/crame");
}

function renewUrl(ctx: PremiumEmailContext): string {
  if (ctx.hasActiveStripeSubscription && ctx.winerySlug) {
    return absoluteUrl(
      `/wineries/premium/manage?crama=${encodeURIComponent(ctx.winerySlug)}`,
    );
  }

  const params = new URLSearchParams({ plan: ctx.plan });
  if (ctx.winerySlug) params.set("crama", ctx.winerySlug);
  return absoluteUrl(`/wineries/premium/checkout?${params.toString()}`);
}

function renewButtonLabel(ctx: PremiumEmailContext): string {
  return ctx.hasActiveStripeSubscription
    ? "Gestioneaza abonamentul"
    : "Reinnoieste abonamentul";
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};font-family:Georgia,'Times New Roman',serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${CREAM};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${WINE};padding:20px 28px;">
              <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#fde8e0;">VinIntel Premium</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e7e5e4;">
              <p style="margin:0;font-size:12px;color:#78716c;line-height:1.5;">
                VinIntel.ro | Premium Profile pentru crame romanesti<br />
                Raspunde la acest email daca ai intrebari.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:14px 24px;background:${WINE};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">${escapeHtml(label)}</a>`;
}

function benefitsList(): string {
  return `<ul style="margin:16px 0 0;padding-left:20px;color:#44403c;line-height:1.7;">
    <li>Banner si poveste editoriala personalizata</li>
    <li>Calendar evenimente si analytics</li>
    <li>Lead capture si prioritate in AI Sommelier</li>
    <li>Featured placement in catalogul VinIntel</li>
  </ul>`;
}

async function sendPremiumEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ sent: boolean }> {
  const apiKey = envOrUndefined("RESEND_API_KEY");
  if (!apiKey) {
    console.info("[WINERY PREMIUM EMAIL] skipped: RESEND_API_KEY not set");
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: getResendFromEmail(),
      to: [input.to],
      bcc: [getContactFormEmail()],
      replyTo: getContactFormEmail(),
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { sent: true };
  } catch (error) {
    console.error("[WINERY PREMIUM EMAIL] send failed", error);
    return { sent: false };
  }
}

export async function sendPremiumWelcomeEmail(
  ctx: PremiumEmailContext,
): Promise<{ sent: boolean }> {
  const planDef = getPremiumPlan(ctx.plan);
  const profileUrl = dashboardUrl(ctx);
  const subject = `Bine ai venit in programul Premium, ${ctx.wineryName}!`;

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:24px;color:${WINE};">Bine ai venit in Premium</h1>
    <p style="margin:0 0 16px;line-height:1.7;color:#44403c;">
      Plata pentru <strong>${escapeHtml(ctx.wineryName)}</strong> (${escapeHtml(planDef.priceLabel)}) a fost confirmata.
      Abonamentul tau Premium este activ.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:13px;color:#78716c;">Data de incepere</p>
          <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1c1917;">${escapeHtml(formatPremiumDate(ctx.startedAt))}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#78716c;">Data de expirare</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#1c1917;">${escapeHtml(formatPremiumDate(ctx.expiresAt))}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;color:#44403c;">Beneficiile tale Premium:</p>
    ${benefitsList()}
    ${button("Deschide dashboard-ul Premium", profileUrl)}
  `;

  const text = [
    subject,
    "",
    `Plata confirmata: ${planDef.priceLabel}.`,
    `Incepere: ${formatPremiumDate(ctx.startedAt)}`,
    `Expirare: ${formatPremiumDate(ctx.expiresAt)}`,
    `Profil: ${profileUrl}`,
  ].join("\n");

  return sendPremiumEmail({ to: ctx.email, subject, html: emailShell(subject, bodyHtml), text });
}

export async function sendPremiumExpiryReminderEmail(
  ctx: PremiumEmailContext,
): Promise<{ sent: boolean }> {
  const renew = renewUrl(ctx);
  const subject = "Abonamentul Premium expira in curand";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:24px;color:${WINE};">Reminder Premium</h1>
    <p style="margin:0 0 16px;line-height:1.7;color:#44403c;">
      Abonamentul Premium pentru <strong>${escapeHtml(ctx.wineryName)}</strong> expira pe
      <strong>${escapeHtml(formatPremiumDate(ctx.expiresAt))}</strong> (peste 7 zile).
    </p>
    <p style="margin:0;line-height:1.7;color:#44403c;">
      Reinnoieste acum ca sa pastrezi bannerul personalizat, analytics, calendarul de evenimente
      si prioritatea in AI Sommelier.
    </p>
    ${button(renewButtonLabel(ctx), renew)}
  `;

  const text = [
    subject,
    "",
    `Expirare: ${formatPremiumDate(ctx.expiresAt)}`,
    `Reinnoire: ${renew}`,
  ].join("\n");

  return sendPremiumEmail({ to: ctx.email, subject, html: emailShell(subject, bodyHtml), text });
}

export async function sendPremiumExpiredEmail(
  ctx: PremiumEmailContext,
): Promise<{ sent: boolean }> {
  const renew = renewUrl(ctx);
  const subject = "Abonamentul Premium a expirat";

  const bodyHtml = `
    <h1 style="margin:0 0 12px;font-size:24px;color:${WINE};">Abonament expirat</h1>
    <p style="margin:0 0 16px;line-height:1.7;color:#44403c;">
      Abonamentul Premium pentru <strong>${escapeHtml(ctx.wineryName)}</strong> a expirat
      (${escapeHtml(formatPremiumDate(ctx.expiresAt))}).
    </p>
    <p style="margin:0 0 16px;line-height:1.7;color:#44403c;">
      Profilul revine la varianta standard: fara banner custom, fara analytics si fara featured placement.
      Datele tale raman salvate si poti reactiva Premium oricand.
    </p>
    ${button("Reactiveaza Premium", renewUrl({ ...ctx, hasActiveStripeSubscription: false }))}
  `;

  const text = [
    subject,
    "",
    `Expirat la: ${formatPremiumDate(ctx.expiresAt)}`,
    `Reactivare: ${renew}`,
  ].join("\n");

  return sendPremiumEmail({ to: ctx.email, subject, html: emailShell(subject, bodyHtml), text });
}
