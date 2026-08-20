"use server";

import {
  sendContactFormEmail,
  type ContactFormKind,
  type ContactFormSubmission,
} from "@/lib/contact-form-email";
import { verifyInteractiveRequest } from "@/lib/security/bot-id";

export interface SubmitContactFormResult {
  ok: boolean;
  error?: string;
}

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitContactForm(
  kind: ContactFormKind,
  formData: FormData,
): Promise<SubmitContactFormResult> {
  const bot = await verifyInteractiveRequest("deepAnalysis");
  if (!bot.allowed) {
    return {
      ok: false,
      error: "Solicitarea automata nu este permisa.",
    };
  }

  const contactName = clean(formData.get("contactName") ?? formData.get("name"));
  const email = clean(formData.get("email"));
  const wineryName = clean(formData.get("winery") ?? formData.get("wineryName"));
  const wineName = clean(formData.get("wineName"));
  const role = clean(formData.get("role"));
  const phone = clean(formData.get("phone"));
  const website = clean(formData.get("website"));
  const message = clean(formData.get("message"));

  if (!contactName || !email || !wineryName) {
    return { ok: false, error: "Completeaza campurile obligatorii." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "Adresa de email nu pare valida." };
  }

  if (kind === "winery_verification" && !wineName) {
    return { ok: false, error: "Lipseste numele vinului pentru verificare." };
  }

  const payload: ContactFormSubmission = {
    kind,
    contactName,
    email,
    wineryName,
    ...(wineName ? { wineName } : {}),
    ...(role ? { role } : {}),
    ...(phone ? { phone } : {}),
    ...(website ? { website } : {}),
    ...(message ? { message } : {}),
  };

  const result = await sendContactFormEmail(payload);
  if (!result.sent) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
