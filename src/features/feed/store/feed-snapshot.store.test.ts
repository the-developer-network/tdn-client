import { beforeEach, describe, expect, it } from "vitest";
import { useFeedSnapshotStore } from "./feed-snapshot.store";
import type { FeedSnapshot } from "./feed-snapshot.store";
import type { Post } from "../api/feed.types";

// Types only in the import graph, so this file needs none of the localStorage
// scaffolding the stores that reach `useAuthStore` do.

function makePost(id: string): Post {
    return {
        mentions: [],
        isSensitive: false,
        mediaPending: false,
        id,
        content: `post ${id}`,
        type: "COMMUNITY",
        mediaUrls: [],
        createdAt: "2026-08-30T00:00:00.000Z",
        likeCount: 5,
        commentCount: 0,
        isLiked: false,
        isBookmarked: false,
        quoteCount: 0,
        quotedPost: null,
        author: { id: "user-2", username: "bob", avatarUrl: "" },
    };
}

function makeSnapshot(posts: Post[]): FeedSnapshot {
    return {
        posts,
        postPage: 2,
        postsHaveMore: true,
        articles: [],
        articlePage: 1,
        articlesHaveMore: false,
        scrollY: 1200,
    };
}

beforeEach(() => {
    useFeedSnapshotStore.setState({ key: null, snapshot: null });
});

describe("useFeedSnapshotStore", () => {
    describe("read", () => {
        it("hands the snapshot back to the entry it was taken from", () => {
            const snapshot = makeSnapshot([makePost("post-1")]);
            useFeedSnapshotStore.getState().save("entry-1", snapshot);

            expect(useFeedSnapshotStore.getState().read("entry-1")).toBe(
                snapshot,
            );
        });

        it("refuses an entry it was not taken from", () => {
            useFeedSnapshotStore
                .getState()
                .save("entry-1", makeSnapshot([makePost("post-1")]));

            // A different key is a different visit — a reload resets it, a
            // fresh navigation gets its own — and a fresh visit must fetch.
            expect(useFeedSnapshotStore.getState().read("entry-2")).toBeNull();
        });

        it("returns null before anything has been saved", () => {
            expect(useFeedSnapshotStore.getState().read("entry-1")).toBeNull();
        });

        it("keeps only the last feed left behind", () => {
            const first = makeSnapshot([makePost("post-1")]);
            const second = makeSnapshot([makePost("post-2")]);
            useFeedSnapshotStore.getState().save("entry-1", first);
            useFeedSnapshotStore.getState().save("entry-2", second);

            expect(useFeedSnapshotStore.getState().read("entry-1")).toBeNull();
            expect(useFeedSnapshotStore.getState().read("entry-2")).toBe(
                second,
            );
        });
    });

    describe("patchPost", () => {
        it("folds a change made elsewhere into the stored post", () => {
            useFeedSnapshotStore
                .getState()
                .save("entry-1", makeSnapshot([makePost("post-1")]));

            useFeedSnapshotStore
                .getState()
                .patchPost("post-1", { isLiked: true, likeCount: 6 });

            const [post] = useFeedSnapshotStore
                .getState()
                .read("entry-1")!.posts;
            expect(post.isLiked).toBe(true);
            expect(post.likeCount).toBe(6);
        });

        it("leaves the rest of the snapshot alone", () => {
            const kept = makePost("post-2");
            useFeedSnapshotStore
                .getState()
                .save("entry-1", makeSnapshot([makePost("post-1"), kept]));

            useFeedSnapshotStore
                .getState()
                .patchPost("post-1", { isLiked: true });

            const restored = useFeedSnapshotStore.getState().read("entry-1")!;
            expect(restored.posts[1]).toBe(kept);
            // The page and offset are what make coming back a restore rather
            // than a fresh visit; a like must not disturb them.
            expect(restored.postPage).toBe(2);
            expect(restored.scrollY).toBe(1200);
        });

        it("does nothing for a post the snapshot does not hold", () => {
            const snapshot = makeSnapshot([makePost("post-1")]);
            useFeedSnapshotStore.getState().save("entry-1", snapshot);

            useFeedSnapshotStore
                .getState()
                .patchPost("post-9", { isLiked: true });

            // Identity, not equality: every like anywhere in the app comes
            // through here, and a miss must not rebuild the list.
            expect(useFeedSnapshotStore.getState().read("entry-1")).toBe(
                snapshot,
            );
        });

        it("does nothing when there is no snapshot at all", () => {
            useFeedSnapshotStore
                .getState()
                .patchPost("post-1", { isLiked: true });

            expect(useFeedSnapshotStore.getState().snapshot).toBeNull();
        });
    });
});
