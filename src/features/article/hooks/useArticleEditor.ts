import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { articleApi } from "../api/article.api";
import {
    MEDIA_ERROR_TITLES,
    isMediaError,
    withModerationRetry,
} from "../../../shared/utils/media-errors";
import { getErrorMessage } from "../../../shared/utils/error-handler";
import { ARTICLE_LIMITS } from "../api/article.types";
import type {
    Article,
    ArticleCategory,
    ArticleStatus,
    CreateArticleBody,
    UpdateArticleBody,
} from "../api/article.types";

/**
 * Quiet time before an autosave fires. Creation costs one request ever, and
 * updates are allowed 60 a minute, so two seconds is comfortably inside the
 * budget even for someone typing in short bursts.
 */
const AUTOSAVE_DELAY_MS = 2000;

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Why a draft cannot be sent, or `null` when it can. */
export type DraftProblem =
    "empty" | "titleTooLong" | "bodyTooLong" | "tooLarge";

/**
 * The server answers a schema violation with a bare 400 and a 413 with
 * nothing more specific, and neither names a field — so every limit has to be
 * checked here or the writer is told only that something went wrong.
 *
 * `serialised` is passed in rather than computed: the caller already has it
 * for the dirty check, and stringifying a hundred thousand characters twice
 * per render is not free.
 */
export function checkDraft(
    draft: ArticleDraft,
    serialised: string,
): DraftProblem | null {
    if (draft.title.trim() === "" || draft.body.trim() === "") return "empty";
    if (draft.title.length > ARTICLE_LIMITS.titleMax) return "titleTooLong";
    if (draft.body.length > ARTICLE_LIMITS.bodyMax) return "bodyTooLong";
    // Characters are not bytes. A body inside the character limit still
    // breaches the request cap once it carries Turkish letters or emoji, and
    // that arrives as a 413 rather than a validation error.
    if (
        new TextEncoder().encode(serialised).length >
        ARTICLE_LIMITS.requestBytesMax
    ) {
        return "tooLarge";
    }
    return null;
}

export interface ArticleDraft {
    title: string;
    body: string;
    excerpt: string;
    coverAlt: string;
    tags: string[];
    categories: ArticleCategory[];
}

const emptyDraft: ArticleDraft = {
    title: "",
    body: "",
    excerpt: "",
    coverAlt: "",
    tags: [],
    categories: [],
};

const draftOf = (article: Article): ArticleDraft => ({
    title: article.title,
    body: article.body,
    excerpt: article.excerpt ?? "",
    coverAlt: article.coverImageAlt ?? "",
    tags: article.tags.map((tag) => tag.name),
    categories: article.categories,
});

