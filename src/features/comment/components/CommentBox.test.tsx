import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// CommentBox → useAuthStore → auth.store.ts uses Zustand persist, which
// captures the localStorage reference at module evaluation time. vi.hoisted
// ensures our Map-backed stub is in place before any module is loaded.
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
import { useLanguageStore } from "../../../shared/store/language.store";
import { useToastStore } from "../../../shared/store/toast.store";
import { CommentBox } from "./CommentBox";

const BASE = "http://localhost:8080/api/v1";

const mockUser = {
    id: "user-1",
    username: "testuser",
    avatarUrl: "https://cdn.example.com/a.png",
    isEmailVerified: true,
};

const signIn = () =>
    useAuthStore.setState({
        user: mockUser,
        token: "tok",
        isAuthenticated: true,
    });

const toasts = () => useToastStore.getState().toasts;

const imageFile = () => new File(["x"], "shot.png", { type: "image/png" });
const videoFile = () => new File(["x"], "clip.mp4", { type: "video/mp4" });

/** jsdom implements neither, and the previews are built entirely out of them. */
let objectUrlCount = 0;
const revokeObjectURL = vi.fn();

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
    useToastStore.setState({ toasts: [] });
    // The messages asserted below are the English ones; the locale is
    // otherwise sniffed from navigator.language.
    useLanguageStore.setState({ locale: "en" });

    objectUrlCount = 0;
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => `blob:mock/${objectUrlCount++}`),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: revokeObjectURL,
    });
});

afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
});

function setup(props?: { parentId?: string }) {
    const onCommentCreated = vi.fn();
    const view = render(
        <CommentBox
            target={{ type: "post", id: "post-1" }}
            onCommentCreated={onCommentCreated}
            {...props}
        />,
    );
    const fileInput = view.container.querySelector(
        'input[type="file"]',
    ) as HTMLInputElement;

    return { ...view, onCommentCreated, fileInput };
}

describe("CommentBox", () => {
    it("hands the created reply to onCommentCreated and clears the box", async () => {
        signIn();
        const user = userEvent.setup();
        const { onCommentCreated } = setup();

        const textarea = screen.getByPlaceholderText("Write a comment...");
        await user.type(textarea, "nice one");
        await user.click(screen.getByRole("button", { name: "Reply" }));

        await waitFor(() => expect(onCommentCreated).toHaveBeenCalledOnce());
        expect(textarea).toHaveValue("");
    });

    it("opens the auth modal instead of posting when the reader is signed out", async () => {
        const user = userEvent.setup();
        const { onCommentCreated } = setup();

        await user.click(screen.getByRole("button", { name: "Reply" }));

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(onCommentCreated).not.toHaveBeenCalled();
    });

    it("surfaces the API's reason when the reply fails", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/posts/post-1/comments`, () =>
                HttpResponse.json(
                    {
                        type: "about:blank",
                        title: "TooManyRequests",
                        status: 429,
                        detail: "Too many requests, please try again later.",
                    },
                    { status: 429 },
                ),
            ),
        );
        const user = userEvent.setup();
        const { onCommentCreated } = setup();

        await user.type(
            screen.getByPlaceholderText("Write a comment..."),
            "nice one",
        );
        await user.click(screen.getByRole("button", { name: "Reply" }));

        await waitFor(() => expect(toasts()).toHaveLength(1));
        expect(toasts()[0].type).toBe("error");
        expect(toasts()[0].message).toBe(
            "Too many requests, please try again later.",
        );
        expect(onCommentCreated).not.toHaveBeenCalled();
    });

    it("keeps the draft when the reply fails", async () => {
        signIn();
        server.use(
            http.post(`${BASE}/posts/post-1/comments`, () =>
                HttpResponse.error(),
            ),
        );
        const user = userEvent.setup();
        setup();

        const textarea = screen.getByPlaceholderText("Write a comment...");
        await user.type(textarea, "nice one");
        await user.click(screen.getByRole("button", { name: "Reply" }));

        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Reply" })).toBeEnabled(),
        );
        expect(textarea).toHaveValue("nice one");
    });

    describe("attachments", () => {
        it("previews an attached image", async () => {
            signIn();
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, imageFile());

            const img = container.querySelector('img[src^="blob:"]');
            expect(img).toBeInTheDocument();
        });

        it("previews an attached video as a video, not as an image", async () => {
            signIn();
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, videoFile());

            expect(container.querySelector("video")).toHaveAttribute(
                "src",
                "blob:mock/0",
            );
            expect(
                container.querySelector('img[src^="blob:"]'),
            ).not.toBeInTheDocument();
        });

        it("revokes the object URL when a preview is removed", async () => {
            signIn();
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, imageFile());
            // The only unnamed button inside the preview tile is its remove X.
            const remove = container.querySelector(
                ".relative.aspect-video button",
            ) as HTMLButtonElement;
            await user.click(remove);

            expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock/0");
            expect(
                container.querySelector('img[src^="blob:"]'),
            ).not.toBeInTheDocument();
        });

        it("stops accepting attachments past the fourth", async () => {
            signIn();
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, [
                imageFile(),
                imageFile(),
                imageFile(),
                imageFile(),
                imageFile(),
            ]);

            expect(
                container.querySelectorAll('img[src^="blob:"]'),
            ).toHaveLength(4);
        });
    });
});
