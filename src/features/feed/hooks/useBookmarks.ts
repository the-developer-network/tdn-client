import { useState, useCallback, useEffect } from "react";
import { feedApi } from "../api/feed.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { BookmarksResponse, Post } from "../api/feed.types";
import type { Comment } from "../../comment/api/comment.types";
import type { ArticleSummary } from "../../article/api/article.types";

const LIMIT = 20;

export function useBookmarks() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [articles, setArticles] = useState<ArticleSummary[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // The endpoint pages posts, comments and articles together and reports
    // their totals in `meta`, which `apiClient` strips along with the rest of
    // the envelope. A full page of any of the three is the only signal left
    // that there is more behind.
    const applyPage = useCallback(
        (data: BookmarksResponse, mode: "replace" | "append") => {
            // `articles` arrived with a later API version than the other two,
            // so an older server answers without the field at all.
            const nextArticles = data.articles ?? [];

            if (mode === "replace") {
                setPosts(data.posts);
                setComments(data.comments);
                setArticles(nextArticles);
            } else {
                setPosts((prev) => [...prev, ...data.posts]);
                setComments((prev) => [...prev, ...data.comments]);
                setArticles((prev) => [...prev, ...nextArticles]);
            }

            setHasMore(
                data.posts.length === LIMIT ||
                    data.comments.length === LIMIT ||
                    nextArticles.length === LIMIT,
            );
        },
        [],
    );

    const fetchFirstPage = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await feedApi.getBookmarks({ page: 1, limit: LIMIT });
            applyPage(data, "replace");
            setPage(1);
        } catch (err) {
            setError(getErrorMessage(err));
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [applyPage]);

    useEffect(() => {
        let cancelled = false;
        feedApi
            .getBookmarks({ page: 1, limit: LIMIT })
            .then((data) => {
                if (cancelled) return;
                applyPage(data, "replace");
                setPage(1);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setHasMore(false);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [applyPage]);

    const loadMore = useCallback(() => {
        if (isLoadingMore) return;
        const nextPage = page + 1;
        setIsLoadingMore(true);

        feedApi
            .getBookmarks({ page: nextPage, limit: LIMIT })
            .then((data) => {
                applyPage(data, "append");
                setPage(nextPage);
            })
            .catch((err) => setError(getErrorMessage(err)))
            .finally(() => setIsLoadingMore(false));
    }, [page, isLoadingMore, applyPage]);

    const removePost = useCallback((postId: string) => {
        setPosts((prev) => prev.filter((post) => post.id !== postId));
    }, []);

    return {
        posts,
        comments,
        articles,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        fetchBookmarks: fetchFirstPage,
        retry: fetchFirstPage,
        loadMore,
        removePost,
    };
}
