import { useCallback, useEffect, useRef, useState } from "react";
import { profileApi } from "../../profile/api/profile.api";
import { useToastStore } from "../../../shared/store/toast.store";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { PostCategory } from "../../feed/api/feed.types";
import type { BotProfile } from "../../profile/api/profile.types";
import type { OnboardingAccount } from "../onboarding.types";

/**
 * The endpoint's ceiling, and one page is the whole flow for almost everyone:
 * the thinnest field carries 25 bots, well past `MIN_FOLLOWS`. The second page
 * exists for the user who wants to keep scrolling, not for the requirement.
 */
export const BOT_PAGE_SIZE = 50;

function toAccount(bot: BotProfile): OnboardingAccount {
    return {
        userId: bot.userId,
        username: bot.username,
        fullName: bot.fullName || bot.username,
        avatarUrl: bot.avatarUrl,
        bio: bot.bio ?? "",
        followersCount: bot.followersCount,
        categories: bot.categories ?? [],
        isFollowing: bot.isFollowing,
    };
}

/**
 * The news bots publishing in the chosen fields, newest page appended.
 *
 * This used to infer an account's field from the categories of the posts and
 * articles it had written, because `Profile` carried no category of its own.
 * `GET /profiles/bots` is that data source arriving for real, so the inference
 * is gone: one request, filtered server-side, ranked by follower count, and
 * carrying `isFollowing` so a returning user is not re-sold the bots they
 * already follow.
 *
 * Several fields go out as one comma-joined request — a bot matches on *any*
 * of them, so a request per field would fetch the same bots repeatedly and
 * spend the 100/minute budget doing it.
 */
export function useOnboardingSuggestions(categories: PostCategory[]) {
    const addToast = useToastStore((state) => state.addToast);

    // The array identity changes on every render of the caller, so everything
    // downstream keys off the values instead.
    const categoryKey = categories.join(",");

    const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    /**
     * Bumped whenever the list is restarted or thrown away. A "show more"
     * still in flight when the fields change would otherwise append a page of
     * the old field's bots onto the new list.
     */
    const generation = useRef(0);

    const fetchPage = useCallback(
        (offset: number): Promise<OnboardingAccount[]> =>
            profileApi
                .getBots({
                    categories: categoryKey
                        ? (categoryKey.split(",") as PostCategory[])
                        : [],
                    limit: BOT_PAGE_SIZE,
                    offset,
                })
                .then((bots) => bots.map(toAccount)),
        [categoryKey],
    );

    /**
     * Deliberately sets no state synchronously: this runs from an effect, and
     * a `setState` in an effect body is a cascading render (and a lint error).
     * `isLoading` starts true and `error` starts null, so the first run needs
     * nothing set up front, and every later run clears the error on the way
     * through instead.
     */
    const load = useCallback((): Promise<void> => {
        const run = ++generation.current;

        return fetchPage(0)
            .then((page) => {
                if (generation.current !== run) return;
                setAccounts(page);
                setHasMore(page.length === BOT_PAGE_SIZE);
                setError(null);
            })
            .catch((err) => {
                if (generation.current !== run) return;
                setAccounts([]);
                setHasMore(false);
                setError(getErrorMessage(err));
            })
            .finally(() => {
                if (generation.current === run) setIsLoading(false);
            });
    }, [fetchPage]);

    useEffect(() => {
        load();
        // Invalidates whatever is in flight, which covers both a change of
        // fields and an unmount.
        return () => {
            generation.current += 1;
        };
    }, [load]);

    // Pressing "try again" is an event, so this one *can* show the spinner
    // straight away — and it has to, or the retry button looks dead until the
    // request comes back.
    const retry = useCallback((): Promise<void> => {
        setIsLoading(true);
        setError(null);
        return load();
    }, [load]);

    const loadMore = useCallback(() => {
        if (isLoading || isLoadingMore || !hasMore) return;

        const run = generation.current;
        setIsLoadingMore(true);

        fetchPage(accounts.length)
            .then((page) => {
                if (generation.current !== run) return;
                setAccounts((prev) => {
                    // The ranking key is follower count and following a bot
                    // raises it, so a bot can slide across the page boundary
                    // mid-flow and arrive twice. React would then render two
                    // rows under one key.
                    const seen = new Set(prev.map((a) => a.userId));
                    return [
                        ...prev,
                        ...page.filter((a) => !seen.has(a.userId)),
                    ];
                });
                setHasMore(page.length === BOT_PAGE_SIZE);
            })
            .catch((err) => {
                if (generation.current !== run) return;
                // Toasted rather than raised into `error`: the page renders
                // the error state instead of the list, and losing a screen of
                // bots the user may already have followed to report a failed
                // second page is the wrong trade.
                addToast({ type: "error", message: getErrorMessage(err) });
            })
            .finally(() => {
                // Unconditional, unlike the first-page load: nothing else ever
                // raises this flag, so a superseded page that left it set
                // would disable "show more" for good.
                setIsLoadingMore(false);
            });
    }, [
        accounts.length,
        fetchPage,
        hasMore,
        isLoading,
        isLoadingMore,
        addToast,
    ]);

    return {
        accounts,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        retry,
    };
}
