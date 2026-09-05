/**
 * What may be reported. Posts and comments only — an account is dealt with by
 * blocking it, and a direct message is not public content, so reporting one
 * would mean handing its plaintext to an operator.
 */
export type ReportTargetKind = "POST" | "COMMENT";

/**
 * The nine reasons the API accepts. Sent verbatim; the labels beside them are
 * ours to translate, the values are not.
 */
export type ReportReason =
    | "SPAM"
    | "HARASSMENT"
    | "HATE"
    | "SEXUAL"
    | "VIOLENCE"
    | "SELF_HARM"
    | "MISINFORMATION"
    | "ILLEGAL"
    | "OTHER";

/**
 * The order the reasons are offered in, and the only place that order lives.
 */
export const REPORT_REASONS: ReportReason[] = [
    "SPAM",
    "HARASSMENT",
    "HATE",
    "SEXUAL",
    "VIOLENCE",
    "SELF_HARM",
    "MISINFORMATION",
    "ILLEGAL",
    "OTHER",
];

/**
 * `details` is validated as 1–500 characters when present. Mirrored in the
 * composer so the API's 400 stays unreachable, the same way the message
 * composer mirrors its character cap.
 */
export const REPORT_DETAILS_MAX_LENGTH = 500;

export interface CreateReportBody {
    targetKind: ReportTargetKind;
    targetId: string;
    reason: ReportReason;
    /** Omitted entirely when empty — an empty string is a 400, not a blank. */
    details?: string;
}

/**
 * The whole answer, and deliberately so.
 *
 * It says nothing about how many others reported the same thing, whether a
 * threshold was crossed, or what happened next: the endpoint must not be
 * usable as a way of measuring moderation from outside. Reporting the same
 * content twice answers identically, which is why there is nothing here for a
 * client to remember.
 */
export interface CreateReportResponse {
    received: boolean;
}
