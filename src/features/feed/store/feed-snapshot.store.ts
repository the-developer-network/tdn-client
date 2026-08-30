import { create } from "zustand";
import type { ArticleSummary } from "../../article/api/article.types";
import type { Post } from "../api/feed.types";

/**
 * What the feed looked like when the reader left it, so that coming back is a
 * restore rather than a fresh visit.
 *
 * Which tab and which filters produced this list are deliberately *not* here:
 * they live in the URL, so the history entry already carries them back and
 * there is no second copy to disagree with the list.
 */
export interface FeedSnapshot {
    posts: Post[];
    postPage: number;
    postsHaveMore: boolean;
    articles: ArticleSummary[];
    articlePage: number;
    articlesHaveMore: boolean;
    scrollY: number;
}

interface FeedSnapshotState {
    /**
     * The router's `location.key` for the entry this snapshot was taken from.
     * A snapshot is only ever restored onto that same entry: a key that does
     * not match means a different visit to the feed — a reload resets the key,
     * and a fresh navigation gets its own — and a fresh visit must fetch.
     */
    key: string | null;
    snapshot: FeedSnapshot | null;
    save: (key: string, snapshot: FeedSnapshot) => void;
    read: (key: string) => FeedSnapshot | null;
    /**
     * Fold a change made elsewhere — a like on the post's own page — back into
     * the stored list. Restoring no longer refetches, so without this the
     * reader would come back to the feed still showing the post unliked.
     *
     * Deliberately keyless: the caller is a post, and a post has no idea which
     * history entry the feed it came from is filed under.
     */
    patchPost: (id: string, changes: Partial<Post>) => void;
}

/**
 * One entry only. Holding several would need an eviction policy to stay
 * bounded, and the feed is a single route: the snapshot worth restoring is
 * always the last one left behind.
 *
 * Nothing subscribes to this store — it is read once per mount through
 * `getState()`, because a snapshot arriving mid-render would swap the list out
 * from under the reader.
 */
export const useFeedSnapshotStore = create<FeedSnapshotState>((set, get) => ({
    key: null,
    snapshot: null,

    save: (key, snapshot) => set({ key, snapshot }),

    read: (key) => {
        const state = get();
        return state.key === key ? state.snapshot : null;
    },

    patchPost: (id, changes) =>
        set((state) => {
            // Every like anywhere in the app comes through here, and most of
            // them are for a post no snapshot holds. Both misses cost one
            // scan and no allocation.
            const { snapshot } = state;
            if (!snapshot) return state;
            if (!snapshot.posts.some((post) => post.id === id)) return state;

            return {
                snapshot: {
                    ...snapshot,
                    posts: snapshot.posts.map((post) =>
                        post.id === id ? { ...post, ...changes } : post,
                    ),
                },
            };
        }),
}));
