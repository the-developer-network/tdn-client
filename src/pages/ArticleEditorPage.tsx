import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { Button } from "../shared/components/ui/Button";
import { Modal } from "../shared/components/ui/Modal";
import { SEO } from "../shared/components/ui/SEO";
import { MarkdownBody } from "../features/article/components/MarkdownBody";
import { TagInput } from "../features/article/components/TagInput";
import { CategoryPicker } from "../features/article/components/CategoryPicker";
import { CoverPicker } from "../features/article/components/CoverPicker";
import { SaveIndicator } from "../features/article/components/SaveIndicator";
import { useArticle } from "../features/article/hooks/useArticle";
import { useArticleEditor } from "../features/article/hooks/useArticleEditor";
import { ARTICLE_LIMITS } from "../features/article/api/article.types";
import type { Article } from "../features/article/api/article.types";
import { useAuthStore } from "../core/auth/auth.store";
import { useToastStore } from "../shared/store/toast.store";
import { useI18n } from "../shared/hooks/useI18n";

export default function ArticleEditorPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // Writing is not something a guest can start, and the editor would only
    // fail at its first save. Redirect before any of it renders.
    useEffect(() => {
        if (!isAuthenticated) navigate("/", { replace: true });
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) return null;

    // A new article has nothing to load, so it never mounts the loader —
    // asking the API for an empty slug spends a request on every visit to
    // the editor and answers with nothing useful.
    if (!slug) return <Editor initial={null} />;

    return <EditExisting slug={slug} />;
}

function EditExisting({ slug }: { slug: string }) {
    const { t } = useI18n();
    const { article, isLoading, error, retry } = useArticle(slug);

    if (isLoading) {
        return (
            <PageShell width="reading">
                <div className="flex h-40 items-center justify-center p-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-white" />
                </div>
            </PageShell>
        );
    }

    if (error || !article) {
        return (
            <PageShell width="reading">
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                    <p className="text-sm text-white/40">
                        {error ?? t("page.articleNotFound")}
                    </p>
                    {error && (
                        <Button variant="outline" size="sm" onClick={retry}>
                            {t("articleList.tryAgain")}
                        </Button>
                    )}
                </div>
            </PageShell>
        );
    }

    // Keyed so moving from one article's edit URL to another remounts
    // the editor. `useArticleEditor` seeds from `initial` in `useState`
    // initialisers, which run once per mount — without this the editor keeps
    // the first article's text while the URL claims the second, and the next
    // autosave writes it back to whichever id the hook is still holding.
    return <Editor key={article.id} initial={article} />;
}

/**
 * Split out and keyed by the loaded article so the editor's state is seeded
 * once, on mount, from a resolved article — `useArticleEditor` reads `initial`
 * in `useState` initialisers, which do not re-run.
 */
