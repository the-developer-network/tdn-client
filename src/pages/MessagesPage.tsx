import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import {
    ConversationRow,
    RequestRow,
} from "../features/messages/components/ConversationRow";
import { useConversations } from "../features/messages/hooks/useConversations";
import { useMessageStore } from "../features/messages/store/message.store";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useI18n } from "../shared/hooks/useI18n";
import type { ConversationListStatus } from "../features/messages/api/message.types";

export default function MessagesPage() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuthStore();
    const { openModal } = useAuthModalStore();
    const [tab, setTab] = useState<ConversationListStatus>("ACCEPTED");

    const conversations = useMessageStore((s) => s.conversations);
    const requests = useMessageStore((s) => s.requests);
    const requestCount = useMessageStore((s) => s.requestCount);

    // There is no unauthenticated read path at all here, so this is a hard
    // guard rather than a degraded view.
    useEffect(() => {
        if (!isAuthenticated) {
            openModal();
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, navigate, openModal]);

    if (!isAuthenticated) return null;

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <MessagesInbox
                tab={tab}
                onTabChange={setTab}
                requestCount={requestCount}
                rows={tab === "ACCEPTED" ? conversations : requests}
            />
        </PageShell>
    );
}

interface MessagesInboxProps {
    tab: ConversationListStatus;
    onTabChange: (tab: ConversationListStatus) => void;
    requestCount: number;
    rows: ReturnType<typeof useMessageStore.getState>["conversations"];
}

/**
 * Split out so the listing hook remounts when the tab changes.
 *
 * `useConversations` fetches on mount and holds one tab worth of cursor, so
 * keying it by the tab is what stops the request listing from being appended
 * onto the conversation one with a cursor that belongs to neither.
 */
function MessagesInbox({
    tab,
    onTabChange,
    requestCount,
    rows,
}: MessagesInboxProps) {
    return (
        <>
            <MessagesHeader
                tab={tab}
                onTabChange={onTabChange}
                requestCount={requestCount}
            />
            <ConversationListing key={tab} tab={tab} rows={rows} />
        </>
    );
}

function MessagesHeader({
    tab,
    onTabChange,
    requestCount,
}: Omit<MessagesInboxProps, "rows">) {
    const { t } = useI18n();

    return (
        <div className="sticky top-0 z-10 border-b border-ink/10 bg-ground/80 backdrop-blur-md">
            <h1 className="px-4 py-4 text-xl font-bold text-ink">
                {t("messages.title")}
            </h1>
            <div className="flex">
                <TabButton
                    isActive={tab === "ACCEPTED"}
                    onClick={() => onTabChange("ACCEPTED")}
                    label={t("messages.tabInbox")}
                />
                <TabButton
                    isActive={tab === "PENDING"}
                    onClick={() => onTabChange("PENDING")}
                    label={t("messages.tabRequests")}
                    badge={requestCount}
                />
            </div>
        </div>
    );
}

function TabButton({
    isActive,
    onClick,
    label,
    badge,
}: {
    isActive: boolean;
    onClick: () => void;
    label: string;
    badge?: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 border-b-2 py-3 text-sm font-semibold transition-colors ${
                isActive
                    ? "border-blue-500 text-ink"
                    : "border-transparent text-ink/50 hover:text-ink/80"
            }`}
        >
            {label}
            {badge != null && badge > 0 && (
                <span className="ml-1.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-on-fill">
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </button>
    );
}

function ConversationListing({
    tab,
    rows,
}: {
    tab: ConversationListStatus;
    rows: MessagesInboxProps["rows"];
}) {
    const { t } = useI18n();
    const { fetch, isLoading, isLoadingMore, error, hasMore, loadMore } =
        useConversations(tab);
    const isRequests = tab === "PENDING";

    if (isLoading && rows.length === 0) {
        return (
            <ul className="divide-y divide-ink/10">
                {Array.from({ length: 6 }).map((_, index) => (
                    <li key={index} className="flex items-center gap-3 p-4">
                        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-surface-2" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
                            <div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" />
                        </div>
                    </li>
                ))}
            </ul>
        );
    }

    if (error && rows.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-ink/60">{error}</p>
                <button
                    type="button"
                    onClick={() => void fetch()}
                    className="mt-3 text-sm font-semibold text-blue-400 hover:text-blue-300"
                >
                    {t("messages.retry")}
                </button>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="p-10 text-center">
                <p className="font-semibold text-ink">
                    {isRequests
                        ? t("messages.emptyRequests")
                        : t("messages.empty")}
                </p>
                <p className="mt-1 text-sm text-ink/50">
                    {isRequests
                        ? t("messages.emptyRequestsHint")
                        : t("messages.emptyHint")}
                </p>
            </div>
        );
    }

    return (
        <>
            <ul>
                {rows.map((conversation) => (
                    <li key={conversation.id}>
                        {isRequests ? (
                            <RequestRow conversation={conversation} />
                        ) : (
                            <ConversationRow conversation={conversation} />
                        )}
                    </li>
                ))}
            </ul>

            {hasMore && (
                <div className="p-4 text-center">
                    <button
                        type="button"
                        onClick={() => void loadMore()}
                        disabled={isLoadingMore}
                        className="text-sm font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                        {t("messages.loadMore")}
                    </button>
                </div>
            )}
        </>
    );
}
