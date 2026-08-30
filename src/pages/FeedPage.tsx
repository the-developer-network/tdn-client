import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Link,
    useLocation,
    useNavigationType,
    useSearchParams,
} from "react-router-dom";
import { PenLine, Users } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { PostBox } from "../features/feed/components/PostBox";
import { useFeed } from "../features/feed/components/useFeed";
import { ArticleList } from "../features/article/components/ArticleList";
import { useArticles } from "../features/article/hooks/useArticles";
import {
    useFeedSnapshotStore,
    type FeedSnapshot,
} from "../features/feed/store/feed-snapshot.store";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { PostCategory, PostType } from "../features/feed/api/feed.types";
import { ProfileSearchDropdown } from "../features/profile/components/ProfileSearchDropdown";
import { SEO } from "../shared/components/ui/SEO";
import { useI18n } from "../shared/hooks/useI18n";
import type { TranslationKey } from "../shared/i18n/translations";
import { CATEGORY_OPTIONS } from "../shared/constants/categories";

/**
 * Articles are a separate resource, not a `PostType` — they have their own
 * endpoints, their own slugged detail route and a markdown body. The tab sits
 * alongside the post filters because that is where readers look for it, but it
 * cannot be a value in the `PostType` union, so the strip is keyed by this
 * wider type and the articles case is branched on explicitly.
 */
type FeedTab = PostType | "ARTICLES";

const ARTICLES_TAB = "ARTICLES";

/**
 * Which tab is open, and how each list is narrowed, live in the query string
 * rather than in component state.
 *
 * They used to be `useState`, and the page paid for it at the only moment that
 * matters: opening a post unmounts the feed, so Back rebuilt it from the
 * defaults — Community, no filters, page 1 — no matter which tab the reader
 * had been reading. The URL is the one piece of a page the browser already
 * restores, so putting the tab there makes Back correct by construction, and
 * makes a filtered feed a link someone can send.
 *
 * The slugs are their own vocabulary rather than the `PostType` values,
 * because these end up in front of readers; renaming a post type in the API
 * must not break a shared link.
 */
const TAB_PARAM = "tab";
const FOLLOWING_PARAM = "following";
const CATEGORIES_PARAM = "categories";

const CATEGORIES: { labelKey: TranslationKey; value: FeedTab; slug: string }[] =
    [
        { labelKey: "feed.community", value: "COMMUNITY", slug: "community" },
        { labelKey: "feed.news", value: "TECH_NEWS", slug: "news" },
        { labelKey: "feed.updates", value: "SYSTEM_UPDATE", slug: "updates" },
        { labelKey: "feed.articles", value: ARTICLES_TAB, slug: "articles" },
    ];

const FOLLOWED_ONLY_TABS: FeedTab[] = ["TECH_NEWS", "SYSTEM_UPDATE"];

/** An unknown slug opens the default tab rather than an empty page. */
function tabFromSlug(slug: string | null): FeedTab {
    return CATEGORIES.find((tab) => tab.slug === slug)?.value ?? "COMMUNITY";
}

function slugFromTab(tab: FeedTab): string {
    return CATEGORIES.find((entry) => entry.value === tab)?.slug ?? "community";
}

/** Anything the taxonomy does not know is dropped, not passed to the API. */
function parseCategories(raw: string): PostCategory[] {
    if (!raw) return [];
    return raw
        .split(",")
        .filter((value): value is PostCategory =>
            CATEGORY_OPTIONS.some((option) => option.value === value),
        );
}