function Editor({ initial }: { initial: Article | null }) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const addToast = useToastStore((state) => state.addToast);
    const [tab, setTab] = useState<"write" | "preview">("write");
    const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);

    const {
        draft,
        update,
        slug,
        status,
        existingCoverUrl,
        coverFile,
        setCoverFile,
        removeExistingCover,
        canSave,
        isDirty,
        isBusy,
        saveState,
        saveError,
        save,
        publish,
        archive,
        remove,
    } = useArticleEditor(initial);

    // The browser's own prompt is the only thing that can interrupt a tab
    // close, and it only appears when there is genuinely something to lose.
    useEffect(() => {
        if (!isDirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [isDirty]);

    const bodyTooLong = draft.body.length > ARTICLE_LIMITS.bodyMax;
    const isPublished = status === "PUBLISHED";

    async function handlePublish() {
        const published = await publish();
        if (!published) return;
        addToast({ type: "success", message: t("editor.published") });
        navigate(`/articles/${published.slug}`);
    }

    async function handleArchive() {
        setConfirm(null);
        if (await archive()) {
            addToast({ type: "info", message: t("editor.archived") });
        }
    }

    async function handleDelete() {
        setConfirm(null);
        if (await remove()) {
            addToast({ type: "info", message: t("editor.deleted") });
            navigate("/", { replace: true });
        }
    }

    return (
        <PageShell width="reading">
            {/* Drafts must never be indexed, and a published article is
                canonical at its reading URL, not at its editor. */}
            <SEO
                title={initial ? t("editor.editTitle") : t("editor.newTitle")}
            />

            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md">
                <button
                    onClick={() => navigate(slug ? `/articles/${slug}` : "/")}
                    aria-label={t("common.back")}
                    className="-ml-2 rounded-full p-2 text-white transition-colors hover:bg-white/10"
                >
                    <ArrowLeft size={20} />
                </button>

                {status && (
                    <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                        {t(
                            status === "PUBLISHED"
                                ? "editor.statusPublished"
                                : status === "ARCHIVED"
                                  ? "editor.statusArchived"
                                  : "editor.statusDraft",
                        )}
                    </span>
                )}

                <SaveIndicator
                    state={saveState}
                    isDirty={isDirty}
                    canSave={canSave}
                    error={saveError}
                    onRetry={() => void save()}
                />

                <div className="ml-auto flex items-center gap-2">
                    {isPublished && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirm("archive")}
                            disabled={isBusy}
                        >
                            {t("editor.archive")}
                        </Button>
                    )}
                    {status && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirm("delete")}
                            disabled={isBusy}
                        >
                            {t("editor.delete")}
                        </Button>
                    )}
                    {!isPublished && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handlePublish}
                            disabled={!canSave || bodyTooLong || isBusy}
                        >
                            {isBusy
                                ? t("editor.publishing")
                                : t("editor.publish")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex border-b border-white/5">
                {(["write", "preview"] as const).map((value) => (
                    <button
                        key={value}
                        onClick={() => setTab(value)}
                        className={`relative flex-1 py-2.5 text-sm font-medium transition-colors ${
                            tab === value
                                ? "text-white"
                                : "text-white/40 hover:text-white/70"
                        }`}
                    >
                        {t(
                            value === "write"
                                ? "editor.write"
                                : "editor.preview",
                        )}
                        {tab === value && (
                            <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-white" />
                        )}
                    </button>
                ))}
            </div>

            {tab === "write" ? (
                <div className="flex flex-col gap-6 px-4 py-6">
                    <input
                        value={draft.title}
                        onChange={(e) =>
                            update(
                                "title",
                                e.target.value.slice(
                                    0,
                                    ARTICLE_LIMITS.titleMax,
                                ),
                            )
                        }
                        placeholder={t("editor.titlePlaceholder")}
                        aria-label={t("editor.titlePlaceholder")}
                        className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-tight text-white outline-none placeholder:text-white/20"
                    />

                    <CoverPicker
                        existingUrl={existingCoverUrl}
                        file={coverFile}
                        alt={draft.coverAlt}
                        onFileChange={setCoverFile}
                        onAltChange={(value) => update("coverAlt", value)}
                        onRemoveExisting={removeExistingCover}
                    />

                    <div>
                        <textarea
                            value={draft.body}
                            onChange={(e) => update("body", e.target.value)}
                            placeholder={t("editor.bodyPlaceholder")}
                            aria-label={t("editor.bodyPlaceholder")}
                            rows={18}
                            className="w-full resize-y bg-transparent text-[18px] leading-[1.75] text-white/80 outline-none placeholder:text-white/20"
                        />
                        {bodyTooLong && (
                            <p className="text-xs text-red-400/80">
                                {t("editor.bodyTooLong", {
                                    max: ARTICLE_LIMITS.bodyMax,
                                })}
                            </p>
                        )}
                    </div>

                    <Field label={t("editor.excerpt")}>
                        <textarea
                            value={draft.excerpt}
                            onChange={(e) =>
                                update(
                                    "excerpt",
                                    e.target.value.slice(
                                        0,
                                        ARTICLE_LIMITS.excerptMax,
                                    ),
                                )
                            }
                            placeholder={t("editor.excerptPlaceholder")}
                            aria-label={t("editor.excerpt")}
                            rows={2}
                            className="w-full resize-none bg-transparent text-sm text-white/70 outline-none placeholder:text-white/25"
                        />
                        <p className="text-xs text-white/30">
                            {t("editor.excerptHint")}
                        </p>
                    </Field>

                    <Field label={t("editor.tags")}>
                        <TagInput
                            tags={draft.tags}
                            onChange={(tags) => update("tags", tags)}
                        />
                    </Field>

                    <Field label={t("editor.categories")}>
                        <CategoryPicker
                            selected={draft.categories}
                            onChange={(categories) =>
                                update("categories", categories)
                            }
                        />
                    </Field>
                </div>
            ) : draft.body.trim() === "" ? (
                <p className="p-10 text-center text-sm italic text-white/30">
                    {t("editor.emptyPreview")}
                </p>
            ) : (
                <div>
                    {draft.title && (
                        <h1 className="px-4 pt-8 text-[32px] font-bold leading-[1.2] tracking-tight text-white sm:text-[40px]">
                            {draft.title}
                        </h1>
                    )}
                    {/* The same renderer the reading page uses, so the preview
                        cannot drift from what readers will actually get. */}
                    <MarkdownBody body={draft.body} />
                </div>
            )}

            <Modal isOpen={confirm !== null} onClose={() => setConfirm(null)}>
                <h3 className="text-lg font-bold text-white">
                    {t(
                        confirm === "delete"
                            ? "editor.deleteTitle"
                            : "editor.archiveTitle",
                    )}
                </h3>
                <p className="mt-2 text-sm text-white/60">
                    {t(
                        confirm === "delete"
                            ? "editor.deleteBody"
                            : "editor.archiveBody",
                    )}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirm(null)}
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={
                            confirm === "delete" ? handleDelete : handleArchive
                        }
                    >
                        {t(
                            confirm === "delete"
                                ? "editor.delete"
                                : "editor.archive",
                        )}
                    </Button>
                </div>
            </Modal>
        </PageShell>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5 border-t border-white/5 pt-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {label}
            </span>
            {children}
        </div>
    );
}
