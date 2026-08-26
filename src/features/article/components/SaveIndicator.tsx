import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useI18n } from "../../../shared/hooks/useI18n";
import { ARTICLE_LIMITS } from "../api/article.types";
import type { DraftProblem, SaveState } from "../hooks/useArticleEditor";

interface SaveIndicatorProps {
    state: SaveState;
    isDirty: boolean;
    /** What is stopping the draft from being sent, or `null` when nothing is. */
    problem: DraftProblem | null;
    error: string | null;
    onRetry: () => void;
}

/**
 * Autosave is invisible by design, which is exactly why it needs saying out
 * loud: a writer who cannot tell whether their work is safe will not trust the
 * editor. The failure branch carries a retry, because a silent failed save is
 * the one state where the writer would lose work without knowing.
 */
export function SaveIndicator({
    state,
    isDirty,
    problem,
    error,
    onRetry,
}: SaveIndicatorProps) {
    const { t } = useI18n();

    if (state === "error") {
        return (
            <span className="flex items-center gap-1.5 text-xs text-red-400/80">
                <AlertCircle size={13} />
                {error ?? t("editor.saveFailed")}
                <button
                    type="button"
                    onClick={onRetry}
                    className="underline transition-colors hover:text-red-300"
                >
                    {t("editor.retrySave")}
                </button>
            </span>
        );
    }

    if (state === "saving") {
        return (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Loader2 size={13} className="animate-spin" />
                {t("editor.saving")}
            </span>
        );
    }

    // Nothing reaches the server while a limit is breached, so name the one
    // that is — "unsaved changes" would be true and useless, and the server's
    // own answer is a bare 400 or 413 that names nothing.
    if (problem !== null) {
        const message =
            problem === "empty"
                ? t("editor.needsTitleAndBody")
                : problem === "titleTooLong"
                  ? t("editor.titleTooLong", { max: ARTICLE_LIMITS.titleMax })
                  : problem === "bodyTooLong"
                    ? t("editor.bodyTooLong", { max: ARTICLE_LIMITS.bodyMax })
                    : t("editor.tooLarge");

        return (
            <span
                className={`text-xs ${problem === "empty" ? "text-white/30" : "text-red-400/80"}`}
            >
                {message}
            </span>
        );
    }

    if (isDirty) {
        return (
            <span className="text-xs text-white/40">{t("editor.unsaved")}</span>
        );
    }

    if (state === "saved") {
        return (
            <span className="flex items-center gap-1.5 text-xs text-white/40">
                <Check size={13} />
                {t("editor.saved")}
            </span>
        );
    }

    return null;
}
