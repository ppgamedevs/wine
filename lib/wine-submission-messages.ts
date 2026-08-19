export const EXISTING_WINE_CATALOG_MESSAGE =
  "Vinul exista deja in baza noastra. Vezi-l aici:";

export const WINE_PENDING_REVIEW_MESSAGE =
  "Vinul nu este in baza noastra de date. Vinul a fost trimis spre verificare. Va aparea pe site dupa aprobare.";

export const WINE_ALREADY_PENDING_MESSAGE =
  "Acest vin a fost deja trimis spre verificare. Va aparea pe site dupa aprobare.";

export function localizeWineSubmissionMessage(
  message: string | undefined,
  locale: "ro" | "en",
  status: "existing" | "created" | "updated" | "rejected" | "pending_review",
): string | undefined {
  if (locale === "ro" || message == null) return message;
  if (message === EXISTING_WINE_CATALOG_MESSAGE) {
    return "This wine is already in our catalog. View it here:";
  }
  if (message === WINE_PENDING_REVIEW_MESSAGE) {
    return "This wine is not yet in our catalog. It was submitted for verification and will appear after approval.";
  }
  if (message === WINE_ALREADY_PENDING_MESSAGE) {
    return "This wine has already been submitted for verification and will appear after approval.";
  }
  if (status === "rejected") {
    return "We could not accept this wine URL. Check that it points to a Romanian wine product page.";
  }
  return message;
}
