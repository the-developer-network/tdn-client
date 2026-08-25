import { useState, useEffect, useCallback } from "react";
import { articleApi } from "../api/article.api";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import type { Article } from "../api/article.types";

export function useArticle(slug: string) {
    const [article, setArticle] = useState<Article | null>(null);
    const [fetchedSlug, setFetchedSlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const isLoading = fetchedSlug !== slug;

    useEffect(() => {
        let cancelled = false;

        articleApi
            .getArticleBySlug(slug)
            .then((data) => {
                if (cancelled) return;
                setArticle(data);
                setError(null);
                setFetchedSlug(slug);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(getErrorMessage(err));
                setFetchedSlug(slug);
            });

        return () => {
            cancelled = true;
        };
    }, [slug, reloadKey]);

    // Clearing `fetchedSlug` puts the hook back into its loading state, so the
    // page shows the spinner again rather than the stale error.
    const retry = useCallback(() => {
        setError(null);
        setFetchedSlug(null);
        setReloadKey((key) => key + 1);
    }, []);

    return { article: isLoading ? null : article, isLoading, error, retry };
}
