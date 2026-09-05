import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "./ReportModal";
import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { useI18n } from "../../../shared/hooks/useI18n";
import type { ReportTargetKind } from "../api/report.types";

interface ReportButtonProps {
    targetKind: ReportTargetKind;
    targetId: string;
}

/**
 * The report control on a post or a comment card.
 *
 * It sits where the delete control sits on your own content, and the two are
 * mutually exclusive: you delete what is yours and report what is not. The
 * API answers a report of your own content with a 400, so the card decides
 * this rather than offering it and being refused.
 *
 * The click stops propagating because both cards are themselves clickable —
 * without it, opening the dialog would also open the post underneath it.
 */
export function ReportButton({ targetKind, targetId }: ReportButtonProps) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openAuthModal = useAuthModalStore((state) => state.openModal);

    function handleOpen(event: React.MouseEvent) {
        event.stopPropagation();
        if (!isAuthenticated) {
            openAuthModal();
            return;
        }
        setIsOpen(true);
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                aria-label={t("report.action")}
                title={t("report.action")}
                className="flex items-center gap-1 rounded-full px-1.5 py-1.5 text-ink/40 transition-colors hover:bg-red-500/10 hover:text-red-400 sm:gap-1.5 sm:px-2"
            >
                <Flag className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Mounted only while open, so nine radios and a textarea are not
                kept alive behind every card in a feed. */}
            {isOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                    <ReportModal
                        isOpen={isOpen}
                        onClose={() => setIsOpen(false)}
                        targetKind={targetKind}
                        targetId={targetId}
                    />
                </div>
            )}
        </>
    );
}
