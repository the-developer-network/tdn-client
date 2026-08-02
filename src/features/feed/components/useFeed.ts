import { useState, useCallback, useRef, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import { useI18n } from "../../../shared/hooks/useI18n";
import type {
    GetPostsParams,
    Post,
    PostCategory,
    PostType,
} from "../api/feed.types";

const PAGE_LIMIT = 20;

export function useFeed(
    followedOnly: boolean = false,
    categories: PostCategory[] = [],
) {
    const { t } = useI18n();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<PostType>("COMMUNITY");
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(1);
    const followedOnlyRef = useRef(followedOnly);
    const categoriesRef = useRef(categories);
    const lastFetchParamsRef = useRef<PostType | GetPostsParams | undefined>(
        undefined,
    );
    const requestIdRef = useRef(0);

    useEffect(() => {
        followedOnlyRef.current = followedOnly;
    }, [followedOnly]);

    useEffect(() => {
        categoriesRef.current = categories;
    }, [categories]);

    // Page 2 has to repeat whatever narrowed page 1, so both go through here.
    // Rebuilding `loadMore` from `activeCategory` alone dropped a `tag` filter
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
            lastFetchParamsRef.current = arg;

            // Switching tabs quickly leaves several requests in flight. Only
            // the newest may write state, otherwise a slow earlier response
            // can land last and show posts from the tab you just left.
            const requestId = ++requestIdRef.current;

            try {
                const data = await feedApi.getPosts(buildParams(arg, 1));
                if (requestId !== requestIdRef.current) return;
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
            setPosts((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            pageRef.current = nextPage;
        } catch {
            if (requestId !== requestIdRef.current) return;
            setLoadMoreError(t("postList.loadMoreError"));
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, t, buildParams]);

    const changeCategory = useCallback(
        (type: PostType) => {
            setActiveCategory(type);
            setHasMore(true);
            fetchPosts(type);
        },
        [fetchPosts],
    );

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
        activeCategory,
        changeCategory,
        addPost,
        removePost,
        hasMore,
        loadMore,
        retryLoadMore,
    };
}
