import "server-only";
import { envOrUndefined } from "@/lib/env";

const DEFAULT_FROM = "VinIntel <noreply@vinintel.ro>";
const DEFAULT_INBOX = "somelier@vinintel.ro";

export function getResendFromEmail(): string {
  return envOrUndefined("RESEND_FROM_EMAIL") ?? DEFAULT_FROM;
}

/** Destinatar pentru rapoarte vin / notificari interne. */
export function getReportNotificationEmail(): string | undefined {
  return envOrUndefined("REPORT_NOTIFICATION_EMAIL") ?? DEFAULT_INBOX;
}

/** Destinatar pentru formularele de pe site (revendicare, verificare crama). */
export function getContactFormEmail(): string {
  return envOrUndefined("CONTACT_FORM_EMAIL") ?? DEFAULT_INBOX;
}
