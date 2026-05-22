import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useNotifications } from "../features/notifications/hooks/useNotifications";
import { useNotificationStore } from "../features/notifications/store/notification.store";
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
    overrides: Partial<ReturnType<typeof useNotificationStore>> = {},
): ReturnType<typeof useNotificationStore> {
    return {
        notifications: [],
        unreadCount: 0,
        setNotifications: vi.fn(),
        addNotification: vi.fn(),
        markAllRead: vi.fn(),
        ...overrides,
    } as unknown as ReturnType<typeof useNotificationStore>;
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
});
