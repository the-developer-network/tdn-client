import { useState } from "react";
import { Modal } from "../../../shared/components/ui/Modal";
import { Button } from "../../../shared/components/ui/Button";
import { useReport } from "../hooks/useReport";
import { useToastStore } from "../../../shared/store/toast.store";
import { useI18n } from "../../../shared/hooks/useI18n";
import {
    REPORT_DETAILS_MAX_LENGTH,
    REPORT_REASONS,
    type ReportReason,
    type ReportTargetKind,
} from "../api/report.types";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetKind: ReportTargetKind;
    targetId: string;
}

/**
 * The report form.
 *
 * A reason is required and the free text is not, which mirrors the endpoint:
 * `reason` is one of nine the queue understands, `details` is 1-500 characters
 * when it is there at all and a 400 when it is empty. The counter exists so
 * that limit is reached in the composer rather than at the server.
 *
 * **Nothing here reports back what the report did.** The endpoint answers
 * `{ received: true }` to a first report and to a repeat, deliberately: it
 * must not be usable to measure moderation from outside. So there is no
 * "already reported" state to keep and no count to show — the dialog closes,
 * a toast says it arrived, and the control stays exactly where it was.
 */
export function ReportModal({
    isOpen,
    onClose,
    targetKind,
    targetId,
}: ReportModalProps) {
    const { t } = useI18n();
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState("");
    const { submit, isSubmitting, error, reset } = useReport();
    const addToast = useToastStore((state) => state.addToast);

    function handleClose() {
        if (isSubmitting) return;
        setReason(null);
        setDetails("");
        reset();
        onClose();
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!reason) return;
        const sent = await submit(targetKind, targetId, reason, details);
        if (!sent) return;
        addToast({ type: "success", message: t("report.successToast") });
        setReason(null);
        setDetails("");
        onClose();
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <form
                onSubmit={(e) => void handleSubmit(e)}
                className="px-6 pb-6 pt-14"
            >
                <h3 className="text-lg font-semibold text-ink">
                    {t(
                        targetKind === "POST"
                            ? "report.titlePost"
                            : "report.titleComment",
                    )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/50">
                    {t("report.body")}
                </p>

                <fieldset className="mt-5">
                    <legend className="text-sm font-medium text-ink/70">
                        {t("report.reasonLabel")}
                    </legend>
                    <div className="mt-3 space-y-1">
                        {REPORT_REASONS.map((value) => (
                            <label
                                key={value}
                                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/80 transition-colors hover:bg-ink/5"
                            >
                                <input
                                    type="radio"
                                    name="report-reason"
                                    value={value}
                                    checked={reason === value}
                                    onChange={() => setReason(value)}
                                    className="h-4 w-4 accent-red-500"
                                />
                                {t(`report.reason.${value}`)}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <label
                    htmlFor="report-details"
                    className="mt-5 block text-sm font-medium text-ink/70"
                >
                    {t("report.detailsLabel")}
                </label>
                <textarea
                    id="report-details"
                    value={details}
                    onChange={(e) =>
                        setDetails(
                            e.target.value.slice(0, REPORT_DETAILS_MAX_LENGTH),
                        )
                    }
                    rows={3}
                    placeholder={t("report.detailsPlaceholder")}
                    className="mt-2 w-full resize-none rounded-xl border border-ink/10 bg-surface-1 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:outline-none"
                />
                <p className="mt-1 text-right text-xs text-ink/30">
                    {details.length}/{REPORT_DETAILS_MAX_LENGTH}
                </p>

                <p className="mt-3 text-xs text-ink/40">
                    {t("report.privacyNote")}
                </p>

                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

                <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        {t("common.cancel")}
                    </Button>
                    <button
                        type="submit"
                        disabled={!reason || isSubmitting}
                        className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-on-fill transition-colors hover:bg-red-400 disabled:opacity-50"
                    >
                        {isSubmitting
                            ? t("report.submitting")
                            : t("report.submit")}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
