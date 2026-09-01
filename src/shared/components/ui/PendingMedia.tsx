import { Clock, RefreshCw } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

interface PendingMediaProps {
    /**
     * Omitted where there is nothing to refresh into — the embedded card of a
     * quote reads a post the list does not own, so it shows the wait without
     * offering to end it.
     */
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

/**
 * Stands in for a video that is uploaded but not yet checked.
 *
 * The item arrives with `mediaUrls: []` while this is true, which is
 * indistinguishable from an item that never had media — `mediaPending` is the
 * only thing that tells them apart, so this placeholder is the only signal
 * that anything is coming.
 *
 * Checking runs about once a minute, so the wait is short but long enough that
 * an author who sees nothing assumes their post failed.
 */
export function PendingMedia({ onRefresh, isRefreshing }: PendingMediaProps) {
    const { t } = useI18n();

    return (
        <div className="mt-3 flex flex-col items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-surface-1 px-4 py-8">
            <Clock size={20} className="text-ink/40" aria-hidden="true" />
            <p className="text-sm text-ink/60">{t("media.processing")}</p>
            {onRefresh && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRefresh();
                    }}
                    disabled={isRefreshing}
                    className="mt-1 flex items-center gap-1.5 rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50"
                >
                    <RefreshCw
                        size={13}
                        aria-hidden="true"
                        className={isRefreshing ? "animate-spin" : undefined}
                    />
                    {t("media.refresh")}
                </button>
            )}
        </div>
    );
}
