import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import type {
    Conversation,
    Message,
} from "../src/features/messages/api/message.types";

function makeConversation(
    id: string,
    overrides: Partial<Conversation> = {},
): Conversation {
    return {
        id,
        status: "ACCEPTED",
        isRequest: false,
        canSend: true,
        participant: {
            id: "user-2",
            username: "bob",
            fullName: "Bob Builder",
            avatarUrl: "",
        },
        unreadCount: 0,
        lastMessagePreview: "the last thing said",
        lastMessageAt: new Date().toISOString(),
        otherLastReadAt: null,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

function makeMessage(id: string, overrides: Partial<Message> = {}): Message {
    return {
        id,
        conversationId: "c1",
        senderId: "user-2",
        content: "hello from bob",
        mediaUrls: [],
        isSensitive: false,
        mediaPending: false,
        mediaRejected: false,
        isDeleted: false,
        isMine: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Every listing has to answer the whole `{ data, meta }` envelope: `getPage`
 * reads `nextCursor` out of `meta`, and a fulfil that returns `{ data }` alone
 * leaves the client believing there is always another page.
 */
interface RouteOptions {
    accepted?: Conversation[];
    pending?: Conversation[];
    thread?: { conversation: Conversation; messages: Message[] };
    onSend?: (body: unknown) => void;
}

async function mockApi(page: Page, options: RouteOptions = {}) {
    const {
        accepted = [makeConversation("c1")],
        pending = [],
        thread = {
            conversation: makeConversation("c1"),
            messages: [makeMessage("m1")],
        },
        onSend,
    } = options;

    await page.route("**/api/v1/**", async (route, request) => {
        const url = request.url();
        const method = request.method();
        const meta = { timestamp: new Date().toISOString(), nextCursor: null };

        if (url.includes("/conversations/unread-count")) {
            await route.fulfill({ json: { data: { count: 0 }, meta } });
            return;
        }

        if (url.includes("/messages") && method === "POST") {
            onSend?.(request.postDataJSON());
            await route.fulfill({
                status: 201,
                json: {
                    data: makeMessage("m-sent", {
                        content: request.postDataJSON()?.content ?? "",
                        senderId: "user-1",
                        isMine: true,
                    }),
                    meta,
                },
            });
            return;
        }

        if (url.includes("/messages") && method === "GET") {
            await route.fulfill({ json: { data: thread, meta } });
            return;
        }

        if (url.includes("/accept")) {
            await route.fulfill({
                json: {
                    data: makeConversation("c1", {
                        status: "ACCEPTED",
                        isRequest: false,
                        canSend: true,
                    }),
                    meta,
                },
            });
            return;
        }

        if (url.includes("/conversations") && method === "GET") {
            const isPending = url.includes("status=PENDING");
            await route.fulfill({
                json: { data: isPending ? pending : accepted, meta },
            });
            return;
        }

        if (url.includes("/conversations") && method === "PATCH") {
            await route.fulfill({ status: 204, body: "" });
            return;
        }

        await route.fulfill({ json: { data: null, meta } });
    });
}

test.describe("Direct messaging", () => {
    test("lists conversations and opens one", async ({
        authenticatedPage: page,
    }) => {
        await mockApi(page);

        await page.goto("/messages");

        await expect(page.getByText("Bob Builder").first()).toBeVisible();
        await expect(page.getByText("the last thing said")).toBeVisible();

        await page.getByText("the last thing said").click();

        await expect(page).toHaveURL(/\/messages\/c1$/);
        await expect(page.getByText("hello from bob")).toBeVisible();
    });

    test("sends a message and shows it straight away", async ({
        authenticatedPage: page,
    }) => {
        const sent: unknown[] = [];
        await mockApi(page, { onSend: (body) => sent.push(body) });

        await page.goto("/messages/c1");
        await expect(page.getByText("hello from bob")).toBeVisible();

        await page.getByPlaceholder("Write a message").fill("merhaba");
        await page.getByRole("button", { name: "Send" }).click();

        // The box empties only once the send has actually landed — a failure
        // has to leave the words where they are for a second try. So this is
        // asserted first, and it is also what makes the next line unambiguous:
        // until it holds, "merhaba" is on screen twice.
        await expect(page.getByPlaceholder("Write a message")).toHaveValue("");
        await expect(
            page.getByRole("paragraph").filter({ hasText: "merhaba" }),
        ).toBeVisible();
        expect(sent).toEqual([{ content: "merhaba", mediaUrls: [] }]);
    });

    /*
     * A request is listed in its own tab and does not raise the inbox badge —
     * the whole reason the API sends a separate event and excludes it from the
     * unread count.
     */
    test("shows a message request in its own tab and accepts it", async ({
        authenticatedPage: page,
    }) => {
        await mockApi(page, {
            accepted: [],
            pending: [
                makeConversation("c1", {
                    status: "PENDING",
                    isRequest: true,
                    canSend: false,
                }),
            ],
            thread: {
                conversation: makeConversation("c1", {
                    status: "PENDING",
                    isRequest: true,
                    canSend: false,
                }),
                messages: [makeMessage("m1")],
            },
        });

        await page.goto("/messages");
        await expect(page.getByText("No conversations yet")).toBeVisible();

        await page.getByRole("button", { name: /Requests/ }).click();
        await expect(page.getByText("Bob Builder").first()).toBeVisible();

        await page.getByText("Bob Builder").first().click();

        // Only the initiator may write to a request, so the recipient gets the
        // decision instead of a composer.
        await expect(page.getByText("You cannot write here.")).toBeVisible();
        await page.getByRole("button", { name: "Accept" }).click();

        await expect(page.getByPlaceholder("Write a message")).toBeVisible();
    });

    test("says a conversation was not found rather than that it was forbidden", async ({
        authenticatedPage: page,
    }) => {
        await page.route("**/api/v1/**", async (route, request) => {
            if (request.url().includes("/messages")) {
                await route.fulfill({
                    status: 404,
                    json: {
                        type: "about:blank",
                        title: "ConversationNotFoundError",
                        status: 404,
                        detail: "No such conversation.",
                    },
                });
                return;
            }
            await route.fulfill({ json: { data: null } });
        });

        await page.goto("/messages/nope");

        await expect(page.getByText("Conversation not found")).toBeVisible();
    });

    test("renders the four message states", async ({
        authenticatedPage: page,
    }) => {
        await mockApi(page, {
            thread: {
                conversation: makeConversation("c1"),
                messages: [
                    makeMessage("m4", { isDeleted: true, content: "" }),
                    makeMessage("m3", { mediaRejected: true }),
                    makeMessage("m2", { mediaPending: true }),
                    makeMessage("m1", {
                        isSensitive: true,
                        mediaUrls: ["https://cdn.example/a.jpg"],
                    }),
                ],
            },
        });

        await page.goto("/messages/c1");

        await expect(page.getByText("This message was deleted")).toBeVisible();
        await expect(page.getByText("Media removed")).toBeVisible();
        await expect(
            page.getByText("This video is being checked"),
        ).toBeVisible();
        await expect(page.getByText("Sensitive content")).toBeVisible();
    });
});
