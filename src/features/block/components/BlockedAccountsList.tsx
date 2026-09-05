import { Link } from "react-router-dom";
import { Button } from "../../../shared/components/ui/Button";
import { useBlockAction } from "../hooks/useBlockAction";
import { useBlockedList } from "../hooks/useBlockedList";
import { useToastStore } from "../../../shared/store/toast.store";
import { useI18n } from "../../../shared/hooks/useI18n";

/**
 * The blocked-accounts list, rendered inside a Settings section.
 *
 * This list is the only route back to a block: the account is invisible in the
 * feed, in search, on its own timeline and in the inbox, so an unblock button
 * anywhere else would have nothing to sit on. Rows still link to the profile,
 * which is served to a blocked viewer for the same reason.
 */
export function BlockedAccountsList() {
    const { t } = useI18n();
    const {
        users,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        retry,
        remove,
    } = useBlockedList();
    const { unblock, pendingId } = useBlockAction();
    const addToast = useToastStore((state) => state.addToast);

    async function handleUnblock(userId: string) {
        const lifted = await unblock(userId);
        if (!lifted) return;
        remove(userId);
        addToast({ type: "success", message: t("block.unblockedToast") });
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-surface-2" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 animate-pulse rounded bg-surface-2" />
                            <div className="h-3 w-20 animate-pulse rounded bg-surface-2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // An error and a loaded list are not exclusive: `loadMore` can fail with
    // rows already on screen, and taking them away would take the unblock
    // buttons with them.
    return (
        <div className="space-y-4">
            {error && (
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-red-400">{error}</p>
                    <Button variant="outline" size="sm" onClick={retry}>
                        {t("common.tryAgain")}
                    </Button>
                </div>
            )}

            {!error && users.length === 0 && (
                <p className="text-sm text-ink/40">{t("block.empty")}</p>
            )}

            {users.length > 0 && (
                <ul className="space-y-3">
                    {users.map((user) => (
                        <li
                            key={user.userId}
                            className="flex items-center gap-3"
                        >
                            <Link
                                to={`/profile/${user.username}`}
                                className="flex min-w-0 flex-1 items-center gap-3"
                            >
                                <img
                                    src={
                                        user.avatarUrl ||
                                        `https://ui-avatars.com/api/?name=${user.username}&size=80`
                                    }
                                    alt={user.username}
                                    className="h-10 w-10 shrink-0 rounded-full bg-surface-1 object-cover"
                                />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-ink">
                                        {user.fullName || user.username}
                                    </span>
                                    <span className="block truncate text-xs text-ink/40">
                                        @{user.username}
                                    </span>
                                </span>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleUnblock(user.userId)}
                                disabled={pendingId !== null}
                            >
                                {pendingId === user.userId
                                    ? t("block.working")
                                    : t("block.unblock")}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {hasMore && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                >
                    {isLoadingMore
                        ? t("common.loadingMore")
                        : t("common.loadMore")}
                </Button>
            )}
        </div>
    );
}