export default function FeedPage() {
    const { t } = useI18n();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigationType = useNavigationType();
    const locationKey = useLocation().key;

    const activeTab = tabFromSlug(searchParams.get(TAB_PARAM));
    const followedOnly = searchParams.get(FOLLOWING_PARAM) === "1";
    const categoriesParam = searchParams.get(CATEGORIES_PARAM) ?? "";
    // Memoised on the raw string: a fresh array every render would be a fresh
    // dependency every render, and the fetch effect would never stop firing.
    const selectedCategories = useMemo(
        () => parseCategories(categoriesParam),
        [categoriesParam],
    );

    const isArticles = activeTab === ARTICLES_TAB;
    // The post feed underneath keeps running on Community while Articles is
    // open; its effect stands down, so nothing is fetched for it.
    const postType: PostType = isArticles ? "COMMUNITY" : activeTab;

    /**
     * Only a POP — the browser's Back or Forward — may restore. A PUSH to `/`
     * is someone asking for the feed again (the Home link, a notification),
     * and that should show them a current one.
     *
     * Read once, in a ref initialiser, so the decision belongs to this mount:
     * a snapshot picked up later would replace the list mid-read.
     */
    const [restored] = useState<FeedSnapshot | null>(() =>
        navigationType === "POP"
            ? useFeedSnapshotStore.getState().read(locationKey)
            : null,
    );

    const {
        posts,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        fetchPosts,
        addPost,
        removePost,
        hasMore,
        loadMore,
        retry,
        retryLoadMore,
        page: postPage,
    } = useFeed(
        followedOnly,
        selectedCategories,
        restored
            ? {
                  posts: restored.posts,
                  page: restored.postPage,
                  hasMore: restored.postsHaveMore,
                  type: postType,
              }
            : undefined,
    );

    const {
        articles,
        isLoading: articlesLoading,
        isLoadingMore: articlesLoadingMore,
        error: articlesError,
        loadMoreError: articlesLoadMoreError,
        hasMore: hasMoreArticles,
        fetchArticles,
        loadMore: loadMoreArticles,
        retry: retryArticles,
        retryLoadMore: retryLoadMoreArticles,
        page: articlePage,
    } = useArticles(
        restored
            ? {
                  articles: restored.articles,
                  page: restored.articlePage,
                  hasMore: restored.articlesHaveMore,
                  params: { followedOnly, categories: selectedCategories },
              }
            : undefined,
    );

    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const openModal = useAuthModalStore((state) => state.openModal);

    /**
     * Everything that decides which list is on screen, as one string. A
     * restored feed is already showing the answer for this identity, so the
     * effects below can tell "the reader just came back to this" from "the
     * reader changed something" without a one-shot flag that React's double
     * invocation in development would burn on the first render.
     *
     * `isAuthenticated` is in here because signing in changes what the feed
     * returns, and that has to count as a different feed.
     */
    const feedIdentity = `${activeTab}|${followedOnly}|${categoriesParam}|${isAuthenticated}`;
    const restoredIdentityRef = useRef(restored ? feedIdentity : null);

    // The two lists fetch from different endpoints, so each effect stands down
    // while the other tab is showing — otherwise switching to Articles would
    // still refetch posts on every filter change behind it.
    useEffect(() => {
        if (isArticles) return;
        if (restoredIdentityRef.current === feedIdentity) return;
        restoredIdentityRef.current = null;
        fetchPosts(postType);
    }, [isArticles, feedIdentity, postType, fetchPosts]);

    useEffect(() => {
        if (!isArticles) return;
        if (restoredIdentityRef.current === feedIdentity) return;
        restoredIdentityRef.current = null;
        fetchArticles({ followedOnly, categories: selectedCategories });
    }, [
        isArticles,
        feedIdentity,
        fetchArticles,
        followedOnly,
        selectedCategories,
    ]);

    /**
     * Captured on every scroll rather than read at unmount. Leaving the feed
     * swaps in a shorter page, and the browser clamps `window.scrollY` to the
     * new height as the DOM changes — before any cleanup runs, so by then the
     * number is already gone.
     */
    const scrollYRef = useRef(restored?.scrollY ?? 0);
    useEffect(() => {
        const handleScroll = () => {
            scrollYRef.current = window.scrollY;
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useLayoutEffect(() => {
        if (!restored) return;
        // The restored list is in the first commit, so the column already has
        // its full height here and the offset lands on the post it came from.
        window.scrollTo(0, restored.scrollY);
    }, [restored]);

    // Refreshed every render so the unmount below reads the last committed
    // feed rather than whatever an empty dependency list closed over.
    const pendingRef = useRef({
        snapshot: null as FeedSnapshot | null,
        locationKey,
    });
    useEffect(() => {
        pendingRef.current = {
            locationKey,
            snapshot: {
                posts,
                postPage,
                postsHaveMore: hasMore,
                articles,
                articlePage,
                articlesHaveMore: hasMoreArticles,
                scrollY: scrollYRef.current,
            },
        };
    });

    const saveSnapshot = useFeedSnapshotStore((state) => state.save);
    useEffect(
        () => () => {
            const { snapshot, locationKey: key } = pendingRef.current;
            // Nothing worth restoring: leaving while the first page is still
            // in flight, or after it failed, would otherwise bring the reader
            // back to an empty feed that never refetches.
            if (!snapshot) return;
            if (snapshot.posts.length === 0 && snapshot.articles.length === 0) {
                return;
            }
            saveSnapshot(key, {
                ...snapshot,
                scrollY: scrollYRef.current,
            });
        },
        [saveSnapshot],
    );

    /**
     * Filters and tabs replace the history entry instead of pushing one.
     * Pushing would turn Back into an undo stack for chip taps — three taps,
     * three presses to leave the feed — when Back's job here is to leave.
     */
    const writeFeedParams = useCallback(
        (next: {
            tab: FeedTab;
            followedOnly: boolean;
            categories: PostCategory[];
        }) => {
            const params = new URLSearchParams();
            if (next.tab !== "COMMUNITY") {
                params.set(TAB_PARAM, slugFromTab(next.tab));
            }
            if (next.followedOnly) params.set(FOLLOWING_PARAM, "1");
            if (next.categories.length > 0) {
                params.set(CATEGORIES_PARAM, next.categories.join(","));
            }
            setSearchParams(params, { replace: true });
        },
        [setSearchParams],
    );

    function handleTabChange(tab: FeedTab) {
        writeFeedParams({ tab, followedOnly: false, categories: [] });
    }

    function handleToggleCategory(cat: PostCategory) {
        const next = selectedCategories.includes(cat)
            ? selectedCategories.filter((c) => c !== cat)
            : [...selectedCategories, cat];
        writeFeedParams({ tab: activeTab, followedOnly, categories: next });
    }

    function handleFollowedOnlyToggle() {
        if (!isAuthenticated) {
            openModal();
            return;
        }
        writeFeedParams({
            tab: activeTab,
            followedOnly: !followedOnly,
            categories: selectedCategories,
        });
    }

    // Articles support both narrowings too, so they get the same chip row.
    const showFilters = isArticles || FOLLOWED_ONLY_TABS.includes(activeTab);
    const showPostBox = !isArticles && !FOLLOWED_ONLY_TABS.includes(activeTab);

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            <SEO
                description="TDN is the social network for developers. Share code, tech news, articles and connect with the dev community."
                canonical="/"
            />
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                {/* Search */}
                <div className="px-4 pt-4 pb-3">
                    <ProfileSearchDropdown />
                </div>

                {/* Categories */}
                <div className="flex w-full border-b border-white/5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            onClick={() => handleTabChange(cat.value)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                                activeTab === cat.value
                                    ? "text-white"
                                    : "text-white/40 hover:text-white/70"
                            }`}
                        >
                            {t(cat.labelKey)}
                            {activeTab === cat.value && (
                                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-white rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Following toggle + category filters — News, Updates, Articles */}
                {showFilters && (
                    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
                        <button
                            onClick={handleFollowedOnlyToggle}
                            className={`flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                followedOnly
                                    ? "bg-white text-black"
                                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                            }`}
                        >
                            <Users size={13} />
                            {t("feed.following")}
                        </button>
                        <div className="w-px h-4 bg-white/10 shrink-0" />
                        {CATEGORY_OPTIONS.map(({ labelKey, value, Icon }) => (
                            <button
                                key={value}
                                onClick={() => handleToggleCategory(value)}
                                className={`flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    selectedCategories.includes(value)
                                        ? "bg-white text-black"
                                        : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                                }`}
                            >
                                <Icon size={13} />
                                {t(labelKey)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Post Box — hidden on News, Updates and Articles */}
            {showPostBox && (
                <PostBox onPostCreated={addPost} activeCategory={postType} />
            )}

            {/* Articles have no inline composer — they are long-form and get a
                whole page — so the slot the PostBox occupies carries the way
                in to one instead. */}
            {isArticles && isAuthenticated && (
                <Link
                    to="/articles/new"
                    className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.03] hover:text-white"
                >
                    <PenLine size={16} />
                    {t("editor.writeArticle")}
                </Link>
            )}

            {isArticles ? (
                <ArticleList
                    articles={articles}
                    isLoading={articlesLoading}
                    isLoadingMore={articlesLoadingMore}
                    hasMore={hasMoreArticles}
                    error={articlesError}
                    loadMoreError={articlesLoadMoreError}
                    onLoadMore={loadMoreArticles}
                    onRetry={retryArticles}
                    onRetryLoadMore={retryLoadMoreArticles}
                />
            ) : (
                <PostList
                    posts={posts}
                    isLoading={isLoading}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
                    error={error}
                    loadMoreError={loadMoreError}
                    onPostDeleted={removePost}
                    // The feed is cached for 60 s, so a quote just created
                    // would not come back from a refetch. The create response
                    // is the post itself — prepend it and the reader sees it.
                    onPostQuoted={addPost}
                    onLoadMore={loadMore}
                    onRetry={retry}
                    onRetryLoadMore={retryLoadMore}
                />
            )}
        </PageShell>
    );
}
