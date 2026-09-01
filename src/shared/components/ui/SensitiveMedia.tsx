import { useState } from "react";
import { EyeOff } from "lucide-react";
import { useI18n } from "../../hooks/useI18n";

interface SensitiveMediaProps {
    /**
     * Taken rather than assumed, so the three call sites wrap their media
     * unconditionally instead of each repeating the same ternary — and so
     * adding a fourth cannot forget the cover.
     */
    isSensitive: boolean;
    children: React.ReactNode;
}

/**
 * The cover over media the server flagged `isSensitive`.
 *
 * ---------------------------------------------------------------------------
 * Why violent media reaches this component rather than being deleted
 * ---------------------------------------------------------------------------
 * Moderation refuses sexual content, gore, self-harm and hate symbols outright
 * — those never get a URL and never arrive here. Violence and weapons are
 * deliberately *not* refused; they are flagged and land under this cover
 * instead. This is a developers' platform and it is full of game screenshots,
 * and a filter that deletes those is a filter people spend their time working
 * around. So when someone asks why violence is not blocked: it is a decision,
 * not a gap.
 * ---------------------------------------------------------------------------
 *
 * The flag is content-level, so this wraps the whole media block rather than
 * one file — the server does not say which attachment it was.
 *
 * Revealing is per card and lasts as long as the card is mounted. Nothing is
 * written down: a reader who scrolls back to a post they uncovered gets the
 * cover again, which is the safer way round for a decision this cheap to
 * repeat.
 */
export function SensitiveMedia({ isSensitive, children }: SensitiveMediaProps) {
    const [isRevealed, setIsRevealed] = useState(false);
    const { t } = useI18n();

    if (!isSensitive || isRevealed) return <>{children}</>;

    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/*
             * `scale-110` because a blur samples past the edges of its element
             * and leaves a sharp rim of the original otherwise — on a photo
             * that is exactly the part being covered up. Hidden from the
             * accessibility tree and from the pointer: it is scenery, and the
             * button on top of it is the control.
             */}
            <div
                className="pointer-events-none scale-110 blur-2xl"
                aria-hidden="true"
            >
                {children}
            </div>
            <button
                type="button"
                onClick={(e) => {
                    // The card underneath navigates on click.
                    e.stopPropagation();
                    setIsRevealed(true);
                }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-scrim/50 text-on-fill transition-colors hover:bg-scrim/60"
            >
                <EyeOff size={20} aria-hidden="true" />
                <span className="text-sm font-semibold">
                    {t("media.sensitive")}
                </span>
                <span className="text-xs opacity-80">
                    {t("media.sensitiveReveal")}
                </span>
            </button>
        </div>
    );
}
