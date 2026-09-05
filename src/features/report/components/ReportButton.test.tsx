import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The button reaches `useAuthStore`, whose `persist` captures localStorage at
// module-evaluation time. Stub it before imports resolve.
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

import { useAuthStore } from "../../../core/auth/auth.store";
import { useAuthModalStore } from "../../auth/store/auth-modal.store";
import { ReportButton } from "./ReportButton";

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
});

describe("ReportButton", () => {
    it("asks a guest to sign in instead of opening the form", async () => {
        render(<ReportButton targetKind="POST" targetId="post-1" />);

        await userEvent.click(screen.getByRole("button", { name: "Report" }));

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(
            screen.queryByRole("heading", { name: "Report this post" }),
        ).not.toBeInTheDocument();
    });

    it("opens the form for a signed-in reader", async () => {
        useAuthStore.setState({
            user: { id: "user-1", username: "me" } as never,
            token: "tok",
            isAuthenticated: true,
        });

        render(<ReportButton targetKind="POST" targetId="post-1" />);

        await userEvent.click(screen.getByRole("button", { name: "Report" }));

        expect(
            screen.getByRole("heading", { name: "Report this post" }),
        ).toBeInTheDocument();
    });

    /*
     * Both cards this sits on are themselves clickable. Without the guard,
     * reporting a post would also navigate to it, and the dialog would open
     * on a page that is already unmounting.
     */
    it("does not let the click reach the card underneath it", async () => {
        const onCardClick = vi.fn();
        useAuthStore.setState({
            user: { id: "user-1", username: "me" } as never,
            token: "tok",
            isAuthenticated: true,
        });

        render(
            <div onClick={onCardClick}>
                <ReportButton targetKind="POST" targetId="post-1" />
            </div>,
        );

        await userEvent.click(screen.getByRole("button", { name: "Report" }));

        expect(onCardClick).not.toHaveBeenCalled();
    });
});
