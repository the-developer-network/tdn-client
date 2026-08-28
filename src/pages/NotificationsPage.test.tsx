import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `getErrorMessage` resolves its strings through the persisted language
// store, which captures storage at module-evaluation time.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => _map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            _map.set(key, String(value));
        },
        removeItem: (key: string) => {
            _map.delete(key);
        },
        clear: () => {
            _map.clear();
        },
        get length() {
            return _map.size;
        },
        key: (i: number) => [..._map.keys()][i] ?? null,
    });
});

import { notificationApi } from "../features/notifications/api/notification.api";
import { useToastStore } from "../shared/store/toast.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useNotificationStore } from "../features/notifications/store/notification.store";
// The state type, not `ReturnType<typeof useNotificationStore>`: a Zustand
// bound store is an overloaded call signature and `ReturnType` picks the
// selector overload, which resolves to `unknown`.
import type { NotificationState } from "../features/notifications/store/notification.store";
import { useAuthStore } from "../core/auth/auth.store";
import NotificationsPage from "./NotificationsPage";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../shared/layout/PageShell", () => ({
    PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../features/notifications/components/NotificationCard", () => ({
    NotificationCard: () => <div data-testid="notification-card" />,
}));
vi.mock("../features/notifications/hooks/useNotifications", () => ({
    useNotifications: vi.fn(),
}));
vi.mock("../features/notifications/store/notification.store", () => ({
    useNotificationStore: vi.fn(),
}));
vi.mock("../features/notifications/api/notification.api", () => ({
    notificationApi: { markAllRead: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../core/auth/auth.store", () => ({ useAuthStore: vi.fn() }));
vi.mock("../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));
vi.mock("../shared/components/TrendingTopicsWidget", () => ({
    TrendingTopicsWidget: () => null,
}));

function makeAuth(isAuthenticated: boolean) {
    return { isAuthenticated } as unknown as ReturnType<typeof useAuthStore>;
}

function makeNotificationStore(
    overrides: Partial<NotificationState> = {},
): NotificationState {
    return {
        notifications: [],
        unreadCount: 0,
        setNotifications: vi.fn(),
        addNotification: vi.fn(),
        incrementUnread: vi.fn(),
        markAllRead: vi.fn(),
        ...overrides,
    };
}

function makeNotification() {
    return {
        recipientId: "user-1",
        issuerId: "user-2",
        username: "otheruser",
        type: "LIKE" as const,
        avatarUrl: "https://example.com/a.png",
        referenceId: "post-1",
        createdAt: new Date().toISOString(),
        isRead: false,
    };
}

function makeUseNotifications(
    overrides: Partial<ReturnType<typeof useNotifications>> = {},
): ReturnType<typeof useNotifications> {
    return {
        fetch: vi.fn(),
        isLoading: false,
        isLoadingMore: false,
        error: null,
        hasMore: false,
        loadMore: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(notificationApi.markAllRead).mockReset();
    vi.mocked(notificationApi.markAllRead).mockResolvedValue(undefined);
    useToastStore.setState({ toasts: [] });
    vi.mocked(useAuthStore).mockReturnValue(makeAuth(true));
    vi.mocked(useAuthModalStore).mockReturnValue({
        openModal: vi.fn(),
        setStep: vi.fn(),
    } as unknown as ReturnType<typeof useAuthModalStore>);
    vi.mocked(useNotificationStore).mockReturnValue(makeNotificationStore());
    vi.mocked(useNotifications).mockReturnValue(makeUseNotifications());
});

describe("NotificationsPage", () => {
    it("renders nothing and redirects when unauthenticated", () => {
        vi.mocked(useAuthStore).mockReturnValue(makeAuth(false));
        const { container } = render(<NotificationsPage />);
        expect(container.firstChild).toBeNull();
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });

    it("renders loading skeletons when fetching with no notifications yet", () => {
        vi.mocked(useNotifications).mockReturnValue(
            makeUseNotifications({ isLoading: true }),
        );
        const { container } = render(<NotificationsPage />);
        expect(
            container.querySelectorAll(".animate-pulse").length,
        ).toBeGreaterThan(0);
    });

    it("renders the error message and Try Again button", () => {
        vi.mocked(useNotifications).mockReturnValue(
            makeUseNotifications({ error: "Failed to load" }),
        );
        render(<NotificationsPage />);
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /try again/i }),
        ).toBeInTheDocument();
    });

    it("shows the unread count when there are unread notifications", () => {
        vi.mocked(useNotificationStore).mockReturnValue(
            makeNotificationStore({ unreadCount: 5 }),
        );
        render(<NotificationsPage />);
        expect(screen.getByText("5 unread")).toBeInTheDocument();
    });

    // The list was gated behind `!error`, and `loadMore` sets `error`. So a
    // failed second page replaced twenty notifications the reader already had
    // with an error panel — the page punished them for asking for more.
    it("keeps the loaded notifications on screen when loading more fails", () => {
        vi.mocked(useNotificationStore).mockReturnValue(
            makeNotificationStore({
                notifications: [
                    makeNotification(),
                    makeNotification(),
                ] as NotificationState["notifications"],
            }),
        );
        vi.mocked(useNotifications).mockReturnValue(
            makeUseNotifications({ error: "Failed to load", hasMore: true }),
        );

        render(<NotificationsPage />);

        expect(screen.getAllByTestId("notification-card")).toHaveLength(2);
        expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });

    // The handler computed a user-facing message with `getErrorMessage` and
    // then sent it to `console.error`.
    it("tells the reader when marking all read fails", async () => {
        const user = userEvent.setup();
        vi.mocked(notificationApi.markAllRead).mockRejectedValueOnce({
            status: 429,
            title: "TooManyRequests",
            detail: "Too many requests, please try again later.",
        });
        const markAllRead = vi.fn();
        vi.mocked(useNotificationStore).mockReturnValue(
            makeNotificationStore({ unreadCount: 3, markAllRead }),
        );

        render(<NotificationsPage />);
        await user.click(screen.getByTitle("Mark all read"));

        await waitFor(() => {
            expect(useToastStore.getState().toasts).toHaveLength(1);
        });
        expect(useToastStore.getState().toasts[0].message).toBe(
            "Too many requests, please try again later.",
        );
        expect(markAllRead).not.toHaveBeenCalled();
    });
});
