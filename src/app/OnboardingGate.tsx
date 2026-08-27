import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useOnboardingStore } from "../features/onboarding/store/onboarding.store";
import { MIN_FOLLOWS } from "../features/onboarding/onboarding.types";
import { profileApi } from "../features/profile/api/profile.api";

type Status = "checking" | "pass" | "redirect";

/**
 * Sends an account following fewer than `MIN_FOLLOWS` people through
 * `/onboarding` before it can reach the app.
 *
 * Mounted as a pathless layout route so it survives navigation between the
 * routes it wraps — the follow count is read once per session, not on every
 * page change.
 *
 * Three rules are load-bearing:
 *
 * - It stands down while the auth modal is open. `RegisterView` calls
 *   `setAuth` and then `setStep("verify-email")`, leaving the modal up over
 *   the page; redirecting at that moment unmounts `AuthModal` along with the
 *   `PageShell` holding it, and the verification step is lost.
 * - A failed profile request passes rather than redirects. The gate is a
 *   requirement, not a trap, and an account must never be locked out of the
 *   app because one request did not come back.
 * - Finishing the flow once settles it for good. The check is `< MIN_FOLLOWS`,
 *   so without that the account would be dragged back in the moment it
 *   unfollowed someone — which is nagging, not onboarding.
 */
export function OnboardingGate() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const isModalOpen = useAuthModalStore((state) => state.isOpen);

    const completedUserIds = useOnboardingStore(
        (state) => state.completedUserIds,
    );
    const complete = useOnboardingStore((state) => state.complete);

    const username = user?.username;
    const userId = user?.id;
    const isCompleted = !!userId && completedUserIds.includes(userId);
    const skip = !isAuthenticated || isModalOpen || isCompleted || !username;

    // Stamped with the id it was resolved for, so signing into a second
    // account in the same session re-checks instead of inheriting the first
    // account's verdict.
    const [checked, setChecked] = useState<{
        userId: string;
        status: Status;
    } | null>(null);

    useEffect(() => {
        if (skip || !userId) return;

        let cancelled = false;

        profileApi
            .getProfile(username)
            .then((profile) => {
                if (cancelled) return;
                if ((profile.followingCount ?? 0) >= MIN_FOLLOWS) {
                    // Requirement already met — record it so the check does
                    // not run again on this device.
                    complete(userId, []);
                    setChecked({ userId, status: "pass" });
                } else {
                    setChecked({ userId, status: "redirect" });
                }
            })
            .catch((err) => {
                if (cancelled) return;
                // Passing on failure is deliberate, but silence here made the
                // whole flow look like it was never built: a profile endpoint
                // that is down disables onboarding with no trace at all.
                console.warn(
                    "Onboarding check skipped — the profile request failed:",
                    err,
                );
                setChecked({ userId, status: "pass" });
            });

        return () => {
            cancelled = true;
        };
    }, [skip, username, userId, complete]);

    if (skip) return <Outlet />;

    const status: Status =
        checked && checked.userId === userId ? checked.status : "checking";

    if (status === "checking") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
        );
    }

    if (status === "redirect") return <Navigate to="/onboarding" replace />;

    return <Outlet />;
}
