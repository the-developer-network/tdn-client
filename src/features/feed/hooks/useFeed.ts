import { useState, useCallback } from "react";
import { feedApi } from "../api/feed-api";
import type { Post, PostType } from "../api/feed.types";

export function useFeed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<PostType>("COMMUNITY");

    const fetchPosts = useCallback(async (type?: PostType) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await feedApi.getPosts({ page: 1, limit: 20, type });
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

    return {
        posts,
        isLoading,
        error,
        fetchPosts,
        activeCategory,
        changeCategory,
    };
}
