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
    // Belt and braces: a test that fails partway through never reaches its own
    // cleanup, and fake timers left running make the *next* test time out —
    // which reads as a failure in code that is fine.
    vi.useRealTimers();
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

        /*
         * The two halves of the moderation contract, and the pair most likely
         * to be collapsed into one branch by a later edit. A verdict and an
         * outage arrive as the same shape of failure from the same call, and
         * they call for opposite things: throw the files away, or hold on to
         * them. Getting it backwards during an outage takes four picked files
         * from someone who did nothing wrong.
         */
        it("throws the attachments away when moderation rejects them", async () => {
            signIn();
            server.use(
                http.post(`${BASE}/media`, () =>
                    HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "MediaRejectedError",
                            status: 422,
                            detail: "This file was rejected.",
                            instance: "/api/v1/media",
                        },
                        { status: 422 },
                    ),
                ),
            );
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, [imageFile(), imageFile()]);
            expect(
                container.querySelectorAll('img[src^="blob:"]'),
            ).toHaveLength(2);

            await user.click(screen.getByRole("button", { name: "Reply" }));

            // Both previews go, not just one: the endpoint processes files in
            // order and returns no URLs at all once one is rejected, and never
            // says which it was.
            await waitFor(() =>
                expect(
                    container.querySelectorAll('img[src^="blob:"]'),
                ).toHaveLength(0),
            );
            expect(revokeObjectURL).toHaveBeenCalledTimes(2);
            expect(toasts()[0].message).toContain("breaks the community rules");
        });

        it("keeps the attachments when moderation is unreachable", async () => {
            signIn();
            let calls = 0;
            server.use(
                http.post(`${BASE}/media`, () => {
                    calls += 1;
                    return HttpResponse.json(
                        {
                            type: "about:blank",
                            title: "ModerationUnavailableError",
                            status: 503,
                            detail: "Upstream unavailable.",
                            instance: "/api/v1/media",
                        },
                        { status: 503 },
                    );
                }),
            );
            const user = userEvent.setup();
            const { container, fileInput } = setup();

            await user.upload(fileInput, [imageFile(), imageFile()]);
            await user.click(screen.getByRole("button", { name: "Reply" }));

            // Real timers, and so a real three-second wait for the one
            // automatic retry. Faking them here deadlocks: `waitFor` drives
            // its polling off the same clock, and MSW answers on the same
            // loop. The retry's timing is pinned in `media-errors.test.ts`,
            // where there is no DOM to fight; this test is about the files.
            await waitFor(
                () =>
                    expect(toasts()[0]?.message).toContain(
                        "unavailable right now",
                    ),
                { timeout: 8000 },
            );
            expect(calls).toBe(2);
            expect(
                container.querySelectorAll('img[src^="blob:"]'),
            ).toHaveLength(2);
            expect(revokeObjectURL).not.toHaveBeenCalled();
        }, 15_000);

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
