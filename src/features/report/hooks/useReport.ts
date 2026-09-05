import { useCallback, useState } from "react";
import { reportApi } from "../api/report.api";
import type { ReportReason, ReportTargetKind } from "../api/report.types";
import { getErrorMessage } from "../../../shared/utils/error-handler";

/**
 * Files a report and reports whether it landed.
 *
 * The error is returned rather than toasted, unlike most mutations here: the
 * form that produced it is still on screen with the reason and the text the
 * person typed, and a toast over a dialog they now have to fill in again is
 * the wrong place for it. A rate limit — five a minute — is the failure they
 * are most likely to see, and it is the one worth reading beside the button.
 */
export function useReport() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = useCallback(
        async (
            targetKind: ReportTargetKind,
            targetId: string,
            reason: ReportReason,
            details: string,
        ): Promise<boolean> => {
            if (isSubmitting) return false;
            setIsSubmitting(true);
            setError(null);
            try {
                const trimmed = details.trim();
                await reportApi.create({
                    targetKind,
                    targetId,
                    reason,
                    // Omitted rather than sent empty: the schema validates
                    // `details` as 1-500 characters when it is present, so
                    // `""` is a 400 rather than "no comment".
                    ...(trimmed ? { details: trimmed } : {}),
                });
                return true;
            } catch (err) {
                setError(getErrorMessage(err));
                return false;
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting],
    );

    const reset = useCallback(() => setError(null), []);

    return { submit, isSubmitting, error, reset };
}
