import { useCallback, useEffect, useState } from "react";
import { feedApi } from "../../feed/api/feed.api";
import { articleApi } from "../../article/api/article.api";
import { profileApi } from "../../profile/api/profile.api";
import { useAuthStore } from "../../../core/auth/auth.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { PostCategory } from "../../feed/api/feed.types";
import type { OnboardingAccount } from "../onboarding.types";

/** `GET /posts` and `GET /articles` both cap `limit` at 50. */
const CONTENT_LIMIT = 50;

/** Below this many accounts the list is topped up with popular profiles. */
const TARGET_ACCOUNTS = 12;

/** `/profiles/suggestions` caps `limit` at 20. */
const SUGGESTIONS_LIMIT = 20;

interface RawAuthor {
    id: string;
    username?: string;
    fullName?: string | null;
    avatarUrl: string;
    isMe?: boolean;
}

/**
 * Turns the accounts writing in the chosen fields into a follow list.
 *
 * The API has no notion of a user's field: `Profile` carries no category and
 * `/profiles/suggestions` only ranks by follower count. What it does know is
 * which category a *post* or *article* is in, so an account's field is
 * inferred from what it publishes.
 *
 * This is the one place that inference lives. When the API grows profile
 * categories, only the body of `load` changes — a single
 * `profileApi.getSuggestions({ categories })` — and the page, the cards and
 * the gate stay as they are.
 */
export function useOnboardingSuggestions(categories: PostCategory[]) {
    const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentUserId = useAuthStore((state) => state.user?.id);

    // The array identity changes on every render of the caller, so the effect
    // keys off the values instead.
    const categoryKey = categories.join(",");

    const load = useCallback(async (): Promise<OnboardingAccount[]> => {
        const picked = categoryKey
            ? (categoryKey.split(",") as PostCategory[])
            : [];

        const [postResult, articleResult] = await Promise.allSettled([
            feedApi.getPosts({ categories: picked, limit: CONTENT_LIMIT }),
            articleApi.getArticles({
                categories: picked,
                limit: CONTENT_LIMIT,
            }),
        ]);

        const byId = new Map<string, OnboardingAccount>();

        const add = (author: RawAuthor) => {
            if (author.isMe || author.id === currentUserId) return;
            if (!author.username) return;

            const existing = byId.get(author.id);
            if (existing) {
                existing.contentCount += 1;
                return;
            }
            byId.set(author.id, {
                userId: author.id,
                username: author.username,
                fullName: author.fullName || author.username,
                avatarUrl: author.avatarUrl,
                contentCount: 1,
            });
        };

        if (postResult.status === "fulfilled") {
            postResult.value.forEach((post) => add(post.author));
        }
        if (articleResult.status === "fulfilled") {
            articleResult.value.forEach((article) => add(article.author));
        }

        const ranked = [...byId.values()].sort(
            (a, b) => b.contentCount - a.contentCount,
        );

        // Not a nicety: a field nobody has posted in yet would leave the list
        // empty, and the flow cannot be completed without accounts to follow.
        if (ranked.length < TARGET_ACCOUNTS) {
            const suggested =
                await profileApi.getSuggestions(SUGGESTIONS_LIMIT);
            suggested.forEach((user) => {
                if (byId.has(user.userId)) return;
                if (user.isMe || user.userId === currentUserId) return;
                ranked.push({
                    userId: user.userId,
                    username: user.username,
                    fullName: user.fullName || user.username,
                    avatarUrl: user.avatarUrl,
                    bio: user.bio ?? undefined,
                    followersCount: user.followersCount,
                    contentCount: 0,
                });
                byId.set(user.userId, ranked[ranked.length - 1]);
            });
        }

        return ranked;
    }, [categoryKey, currentUserId]);

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setAccounts(await load());
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, [load]);

    // `isLoading` starts true and `error` starts null, so the first run needs
    // no synchronous setState here — a re-run only happens if the chosen
    // fields change, which unmounts and remounts this step anyway.
    useEffect(() => {
        let cancelled = false;
        load()
            .then((next) => {
                if (!cancelled) setAccounts(next);
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [load]);

    return { accounts, isLoading, error, retry: fetchAccounts };
}
