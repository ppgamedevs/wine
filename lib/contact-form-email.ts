import "server-only";
import { Resend } from "resend";
import { envOrUndefined } from "@/lib/env";
import {
  getContactFormEmail,
  getResendFromEmail,
} from "@/lib/site-email";

export type ContactFormKind =
  | "winery_claim"
  | "winery_verification"
  | "winery_premium";

export interface ContactFormSubmission {
  kind: ContactFormKind;
  contactName: string;
  email: string;
  wineryName: string;
  wineName?: string;
  role?: string;
  phone?: string;
  website?: string;
  message?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(label: string, value: string): string {
  return `<tr><td style="padding: 8px 0; color: #78716c; width: 160px;">${escapeHtml(label)}</td><td style="padding: 8px 0;">${escapeHtml(value)}</td></tr>`;
}

function buildSubject(input: ContactFormSubmission): string {
  if (input.kind === "winery_premium") {
    return `Premium Profile: ${input.wineryName} | VinIntel.ro`;
  }
  if (input.kind === "winery_claim") {
    return `Revendicare crama: ${input.wineryName} | VinIntel.ro`;
  }
  return `Verificare crama: ${input.wineryName} | VinIntel.ro`;
}

function kindLabel(kind: ContactFormSubmission["kind"]): string {
  if (kind === "winery_premium") return "Premium Profile";
  if (kind === "winery_claim") return "Revendicare";
  return "Verificare";
}

function buildHtml(input: ContactFormSubmission): string {
  const title =
    input.kind === "winery_premium"
      ? "Cerere noua Premium Profile"
      : input.kind === "winery_claim"
        ? "Cerere noua de revendicare crama"
        : "Cerere noua de verificare crama";

  const rows = [
    row("Tip", kindLabel(input.kind)),
    row("Crama", input.wineryName),
    ...(input.wineName ? [row("Vin", input.wineName)] : []),
    row("Nume contact", input.contactName),
    row("Email", input.email),
    ...(input.role ? [row("Rol", input.role)] : []),
    ...(input.phone ? [row("Telefon", input.phone)] : []),
    ...(input.website ? [row("Website / CUI", input.website)] : []),
    ...(input.message ? [row("Mesaj", input.message)] : []),
  ].join("");

  return `<!DOCTYPE html>
<html lang="ro">
<body style="font-family: Georgia, serif; color: #1c1917; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #7C2D12; font-size: 22px; margin-bottom: 8px;">${escapeHtml(title)}</h1>
  <p style="margin-top: 0; color: #57534e;">Formular trimis de pe VinIntel.ro.</p>
  <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">${rows}</table>
  <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0;" />
  <p style="font-size: 12px; color: #a8a29e;">Raspunde direct la ${escapeHtml(input.email)} pentru follow-up.</p>
</body>
</html>`;
}

function buildText(input: ContactFormSubmission): string {
  const lines = [
    buildSubject(input),
    "",
    `Tip: ${input.kind}`,
    `Crama: ${input.wineryName}`,
  ];
  if (input.wineName) lines.push(`Vin: ${input.wineName}`);
  lines.push(
    `Nume: ${input.contactName}`,
    `Email: ${input.email}`,
  );
  if (input.role) lines.push(`Rol: ${input.role}`);
  if (input.phone) lines.push(`Telefon: ${input.phone}`);
  if (input.website) lines.push(`Website / CUI: ${input.website}`);
  if (input.message) lines.push(`Mesaj: ${input.message}`);
  return lines.join("\n");
}

export async function sendContactFormEmail(
  input: ContactFormSubmission,
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = envOrUndefined("RESEND_API_KEY");
  if (!apiKey) {
    console.info("[CONTACT FORM EMAIL] skipped: RESEND_API_KEY not set");
    return { sent: false, error: "Serviciul de email nu este configurat." };
  }

  const toEmail = getContactFormEmail();
  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: getResendFromEmail(),
      to: [toEmail],
      replyTo: input.email,
      subject: buildSubject(input),
      html: buildHtml(input),
      text: buildText(input),
    });

    if (error) {
      console.error("[CONTACT FORM EMAIL] send failed", error);
      return { sent: false, error: "Nu am putut trimite mesajul. Incearca din nou." };
    }

    console.info("[CONTACT FORM EMAIL] sent", {
      kind: input.kind,
      to: toEmail,
      winery: input.wineryName,
    });
    return { sent: true };
  } catch (error) {
    console.error("[CONTACT FORM EMAIL] unexpected error", error);
    return { sent: false, error: "Nu am putut trimite mesajul. Incearca din nou." };
  }
}
