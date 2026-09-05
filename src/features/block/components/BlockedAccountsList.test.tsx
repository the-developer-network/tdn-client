import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The list reaches `useBlockAction` → `useAuthStore`, whose `persist` captures
// localStorage at module-evaluation time. Stub it before imports resolve.
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
import { useToastStore } from "../../../shared/store/toast.store";
import { BlockedAccountsList } from "./BlockedAccountsList";

const BASE = "http://localhost:8080/api/v1";

function serve(rows: unknown[]) {
    server.use(
        http.get(`${BASE}/blocks`, () => HttpResponse.json({ data: rows })),
    );
}

const bob = {
    userId: "u-2",
    username: "bob",
    fullName: "Bob Builder",
    avatarUrl: "",
    bio: null,
};

function renderList() {
    return render(
        <MemoryRouter>
            <BlockedAccountsList />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "tok");
    useAuthStore.setState({
        user: { id: "u-1", username: "me" } as never,
        token: "tok",
        isAuthenticated: true,
    });
    useToastStore.setState({ toasts: [] });
});

describe("BlockedAccountsList", () => {
    it("says plainly when nobody is blocked", async () => {
        serve([]);

        renderList();

        expect(
            await screen.findByText("You have not blocked anyone."),
        ).toBeInTheDocument();
    });

    it("lists a blocked account with the way back to it", async () => {
        serve([bob]);

        renderList();

        expect(await screen.findByText("Bob Builder")).toBeInTheDocument();
        expect(screen.getByText("@bob")).toBeInTheDocument();
        // A blocked account's profile is still served, and this list is the
        // only place left that can link to it.
        expect(screen.getByRole("link")).toHaveAttribute(
            "href",
            "/profile/bob",
        );
    });

    it("drops the row once the server has lifted the block", async () => {
        serve([bob]);
        server.use(
            http.delete(`${BASE}/blocks`, () =>
                HttpResponse.json({ data: { isBlocked: false } }),
            ),
        );

        renderList();
        await userEvent.click(
            await screen.findByRole("button", {
                name: "Unblock",
            }),
        );

        await waitFor(() =>
            expect(screen.queryByText("@bob")).not.toBeInTheDocument(),
        );
        expect(useToastStore.getState().toasts[0].message).toBe(
            "Block lifted.",
        );
    });

    /*
     * The row is the only route back to this block, so a failed unblock has to
     * leave it where it is — taking it away would strand the block with
     * nothing on screen pointing at it.
     */
    it("keeps the row when the unblock fails", async () => {
        serve([bob]);
        server.use(
            http.delete(`${BASE}/blocks`, () =>
                HttpResponse.json(
                    {
                        status: 500,
                        title: "InternalServerError",
                        detail: "An unexpected error occurred.",
                    },
                    { status: 500 },
                ),
            ),
        );

        renderList();
        await userEvent.click(
            await screen.findByRole("button", {
                name: "Unblock",
            }),
        );

        await waitFor(() =>
            expect(useToastStore.getState().toasts).toHaveLength(1),
        );
        expect(useToastStore.getState().toasts[0].type).toBe("error");
        expect(screen.getByText("@bob")).toBeInTheDocument();
    });

    it("offers a retry when the list itself fails", async () => {
        server.use(
            http.get(`${BASE}/blocks`, () =>
                HttpResponse.json(
                    {
                        status: 500,
                        title: "InternalServerError",
                        detail: "An unexpected error occurred.",
                    },
                    { status: 500 },
                ),
            ),
        );

        renderList();

        expect(
            await screen.findByRole("button", { name: "Try again" }),
        ).toBeInTheDocument();
    });
});
