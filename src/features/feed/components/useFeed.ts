import { useState, useCallback } from "react";
import { feedApi } from "../api/feed.api";
import type { GetPostsParams, Post, PostType } from "../api/feed.types";

export function useFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<PostType>("COMMUNITY");

    const fetchPosts = useCallback(async (arg?: PostType | GetPostsParams) => {
        setIsLoading(true);
        setError(null);
        try {
            const params: GetPostsParams =
                typeof arg === "string"
                    ? { page: 1, limit: 20, type: arg }
                    : { page: 1, limit: 20, ...arg };
            const data = await feedApi.getPosts(params);
            setPosts(data);
        } catch (err) {
            setError("Posts could not be loaded.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const changeCategory = useCallback(
        (type: PostType) => {
            setActiveCategory(type);
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
        error,
        fetchPosts,
        activeCategory,
        changeCategory,
        addPost,
        removePost,
    };
}
