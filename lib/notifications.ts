import "server-only";
import { Resend } from "resend";
import { absoluteUrl } from "@/lib/seo";
import { envOrUndefined } from "@/lib/env";
import {
  getReportNotificationEmail,
  getResendFromEmail,
} from "@/lib/site-email";

export interface WineReportLogPayload {
  wineId: number;
  wineName: string;
  wineSlug: string;
  producer: string | null;
  reason: string | null;
  submittedBy: string;
  reportCount: number;
  reportId: number;
  timestamp: string;
}

export interface WineReportNotificationWine {
  id: number;
  name: string;
  slug: string;
  reportCount: number;
  producer: string | null;
}

export interface WineReportNotificationReport {
  id: number;
  reason: string | null;
  submittedBy: string;
  createdAt: string;
}

/** Default true unless explicitly disabled. */
export function isReportNotificationsEnabled(): boolean {
  const value = process.env.ENABLE_REPORT_NOTIFICATIONS?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "no") {
    return false;
  }
  return true;
}

export function logWineReport(payload: WineReportLogPayload): void {
  console.log("[WINE REPORT]", payload);
}

function buildAdminWineUrl(wineId: number): string {
  return absoluteUrl(`/admin/wines?tab=reports&wineId=${wineId}`);
}

function buildWinePageUrl(slug: string): string {
  return absoluteUrl(`/wines/${slug}`);
}

function buildReportEmailHtml(
  wine: WineReportNotificationWine,
  report: WineReportNotificationReport,
): string {
  const adminUrl = buildAdminWineUrl(wine.id);
  const wineUrl = buildWinePageUrl(wine.slug);
  const reason = report.reason?.trim() || "Fara detalii";
  const producer = wine.producer?.trim() || "Necunoscut";
  const submittedBy = report.submittedBy?.trim() || "anonymous";

  return `<!DOCTYPE html>
<html lang="ro">
<body style="font-family: Georgia, serif; color: #1c1917; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #7C2D12; font-size: 22px; margin-bottom: 8px;">Raport nou pe VinIntel.ro</h1>
  <p style="margin-top: 0; color: #57534e;">Un utilizator a raportat o problema la un vin din catalog.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
    <tr><td style="padding: 8px 0; color: #78716c; width: 140px;">Vin</td><td style="padding: 8px 0;"><strong>${escapeHtml(wine.name)}</strong></td></tr>
    <tr><td style="padding: 8px 0; color: #78716c;">Producator</td><td style="padding: 8px 0;">${escapeHtml(producer)}</td></tr>
    <tr><td style="padding: 8px 0; color: #78716c;">Motiv</td><td style="padding: 8px 0;">${escapeHtml(reason)}</td></tr>
    <tr><td style="padding: 8px 0; color: #78716c;">Raportat de</td><td style="padding: 8px 0;">${escapeHtml(submittedBy)}</td></tr>
    <tr><td style="padding: 8px 0; color: #78716c;">Total rapoarte</td><td style="padding: 8px 0;">${wine.reportCount}</td></tr>
  </table>
  <p style="margin: 24px 0;">
    <a href="${adminUrl}" style="display: inline-block; background: #7C2D12; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 14px;">Vezi in Panel Admin</a>
    &nbsp;
    <a href="${wineUrl}" style="display: inline-block; color: #7C2D12; text-decoration: underline; font-family: system-ui, sans-serif; font-size: 14px;">Pagina vinului</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0;" />
  <p style="font-size: 12px; color: #a8a29e;">Ai primit acest email pentru ca ai activat notificarile pentru rapoarte pe VinIntel.ro.</p>
</body>
</html>`;
}

function buildReportEmailText(
  wine: WineReportNotificationWine,
  report: WineReportNotificationReport,
): string {
  const adminUrl = buildAdminWineUrl(wine.id);
  const reason = report.reason?.trim() || "Fara detalii";
  const producer = wine.producer?.trim() || "Necunoscut";
  const submittedBy = report.submittedBy?.trim() || "anonymous";

  return [
    `Raport nou pe VinIntel.ro - ${wine.name}`,
    "",
    `Vin: ${wine.name} (${producer})`,
    `Motiv raport: ${reason}`,
    `Raportat de: ${submittedBy}`,
    `Total rapoarte: ${wine.reportCount}`,
    "",
    `Link admin: ${adminUrl}`,
    "",
    "Ai primit acest email pentru ca ai activat notificarile pentru rapoarte.",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendWineReportNotification(
  wine: WineReportNotificationWine,
  report: WineReportNotificationReport,
): Promise<{ sent: boolean; skippedReason?: string }> {
  if (!isReportNotificationsEnabled()) {
    console.info("[WINE REPORT EMAIL] skipped: ENABLE_REPORT_NOTIFICATIONS=false");
    return { sent: false, skippedReason: "notifications_disabled" };
  }

  const apiKey = envOrUndefined("RESEND_API_KEY");
  const toEmail = getReportNotificationEmail();

  if (!apiKey) {
    console.info("[WINE REPORT EMAIL] skipped: RESEND_API_KEY not set");
    return { sent: false, skippedReason: "missing_resend_api_key" };
  }

  if (!toEmail) {
    console.info(
      "[WINE REPORT EMAIL] skipped: REPORT_NOTIFICATION_EMAIL not set",
    );
    return { sent: false, skippedReason: "missing_recipient" };
  }

  const fromEmail = getResendFromEmail();

  const resend = new Resend(apiKey);
  const subject = `Raport nou pe VinIntel.ro - ${wine.name}`;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: buildReportEmailHtml(wine, report),
      text: buildReportEmailText(wine, report),
    });

    if (error) {
      console.error("[WINE REPORT EMAIL] send failed", error);
      return { sent: false, skippedReason: "resend_error" };
    }

    console.info("[WINE REPORT EMAIL] sent", {
      wineId: wine.id,
      to: toEmail,
      reportId: report.id,
    });
    return { sent: true };
  } catch (error) {
    console.error("[WINE REPORT EMAIL] unexpected error", error);
    return { sent: false, skippedReason: "unexpected_error" };
  }
}

export async function notifyWineReport(
  wine: WineReportNotificationWine,
  report: WineReportNotificationReport,
): Promise<void> {
  logWineReport({
    wineId: wine.id,
    wineName: wine.name,
    wineSlug: wine.slug,
    producer: wine.producer,
    reason: report.reason,
    submittedBy: report.submittedBy,
    reportCount: wine.reportCount,
    reportId: report.id,
    timestamp: new Date().toISOString(),
  });

  await sendWineReportNotification(wine, report);
}
