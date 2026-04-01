import { useState, useCallback, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import type { Post } from "../api/feed.types";

export function useBookmarks() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBookmarks = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await feedApi.getBookmarks({ page: 1, limit: 20 });
            setPosts(data);
        } catch (err) {
            setError("Bookmarks could not be loaded.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookmarks();
    }, [fetchBookmarks]);

    return { posts, isLoading, error, fetchBookmarks };
}
