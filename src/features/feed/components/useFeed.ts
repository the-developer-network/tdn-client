import { useState, useCallback, useRef, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import { useI18n } from "../../../shared/hooks/useI18n";
import { assertList } from "../../../shared/utils/assert-list";
import type {
    GetPostsParams,
    Post,
    PostCategory,
    PostType,
} from "../api/feed.types";

const PAGE_LIMIT = 20;

/**
 * A feed the caller already has, handed back after a browser Back. Read only
 * by the state initialisers, so it is a mount-time decision: a snapshot that
 * arrived later would replace the list the reader is looking at.
 */
export interface FeedRestore {
    posts: Post[];
    page: number;
    hasMore: boolean;
    /**
     * The type page 1 was fetched with. Seeds `lastFetchParamsRef`, or the
     * first `loadMore` after a restore would ask for page 2 of an unfiltered
     * feed and append posts from another tab.
     */
    type: PostType;
}

export function useFeed(
    followedOnly: boolean = false,
    categories: PostCategory[] = [],
    restore?: FeedRestore,
) {
    const { t } = useI18n();
    const [posts, setPosts] = useState<Post[]>(restore?.posts ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(restore ? restore.hasMore : true);
    const pageRef = useRef(restore?.page ?? 1);
    // The ref stays the source of truth for the async paths, which read and
    // advance it inside a single tick. This mirror exists only to hand the
    // page out: reading a ref during render is not allowed, and rendering
    // from one would be wrong anyway.
    const [page, setPage] = useState(restore?.page ?? 1);
    const followedOnlyRef = useRef(followedOnly);
    const categoriesRef = useRef(categories);
    const lastFetchParamsRef = useRef<PostType | GetPostsParams | undefined>(
        restore?.type,
    );
    const requestIdRef = useRef(0);

    useEffect(() => {
        followedOnlyRef.current = followedOnly;
    }, [followedOnly]);

    useEffect(() => {
        categoriesRef.current = categories;
    }, [categories]);

    // Page 2 has to repeat whatever narrowed page 1, so both go through here.
    // Rebuilding `loadMore` from the post type alone dropped a `tag` filter
    // and appended unrelated posts.
    const buildParams = useCallback(
        (
            arg: PostType | GetPostsParams | undefined,
            page: number,
        ): GetPostsParams =>
            typeof arg === "string"
                ? {
                      page,
                      limit: PAGE_LIMIT,
                      type: arg,
                      followedOnly: followedOnlyRef.current,
                      categories: categoriesRef.current,
                  }
                : {
                      page,
                      limit: PAGE_LIMIT,
                      followedOnly: followedOnlyRef.current,
                      categories: categoriesRef.current,
                      ...arg,
                  },
        [],
    );

    const fetchPosts = useCallback(
        async (arg?: PostType | GetPostsParams) => {
            setIsLoading(true);
            setError(null);
            setLoadMoreError(null);
            pageRef.current = 1;
            setPage(1);
            lastFetchParamsRef.current = arg;

            // Switching tabs quickly leaves several requests in flight. Only
            // the newest may write state, otherwise a slow earlier response
            // can land last and show posts from the tab you just left.
            const requestId = ++requestIdRef.current;

            try {
                const data = await feedApi.getPosts(buildParams(arg, 1));
                if (requestId !== requestIdRef.current) return;
                // Checked before anything is committed. Reading `.length`
                // straight after `setPosts` looks equivalent, but the throw
                // lands after the state is already holding the bad value: the
                // reader sees the error while `posts` is a `null` that takes
                // the page down the next time anything touches it.
                assertList(data);
                setPosts(data);
                setHasMore(data.length === PAGE_LIMIT);
            } catch {
                if (requestId !== requestIdRef.current) return;
                setError(t("postList.error"));
            } finally {
                if (requestId === requestIdRef.current) setIsLoading(false);
            }
        },
        [t, buildParams],
    );

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        const nextPage = pageRef.current + 1;
        const requestId = requestIdRef.current;
        try {
            const data = await feedApi.getPosts(
                buildParams(lastFetchParamsRef.current, nextPage),
            );
            // A tab switch during the request makes this page belong to a feed
            // the user has already left; appending it would mix the two.
            if (requestId !== requestIdRef.current) return;
            assertList(data);
            setPosts((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            pageRef.current = nextPage;
            setPage(nextPage);
        } catch {
            if (requestId !== requestIdRef.current) return;
            setLoadMoreError(t("postList.loadMoreError"));
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, t, buildParams]);

    const addPost = useCallback((post: Post) => {
        setPosts((prev) => [post, ...prev]);
    }, []);

    const removePost = useCallback((postId: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
    }, []);

    const retry = useCallback(() => {
        fetchPosts(lastFetchParamsRef.current);
    }, [fetchPosts]);

    const retryLoadMore = useCallback(() => {
        setLoadMoreError(null);
        loadMore();
    }, [loadMore]);

    return {
        posts,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        fetchPosts,
        retry,
        addPost,
        removePost,
        hasMore,
        loadMore,
        retryLoadMore,
        // Nothing renders from this — it exists so the page the reader had
        // reached can be snapshotted and paged on from after a Back.
        page,
    };
}