export function useArticleEditor(initial: Article | null) {
    const [draft, setDraft] = useState<ArticleDraft>(
        initial ? draftOf(initial) : emptyDraft,
    );
    const [articleId, setArticleId] = useState<string | null>(
        initial?.id ?? null,
    );
    const [slug, setSlug] = useState<string | null>(initial?.slug ?? null);
    const [status, setStatus] = useState<ArticleStatus | null>(
        initial?.status ?? null,
    );
    const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(
        initial?.coverImageUrl ?? null,
    );
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverRemoved, setCoverRemoved] = useState(false);

    const [saveState, setSaveState] = useState<SaveState>(
        initial ? "saved" : "idle",
    );
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);

    /**
     * The upload endpoint is rate limited to five a minute, so a cover is
     * uploaded once per chosen file and the key reused for every later save.
     * Without this, autosaving an article with a cover spends the whole
     * minute's budget in three keystroke pauses.
     */
    const uploadedCoverRef = useRef<{ file: File; key: string } | null>(null);

    // What the server last accepted, so an autosave with nothing new to say
    // does not fire at all. Held in state rather than a ref because `isDirty`
    // is computed during render, and a ref read there is not safe.
    const [savedSnapshot, setSavedSnapshot] = useState<string>(
        initial ? JSON.stringify(draftOf(initial)) : "",
    );
    const isSavingRef = useRef(false);
    // Set when an edit arrives mid-save; cleared by the follow-up save.
    const resaveRef = useRef(false);
    const articleIdRef = useRef<string | null>(initial?.id ?? null);
    const draftRef = useRef(draft);
    const coverFileRef = useRef<File | null>(null);
    const coverRemovedRef = useRef(false);

    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);
    useEffect(() => {
        coverFileRef.current = coverFile;
    }, [coverFile]);
    useEffect(() => {
        coverRemovedRef.current = coverRemoved;
    }, [coverRemoved]);

    const update = useCallback(
        <K extends keyof ArticleDraft>(key: K, value: ArticleDraft[K]) => {
            setDraft((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    // Serialised once per change and reused: the dirty check and the byte
    // check both need it, and it runs over the whole body.
    const serialised = useMemo(() => JSON.stringify(draft), [draft]);
    const problem = useMemo(
        () => checkDraft(draft, serialised),
        [draft, serialised],
    );
    const canSave = problem === null;

    const resolveCoverKey = useCallback(async (): Promise<
        string | null | undefined
    > => {
        const file = coverFileRef.current;
        if (file) {
            if (uploadedCoverRef.current?.file === file) {
                return uploadedCoverRef.current.key;
            }
            const { coverImageKey } = await withModerationRetry(() =>
                articleApi.uploadCover(file),
            );
            uploadedCoverRef.current = { file, key: coverImageKey };
            return coverImageKey;
        }
        // `null` erases the cover, `undefined` leaves it alone. Collapsing the
        // two would make removing a cover impossible.
        return coverRemovedRef.current ? null : undefined;
    }, []);

    const save = useCallback(async (): Promise<Article | null> => {
        const current = draftRef.current;
        // Re-checked here rather than trusted from the caller: `save` is also
        // reached from the retry button and from publish.
        if (checkDraft(current, JSON.stringify(current)) !== null) {
            return null;
        }
        // A save already running has captured an older draft. Rather than
        // dropping this one, mark that another is owed — the running save
        // picks it up when it finishes.
        if (isSavingRef.current) {
            resaveRef.current = true;
            return null;
        }

        isSavingRef.current = true;
        setSaveState("saving");
        setSaveError(null);

        try {
            const coverKey = await resolveCoverKey();
            const excerpt = current.excerpt.trim();
            const coverAlt = current.coverAlt.trim();
            let article: Article;

            if (articleIdRef.current) {
                const body: UpdateArticleBody = {
                    title: current.title.trim(),
                    body: current.body,
                    excerpt: excerpt === "" ? null : excerpt,
                    coverImageAlt: coverAlt === "" ? null : coverAlt,
                    tags: current.tags,
                    categories: current.categories,
                };
                if (coverKey !== undefined) body.coverImageKey = coverKey;
                article = await articleApi.updateArticle(
                    articleIdRef.current,
                    body,
                );
            } else {
                const body: CreateArticleBody = {
                    title: current.title.trim(),
                    body: current.body,
                    tags: current.tags,
                    categories: current.categories,
                };
                if (excerpt !== "") body.excerpt = excerpt;
                if (coverAlt !== "") body.coverImageAlt = coverAlt;
                if (coverKey) body.coverImageKey = coverKey;
                article = await articleApi.createArticle(body);
                articleIdRef.current = article.id;
                setArticleId(article.id);
                setSlug(article.slug);
                setStatus(article.status);
            }

            setSavedSnapshot(JSON.stringify(current));
            // The upload has been spent; from here the article owns the cover.
            if (coverFileRef.current) {
                setExistingCoverUrl(article.coverImageUrl);
                setCoverFile(null);
            }
            if (coverRemovedRef.current) {
                setExistingCoverUrl(null);
                setCoverRemoved(false);
            }
            setSaveState("saved");
            return article;
        } catch (err) {
            /*
             * An upload belongs to exactly one article, and `resolveCoverKey`
             * memoises the key so a retry does not spend a second upload on
             * the same file. Those two are safe together only while the retry
             * follows a save that never landed — which is the ordinary case,
             * a 5xx.
             *
             * They come apart when the request times out after the server did
             * write: the article now owns that key, the cached one is spent,
             * and every retry from here re-sends it and is refused. Dropping
             * the cache turns that from a locked editor into one more upload.
             */
            if (isMediaError(err, MEDIA_ERROR_TITLES.notOwned)) {
                uploadedCoverRef.current = null;
            }
            setSaveError(getErrorMessage(err));
            setSaveState("error");
            return null;
        } finally {
            isSavingRef.current = false;
        }
    }, [resolveCoverKey]);

    /**
     * Runs the save, then runs it again if the writer typed while it was in
     * flight. The autosave effect will not re-fire on its own for that edit —
     * its dependencies are unchanged by the time the request resolves — so
     * without this the newer text is never sent and is lost with no error
     * shown anywhere.
     */
    const saveChain = useCallback(async (): Promise<Article | null> => {
        const first = await save();
        if (!first || !resaveRef.current) return first;
        resaveRef.current = false;
        // Returned as-is rather than falling back to `first`. A follow-up that
        // failed must not read as success: publish would then go ahead with
        // text one edit behind what the writer is looking at.
        return save();
    }, [save]);

    const isDirty =
        serialised !== savedSnapshot || coverFile !== null || coverRemoved;

    // Autosave. Deliberately keyed on the serialised draft rather than on a
    // dirty flag, so the timer restarts on every edit and only the pause at
    // the end of a burst reaches the network.
    useEffect(() => {
        if (!canSave || !isDirty || isBusy) return;
        const timer = setTimeout(() => {
            void saveChain();
        }, AUTOSAVE_DELAY_MS);
        return () => clearTimeout(timer);
    }, [draft, coverFile, coverRemoved, canSave, isDirty, isBusy, saveChain]);

    /** Saves anything outstanding, then moves the article out of DRAFT. */
    const publish = useCallback(async (): Promise<Article | null> => {
        setIsBusy(true);
        try {
            const saved = await saveChain();
            const id = articleIdRef.current;
            if (!id) return null;
            // A save that failed leaves the server holding older text; going
            // ahead would publish that instead of what is on screen.
            if (!saved && isDirty) return null;

            const article = await articleApi.publishArticle(id);
            setStatus(article.status);
            setSlug(article.slug);
            return article;
        } catch (err) {
            setSaveError(getErrorMessage(err));
            setSaveState("error");
            return null;
        } finally {
            setIsBusy(false);
        }
    }, [saveChain, isDirty]);

    const archive = useCallback(async (): Promise<boolean> => {
        const id = articleIdRef.current;
        if (!id) return false;
        setIsBusy(true);
        try {
            const article = await articleApi.archiveArticle(id);
            setStatus(article.status);
            return true;
        } catch (err) {
            setSaveError(getErrorMessage(err));
            setSaveState("error");
            return false;
        } finally {
            setIsBusy(false);
        }
    }, []);

    const remove = useCallback(async (): Promise<boolean> => {
        const id = articleIdRef.current;
        if (!id) return true;
        setIsBusy(true);
        try {
            await articleApi.deleteArticle(id);
            return true;
        } catch (err) {
            setSaveError(getErrorMessage(err));
            setSaveState("error");
            return false;
        } finally {
            setIsBusy(false);
        }
    }, []);

    return {
        draft,
        update,
        articleId,
        slug,
        status,
        existingCoverUrl,
        coverFile,
        setCoverFile,
        removeExistingCover: () => {
            setCoverRemoved(true);
            setExistingCoverUrl(null);
        },
        canSave,
        problem,
        isDirty,
        isBusy,
        saveState,
        saveError,
        save: saveChain,
        publish,
        archive,
        remove,
    };
}
