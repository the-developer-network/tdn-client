import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useAuthStore } from "../../core/auth/auth.store";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";
import { useMessageStore } from "../../features/messages/store/message.store";
import { BottomNav } from "./BottomNav";
import "@testing-library/jest-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual =
        await vi.importActual<typeof import("react-router-dom")>(
            "react-router-dom",
        );
    return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../../features/notifications/store/notification.store", () => ({
    useNotificationStore: vi.fn(),
}));
vi.mock("../../core/auth/auth.store", () => ({
    useAuthStore: vi.fn(),
}));
vi.mock("../../features/auth/store/auth-modal.store", () => ({
    useAuthModalStore: vi.fn(),
}));

function setupMocks(unreadCount: number) {
    vi.mocked(useNotificationStore).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector: any) => selector({ unreadCount }),
    );
    vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        user: null,
    } as unknown as ReturnType<typeof useAuthStore>);
    vi.mocked(useAuthModalStore).mockReturnValue({
        setStep: vi.fn(),
        openModal: vi.fn(),
    } as unknown as ReturnType<typeof useAuthModalStore>);
}

beforeEach(() => {
    mockNavigate.mockClear();
    // Not mocked: the message store is real here, so the inbox badge is driven
    // by setting it rather than by a selector stub.
    useMessageStore.setState(useMessageStore.getInitialState());
});

function renderBottomNav() {
    return render(
        <MemoryRouter>
            <BottomNav />
        </MemoryRouter>,
    );
}

describe("BottomNav — notification badge", () => {
    it("does not render the badge when unreadCount is 0", () => {
        setupMocks(0);
        renderBottomNav();
        expect(document.querySelector(".bg-blue-500")).not.toBeInTheDocument();
    });

    it("shows the exact count when unreadCount is between 1 and 9", () => {
        setupMocks(5);
        renderBottomNav();
        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("shows '9+' when unreadCount is exactly 10", () => {
        setupMocks(10);
        renderBottomNav();
        expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("shows '9+' when unreadCount is greater than 9", () => {
        setupMocks(42);
        renderBottomNav();
        expect(screen.getByText("9+")).toBeInTheDocument();
    });

    it("shows '9' (not '9+') when unreadCount is exactly 9", () => {
        setupMocks(9);
        renderBottomNav();
        expect(screen.getByText("9")).toBeInTheDocument();
        expect(screen.queryByText("9+")).not.toBeInTheDocument();
    });
});

/*
 * Messages took the slot Saved used to hold rather than becoming a sixth tab.
 * Six tabs leave 60px each on a 360px phone, and Saved is still reachable from
 * the sidebar above `md` and from the profile page below it — while the inbox
 * had no way in on a phone at all.
 */
describe("BottomNav — the tabs", () => {
    it("carries Messages and not Saved", () => {
        setupMocks(0);
        renderBottomNav();

        expect(screen.getByText("Chat")).toBeInTheDocument();
        expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });

    it("keeps five tabs", () => {
        setupMocks(0);
        const { container } = renderBottomNav();

        expect(
            container.querySelectorAll('[data-testid="bottom-nav"] > *'),
        ).toHaveLength(5);
    });

    it("badges the inbox from the message store, not the notification one", () => {
        setupMocks(0);
        useMessageStore.setState({ unreadCount: 3 });
        renderBottomNav();

        expect(screen.getByText("3")).toBeInTheDocument();
    });
});
