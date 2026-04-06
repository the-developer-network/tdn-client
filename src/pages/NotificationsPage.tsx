import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { NotificationCard } from "../features/notifications/components/NotificationCard";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useNotificationStore } from "../features/notifications/store/notification.store";
import { notificationApi } from "../features/notifications/api/notification.api";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { getErrorMessage } from "../shared/utils/error-handler";

export default function NotificationsPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { openModal, setStep } = useAuthModalStore();
    const {
        notifications,
        unreadCount,
        markAllRead: markAllReadInStore,
    } = useNotificationStore();
    const { fetch, isLoading, isLoadingMore, error, hasMore, loadMore } =
        useNotifications();

    useEffect(() => {
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            navigate("/", { replace: true });
            return;
        }
        fetch();
    }, [isAuthenticated, navigate, openModal, setStep, fetch]);

    if (!isAuthenticated) return null;

    async function handleMarkAllRead() {
        try {
            await notificationApi.markAllRead();
            markAllReadInStore();
        } catch (err) {
            console.error(getErrorMessage(err));
        }
    }

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-white">
                        Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <p className="text-sm text-white/40 mt-1">
                            {unreadCount} unread
                        </p>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                        title="Mark all as read"
                    >
                        <CheckCheck size={16} />
                        <span className="hidden xl:block">Mark all read</span>
                    </button>
                )}
            </div>

            {/* Loading skeletons */}
            {isLoading && notifications.length === 0 && (
                <div className="divide-y divide-white/10">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-4 py-4"
                        >
                            <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="flex-1 space-y-2 pt-1">
                                <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <p className="text-white/60 text-[15px] mb-4">{error}</p>
                    <button
                        onClick={fetch}
                        className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mb-4">
                        <svg
                            className="w-8 h-8 text-white/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        No notifications yet
                    </h2>
                    <p className="text-white/40 text-[15px] max-w-[250px]">
                        When someone follows or interacts with you, you'll see
                        it here.
                    </p>
                </div>
            )}

            {/* Notifications list */}
            {!error && notifications.length > 0 && (
                <div>
                    {notifications.map((notification, i) => (
                        <NotificationCard
                            key={`${notification.issuerId}-${notification.createdAt}-${i}`}
                            notification={notification}
                        />
                    ))}

                    {/* Load more */}
                    {hasMore && (
                        <div className="flex justify-center py-6">
                            <button
                                onClick={loadMore}
                                disabled={isLoadingMore}
                                className="px-6 py-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors disabled:opacity-40"
                            >
                                {isLoadingMore ? "Loading..." : "Load more"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </PageShell>
    );
}
