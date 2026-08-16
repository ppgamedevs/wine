import { isPublicationBlockingIssue, type IntegrityIssue } from "@/lib/integrity-scan";
import { TRUTH_ISSUE_CODES } from "@/lib/editorial-claim-validator";
import { SOURCE_CONFLICT_CODES } from "@/lib/source-conflicts";
import {
  classifySourceUrl,
  isOfficialProducerSource,
} from "@/lib/source-trust";

export type RecoveryStatus =
  | "evidence_recoverable"
  | "no_source_evidence"
  | "source_conflict"
  | "ready_for_cleanup"
  | "human_review";

export type RecommendedAction =
  | "KEEP"
  | "REMOVE SENTENCE"
  | "HUMAN REVIEW"
  | "REFRESH SOURCE";

const DETERMINISTIC_CLEANUP_CODES = new Set<string>([
  TRUTH_ISSUE_CODES.UNSUPPORTED_TANNIN_CLAIM,
  TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_CLAIM,
  TRUTH_ISSUE_CODES.UNSUPPORTED_OAK_DETAIL,
  TRUTH_ISSUE_CODES.TYPE_EDITORIAL_CONTRADICTION,
  TRUTH_ISSUE_CODES.SWEETNESS_EDITORIAL_CONTRADICTION,
  TRUTH_ISSUE_CODES.PAIRING_REASON_UNSUPPORTED,
  TRUTH_ISSUE_CODES.PAIRING_CONTRADICTS_WINE_TYPE,
  TRUTH_ISSUE_CODES.EDITORIAL_PAIRING_UNSUPPORTED,
]);

const CONFLICT_CODES = new Set<string>(Object.values(SOURCE_CONFLICT_CODES));

export function hasOfficialStoredSource(input: {
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  sourceUrl?: string | null;
}): boolean {
  const urls = [input.producerPageUrl, input.tastingSheetUrl, input.sourceUrl];
  return urls.some((url) => isOfficialProducerSource(classifySourceUrl(url)));
}

export function classifyRecoveryStatus(input: {
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  sourceUrl?: string | null;
  tastingNotes?: string | null;
  producerContentText?: boolean;
  issues: IntegrityIssue[];
}): RecoveryStatus {
  if (input.issues.some((issue) => CONFLICT_CODES.has(issue.code))) {
    return "source_conflict";
  }

  const official = hasOfficialStoredSource(input);
  const hasText =
    Boolean(input.tastingNotes?.trim()) || input.producerContentText === true;
  const blocking = input.issues.filter(isPublicationBlockingIssue);

  if (official && blocking.length > 0) {
    return "evidence_recoverable";
  }

  if (!official && !hasText && blocking.length > 0) {
    return "no_source_evidence";
  }

  if (
    blocking.length > 0 &&
    blocking.every((issue) => DETERMINISTIC_CLEANUP_CODES.has(issue.code))
  ) {
    return "ready_for_cleanup";
  }

  return "human_review";
}

export function evidenceStatusLabel(input: {
  producerPageUrl?: string | null;
  tastingSheetUrl?: string | null;
  producerContentText?: boolean;
  tastingNotes?: string | null;
}): string {
  if (input.tastingSheetUrl?.trim()) return "Fisa de degustare gasita";
  if (input.producerPageUrl?.trim() && input.producerContentText) {
    return "Pagina producator gasita";
  }
  if (input.producerPageUrl?.trim()) return "URL producator stocat, text incomplet";
  if (input.tastingNotes?.trim()) return "Note de degustare stocate";
  return "Fara evidenta de sursa";
}

export function recommendIssueAction(input: {
  issue: IntegrityIssue;
  officialSource: boolean;
  evidenceResolved: boolean;
}): RecommendedAction {
  if (input.evidenceResolved) return "KEEP";
  if (CONFLICT_CODES.has(input.issue.code)) return "HUMAN REVIEW";
  if (input.officialSource && !input.issue.evidenceSummary?.includes("producer")) {
    return "REFRESH SOURCE";
  }
  if (DETERMINISTIC_CLEANUP_CODES.has(input.issue.code)) return "REMOVE SENTENCE";
  return "HUMAN REVIEW";
}
