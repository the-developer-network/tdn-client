import { useState, useCallback, useRef, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import type { GetPostsParams, Post, PostType } from "../api/feed.types";

const PAGE_LIMIT = 20;

export function useFeed(followedOnly: boolean = false) {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<PostType>("COMMUNITY");
    const [hasMore, setHasMore] = useState(true);
    const pageRef = useRef(1);
    const followedOnlyRef = useRef(followedOnly);

    useEffect(() => {
        followedOnlyRef.current = followedOnly;
    }, [followedOnly]);

    const fetchPosts = useCallback(async (arg?: PostType | GetPostsParams) => {
        setIsLoading(true);
        setError(null);
        pageRef.current = 1;
        try {
            const params: GetPostsParams =
                typeof arg === "string"
                    ? {
                          page: 1,
                          limit: PAGE_LIMIT,
                          type: arg,
                          followedOnly: followedOnlyRef.current,
                      }
                    : {
                          page: 1,
                          limit: PAGE_LIMIT,
                          followedOnly: followedOnlyRef.current,
                          ...arg,
                      };
            const data = await feedApi.getPosts(params);
            setPosts(data);
            setHasMore(data.length === PAGE_LIMIT);
        } catch (err) {
            setError("Posts could not be loaded.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        const nextPage = pageRef.current + 1;
        try {
            const data = await feedApi.getPosts({
                page: nextPage,
                limit: PAGE_LIMIT,
                type: activeCategory,
                followedOnly: followedOnlyRef.current,
            });
            setPosts((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_LIMIT);
            pageRef.current = nextPage;
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, activeCategory]);

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

    return {
        posts,
        isLoading,
        isLoadingMore,
        error,
        fetchPosts,
        activeCategory,
        changeCategory,
        addPost,
        removePost,
        hasMore,
        loadMore,
    };
}
