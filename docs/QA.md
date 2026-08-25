# QA & Testing Strategy

## Stack

| Layer                      | Tool                        |
| -------------------------- | --------------------------- |
| Test runner                | Vitest                      |
| Component / hook rendering | @testing-library/react      |
| User interaction           | @testing-library/user-event |
| Custom matchers            | @testing-library/jest-dom   |
| DOM environment            | jsdom                       |
| HTTP mocking               | MSW v2                      |
| E2E                        | Playwright                  |

---

## Running Tests

```bash
pnpm test              # unit + integration (single run)
pnpm test:watch        # watch mode
pnpm test:coverage     # with coverage report
pnpm test:e2e          # Playwright: app against Vite + worker against wrangler dev
pnpm test:e2e:ui       # Playwright interactive UI
```

---

## File Structure

Test infrastructure lives in `tests/` (separate from source). Test files are co-located with their source files. E2E lives in a top-level `e2e/` directory.

```
tests/
  setup.ts
  msw-server.ts
  mocks/
    handlers.ts

src/
  core/
    api/
      client.test.ts
    auth/
      auth.store.test.ts
  features/
    article/
      api/
        article.api.test.ts
      hooks/
        useArticle.test.ts
        useArticles.test.ts
        useArticleActions.test.ts
      components/
        ArticleCard.test.tsx
        ArticleList.test.tsx
        MarkdownBody.test.tsx
    auth/
      api/
        auth-api.test.ts
      store/
        auth-modal.store.test.ts
      components/
        AuthModal.test.tsx
        views/
          ForgotPasswordView.test.tsx
          IdentifierView.test.tsx
          LoginView.test.tsx
          RecoveryView.test.tsx
          RegisterView.test.tsx
          ResetPasswordView.test.tsx
          VerifyEmailView.test.tsx
    feed/
      hooks/
        usePostActions.test.ts
        useBookmarks.test.ts
      components/
        useFeed.test.ts
        PostCard.test.tsx
        PostList.test.tsx
    comment/
      hooks/
        useCommentActions.test.ts
        useComments.test.ts
        useCommentReplies.test.ts
      components/
        CommentBox.test.tsx
        CommentCard.test.tsx
        CommentList.test.tsx
    notifications/
      store/
        notification.store.test.ts
      hooks/
        useNotifications.test.ts
        useNotificationSocket.test.ts
        useInitialUnreadCount.test.ts
      components/
        NotificationCard.test.tsx
    profile/
      api/
        profile.api.test.ts
      hooks/
        useFollowAction.test.ts
        useFollowList.test.ts
    settings/
      hooks/
        useDeleteAccount.test.ts
  shared/
    store/
      toast.store.test.ts
    hooks/
      useNetworkStatus.test.ts
      useTranslation.test.ts
    utils/
      error-handler.test.ts
  pages/
    ArticleDetailPage.test.tsx
    FeedPage.test.tsx
    PostDetailPage.test.tsx
    CommentDetailPage.test.tsx
    BookmarksPage.test.tsx
    NotificationsPage.test.tsx
    SettingsPage.test.tsx

worker/
  index.test.ts

e2e/
  fixtures.ts
  articles.spec.ts
  auth.spec.ts
  feed.spec.ts
  profile.spec.ts
  worker/
    worker.spec.ts
    api-stub.ts        # stand-in API, started as a Playwright webServer
    api-stub-data.ts   # its fixtures, shared with the spec
```

---

## Test Layers

### Layer 1 — Zustand Stores

No rendering required. Reset state before each test.

```ts
beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    localStorage.clear();
});
```

#### `auth.store`

| Scenario                               | Assert                                                      |
| -------------------------------------- | ----------------------------------------------------------- |
| `setAuth(payload, token)`              | `isAuthenticated === true`, token written to `localStorage` |
| `updateUser(partial)`                  | Partial merge; other fields preserved                       |
| `clearAuth()`                          | `localStorage` cleared, `isAuthenticated === false`         |
| `logout()` calls API then clears state | `authApi.logout` called; state cleared even on API error    |

#### `auth-modal.store`

| Scenario                                                 | Assert                                                   |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `openModal("login")`                                     | `isOpen === true`, `step === "login"`                    |
| `closeModal()` sets `isOpen: false` immediately          | State is synchronous                                     |
| Step resets to `"initial"` after 300 ms                  | Use `vi.useFakeTimers()` + `vi.advanceTimersByTime(300)` |
| `openModal()` during the 300 ms window cancels the reset | Step preserved                                           |

#### `notification.store`

| Scenario                               | Assert                                    |
| -------------------------------------- | ----------------------------------------- |
| `setNotifications(list, append=false)` | Replaces list; `unreadCount` recalculated |
| `setNotifications(list, append=true)`  | Appends to existing list                  |
| `addNotification` (unread)             | `unreadCount` incremented                 |
| `addNotification` (read)               | `unreadCount` unchanged                   |
| `markAllRead()`                        | All `isRead: true`, `unreadCount === 0`   |

#### `toast.store`

| Scenario              | Assert                                                |
| --------------------- | ----------------------------------------------------- |
| `addToast()`          | Toast added with unique id                            |
| Auto-remove after 4 s | `vi.useFakeTimers()` + `vi.advanceTimersByTime(4000)` |
| `removeToast(id)`     | Only the targeted toast removed                       |

---

### Layer 2 — Utilities

#### `getErrorMessage`

```ts
it("NetworkError (timeout)", () => {
    expect(getErrorMessage(new NetworkError("Request timed out"))).toMatch(
        /timed out/,
    );
});
it("NetworkError (generic)", () => {
    expect(getErrorMessage(new NetworkError())).toMatch(/internet/);
});
it("ApiErrorResponse with validation array", () => {
    const err = {
        status: 422,
        title: "Validation",
        detail: "bad",
        validation: [
            {
                message: "username too short",
                instancePath: "",
                schemaPath: "",
                keyword: "",
                params: {},
            },
        ],
    };
    expect(getErrorMessage(err)).toBe("username too short");
});
it("ApiErrorResponse without validation", () => {
    expect(
        getErrorMessage({
            status: 404,
            title: "Not Found",
            detail: "User not found",
        }),
    ).toBe("User not found");
});
it("unknown input → fallback message", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred.");
    expect(getErrorMessage("oops")).toBe("An unexpected error occurred.");
});
```

> `getErrorMessage` resolves its fallback strings through `translate()`, which reads `useLanguageStore`. That store is persisted, so this spec needs the `vi.hoisted` Map-backed `localStorage` stub. Assertions above hold because the store defaults to `en` under jsdom.

#### `translate` / `translateWith` (`src/shared/i18n/translate.ts`)

8 tests. The framework-free translator used outside React render (utils, socket callbacks). `translateWith(locale, key, vars?)` is pure; `translate(key, vars?)` reads the current locale from `useLanguageStore`.

| Scenario                                  | Assert                                              |
| ----------------------------------------- | --------------------------------------------------- |
| `translateWith("en" \| "tr", "nav.home")` | `"Home"` / `"Ana Sayfa"`                            |
| `{{var}}` interpolation                   | `notif.follow` + `{ username: "ada" }` → `"@ada …"` |
| Numeric var                               | `notif.unread` + `{ n: 3 }` → `"3 unread"`          |
| Var missing from the map                  | placeholder preserved → `"{{n}} unread"`            |
| No `vars` argument                        | string returned untouched                           |
| Key absent from both locales              | returns the raw key                                 |
| `translate()` after `setLocale("tr")`     | resolves against the new locale                     |
| Table parity                              | every `en` key exists in `tr`; no empty `tr` values |

> The parity test is the runtime safety net behind the compile-time guarantee: `TranslationKey` is derived from `en`, so a key added to `en` breaks `tsc` until `tr` defines it too.

#### `useI18n` (`src/shared/hooks/useI18n.ts`)

5 tests. Needs the `localStorage` stub for the same reason as above.

| Scenario                        | Assert                                           |
| ------------------------------- | ------------------------------------------------ |
| Default locale                  | `locale === "en"`; `t("nav.home") === "Home"`    |
| `setLocale("tr")` inside `act`  | hook re-renders; `t("nav.home") === "Ana Sayfa"` |
| Re-render without locale change | `t` keeps referential identity (`useCallback`)   |
| Interpolation through `t`       | `t("notif.unread", { n: 5 }) === "5 unread"`     |

> `t` identity is asserted because hooks depend on it (`useComments`, `useFeed` list `t` in their `useCallback`/`useEffect` deps); an unstable `t` would refetch on every render.

---

### Layer 3 — API Client (`src/core/api/client.ts`)

The refresh queue is the most critical path: a 401 triggers a single token refresh; all in-flight requests queue behind it and retry once the new token arrives.

| Scenario                                          | Assert                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Sends `Authorization: Bearer <token>`             | Header captured in MSW                                         |
| `isPublic: true` omits Authorization              | No auth header                                                 |
| 15 s timeout                                      | `NetworkError` thrown (use `vi.useFakeTimers`)                 |
| 204 response                                      | Returns `{}` without calling `.json()`                         |
| 401 → refresh succeeds → original request retried | Request called twice total                                     |
| Concurrent 401s                                   | Exactly one refresh call; all queued requests resolved         |
| Refresh fails                                     | `_onSessionExpired` handler called, `"Session Expired"` thrown |

**`isPublic` vs `isAnonymous`.** Both skip the authenticated 401 path, and they are not interchangeable:

- `isPublic` — readable either way (feed, profiles, trends, comments). A 401 means the token is stale, so the request is replayed without it and a refresh runs in the background. The content still arrives.
- `isAnonymous` — called to _obtain_ a session (everything in `auth-api.ts` except `sendVerification`, `verifyEmail` and `logout`). No token is sent and a 401 is the endpoint's verdict on the credentials, so there is no replay and no refresh. Asserting this is what `auth-api.test.ts` is for.

Flagging a credential endpoint `isPublic` sends every rejected attempt twice and then reports the session as expired — see `auth-api.test.ts` for the four regressions that guard against it.

#### `authApi` (`src/features/auth/api/auth-api.test.ts`)

7 tests. The only `*.api.ts` spec in the suite, because these thunks are the one place where the _choice_ of client flag is itself the behaviour under test.

Requests are counted through `server.events.on("request:start", …)` rather than by incrementing inside each handler — a replay the client makes on its own never reaches a handler you did not write, and counting centrally catches `/auth/refresh` calls no test installed a route for. Call `server.events.removeAllListeners()` in `afterEach` or the counters leak into the next spec.

| Scenario                                        | Assert                                                   |
| ----------------------------------------------- | -------------------------------------------------------- |
| 401 from `/auth/login`                          | Exactly one request — the rate-limit budget is not spent |
| 401 from `/auth/login`, refresh route installed | No `/auth/refresh` call; session-expired never fires     |
| 401 from `/auth/recover-account`                | Exactly one request                                      |
| Stale `access_token` in storage, login refused  | Every attempt sent with no `Authorization` header        |
| 401 with a `detail`                             | Problem document reaches the caller intact               |
| 200 login                                       | `ApiResponse.data` unwrapped                             |
| `sendVerification` with a live token            | Still sends `Authorization: Bearer …`                    |

> The header test records _every_ attempt, not the last. The old replay stripped the header itself, so asserting a single captured value reports the stripped retry and misses the request that carried the token — the assertion passed against the bug it was meant to catch.

#### `profileApi` (`src/features/profile/api/profile.api.test.ts`)

7 tests. Query-string construction, which is where an API module can be wrong without anything throwing: the request succeeds, it just asks the wrong question.

The two follower endpoints take `limit`/`offset` (`PaginationQuerySchema`, default 20, max 50); `/users/:username/posts` takes `page`/`limit`. Sending nothing is not "everything" — it is the server's first page. Assertions read `new URL(request.url).searchParams` inside the handler rather than matching a string, so parameter order never makes a test brittle.

| Scenario                             | Assert                                       |
| ------------------------------------ | -------------------------------------------- |
| `getFollowers` / `getFollowing`      | `limit=20&offset=0` present                  |
| Explicit `{ limit: 50, offset: 20 }` | Carried through unchanged                    |
| `{ limit: 500 }`                     | Clamped to 50 — above that the schema 400s   |
| `getUserPosts({ page: 3 })`          | `page=3`, not an offset                      |
| `searchProfiles("a b&c")`            | `q` round-trips intact                       |
| `{ data, meta }` envelope            | Array returned; `meta` dropped by the client |

> Any spec that mocks a follower list must slice on `limit`/`offset`. A handler returning a fixed array answers a paginated and an unpaginated request identically, which is exactly the bug these tests were written for.

---

### Layer 3a — Cloudflare Worker (`worker/index.ts`)

14 tests in `worker/index.test.ts`. Covers the Worker's logic in isolation, with a stubbed `env` and no Miniflare; the `worker` Playwright project (Layer 7) covers it wired to the real asset layer.

`vitest.config.ts` includes `worker/**` for exactly this reason. The Worker's `fetch` is called directly with a request and a stub `env`; there is no Miniflare in the loop.

The `ASSETS` stub **records the paths it was asked for**. Every routing bug in this file is a request reaching the asset store when it should have reached the SPA shell, or the reverse — asserting on the response body alone cannot tell those apart, because a 404 body and a missing asset look identical.

| Scenario                                     | Assert                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `/profile/john.smith`, `.dev`, `.io`         | App shell served; only `/index.html` requested               |
| `/profile/john.smith` with a profile in API  | OG title and description built from the profile              |
| `/assets/…js`, `/favicon.svg`, `/robots.txt` | Passed straight to the asset store                           |
| `/`                                          | Placeholder `og:` and `description` replaced, not duplicated |
| Post content containing markup               | Escaped — no live `<script>` in the head                     |
| `/sitemap.xml`                               | Generated XML; asset store never consulted                   |
| `env.API_BASE` set                           | Profile, post and sitemap all read from it, not production   |
| `env.API_BASE` unset                         | Production API used — deployment needs no setting            |

> The `API_BASE` tests register a handler for **both** origins and assert the recorded request URLs, rather than only asserting the tags. `tests/setup.ts` runs MSW with `onUnhandledRequest: "warn"`, so a request to the wrong origin with no handler escapes to the real network and the spec passes against the bug it exists to catch. Requests are collected with `server.events.on("request:start", …)` and released with `server.events.removeAllListeners()` in `afterEach`.

> **Do not decide "is this an asset?" by testing the whole pathname for a trailing extension.** Usernames are `^[a-zA-Z0-9._]+$`, so `/profile/john.smith` ends in something that looks exactly like a file extension. `isAssetPath` requires either the `/assets/` prefix or a single root-level segment, which is what the build actually produces.

---

### Layer 4 — Custom Hooks

Use `renderHook` + `act` from `@testing-library/react`. Override MSW handlers per-test with `server.use()`. Handler resets after each test are handled globally in `tests/setup.ts`.

**Key patterns:**

- Hooks that import `useAuthStore` — add `vi.hoisted` localStorage stub. jsdom 29 `Storage.clear()` is broken; a Map-backed stub is required so that Zustand `persist` captures a working storage at module-evaluation time.
- Hooks that auto-fetch inside `useEffect` — use `waitFor` instead of `await act` to wait for the async update to settle.
- Hooks that expose notifications / other shared state via a Zustand store — assert against `useXxxStore.getState()`, not hook return values.

#### Article hooks (`src/features/article/hooks/`)

Three hooks, each cloned from an existing model rather than invented:

| Hook                | Modelled on      | What its tests pin down                                                                                                                                                                       |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useArticles`       | `useFeed`        | `hasMore` inferred from a full page; page 2 repeats page 1's filters; a failed page 2 keeps page 1 on screen; a stale response from an abandoned filter never overwrites the current list     |
| `useArticle`        | `useProfile`     | Loading is derived from the slug, so the previous article never shows while the next loads; `retry` returns to loading rather than leaving the stale error; a 404 reads as ordinary not-found |
| `useArticleActions` | `usePostActions` | Optimistic like/bookmark with rollback plus an error toast; guest interactions open the auth modal; share uses the article's own URL                                                          |

**All three require the `vi.hoisted` localStorage stub** — their module graphs reach `apiClient` or `useAuthStore`.

The undo paths are asserted explicitly in `article.api.test.ts`. Articles undo with `DELETE /articles/:id/like` and `DELETE /articles/:id/bookmark`, where posts use `/unlike` and `/unsave`; the tests exist because copying `feedApi` verbatim would 404 on every undo and the optimistic UI would silently roll back.

#### `usePostActions` (`src/features/feed/hooks/usePostActions.test.ts`)

12 tests. Covers `handleLike`, `handleBookmark`, `handleDelete`, `handleShare`.

**Requires `vi.hoisted` localStorage stub** (transitively imports `useAuthStore`).

```ts
// Per-test server.use() override for the optimistic-rollback scenario
server.use(http.post(`${BASE}/posts/post-1/like`, () => HttpResponse.error()));
const { result } = renderHook(() => usePostActions(false, 5, false, "post-1"));
await act(async () => {
    await result.current.handleLike(mockEvent);
});
expect(result.current.isLiked).toBe(false); // rolled back
expect(result.current.likeCount).toBe(5); // rolled back
```

| Scenario                         | Assert                                                             |
| -------------------------------- | ------------------------------------------------------------------ |
| Unauthenticated like             | Auth modal opened (`isOpen=true`); `isLiked`/`likeCount` unchanged |
| Optimistic like — success        | `isLiked=true`, `likeCount` incremented                            |
| Optimistic like — API error      | State rolled back; error toast added to `useToastStore`            |
| Unlike (was already liked)       | `isLiked=false`, `likeCount` decremented                           |
| Unauthenticated bookmark         | Auth modal opened; `isBookmarked` unchanged                        |
| Optimistic bookmark — success    | `isBookmarked=true`                                                |
| Optimistic bookmark — API error  | State rolled back; error toast added                               |
| `handleDelete` — success         | Returns `true`; `onDeleteSuccess` callback fired                   |
| `handleDelete` — unauthenticated | Returns `false`; auth modal opened                                 |
| `handleShare` — copy succeeds    | `writeText` called with `/post/:id`; info toast                    |
| `handleShare` — copy rejected    | Error toast — the button must not fail silently                    |
| `handleShare` — sheet dismissed  | No toast at all (`AbortError` is a cancel, not a failure)          |

> **Note:** `openModal()` defaults `step` to `"initial"`, overwriting a preceding `setStep("login")` call. Assert `isOpen: true` only — do not assert the step value.

> **Sharing needs both APIs stubbed by hand.** jsdom implements neither `navigator.clipboard` nor `navigator.share`, so `shareContent` picks its branch off properties the test installs with `Object.defineProperty(..., { configurable: true })`. Delete all three (`clipboard`, `share`, `canShare`) in `afterEach` — `vi.restoreAllMocks()` does not undo `defineProperty`, and a leftover global changes how _other_ spec files behave.

#### `useCommentActions` (`src/features/comment/hooks/useCommentActions.test.ts`)

15 tests, the comment-side twin of `usePostActions`: same optimistic like / save / delete matrix against `/comments/:id/...`, plus the full share matrix. **Requires the `vi.hoisted` localStorage stub.**

The share cases set `useLanguageStore.setState({ locale: "en" })` in `beforeEach` — without it the locale is sniffed from `navigator.language` and the asserted toast text depends on the machine running the suite.

| Scenario                             | Assert                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Unauthenticated like / save / delete | Auth modal opened; no state change; `handleDelete` `false` |
| Optimistic like — success / error    | `likeCount` ±1; rolled back with an error toast on failure |
| Optimistic save — success / error    | `isBookmarked` toggled; rolled back with an error toast    |
| `handleDelete` — success             | Returns `true`; `onDeleteSuccess` fired                    |
| `handleDelete` — API error           | Returns `false`; `onDeleteSuccess` **not** fired; toast    |
| `handleShare` — copy succeeds        | `writeText` called with `/comments/:id`; info toast        |
| `handleShare` — copy rejected        | Error toast                                                |
| `handleShare` — native share fails   | Error toast                                                |
| `handleShare` — sheet dismissed      | No toast                                                   |
| `handleShare` — native share OK      | `navigator.share` given title/text/url; no toast           |

#### `useBookmarks` (`src/features/feed/hooks/useBookmarks.test.ts`)

9 tests. `useBookmarks` does not import `useAuthStore` directly, but `apiClient` calls `localStorage.getItem` at runtime — the `vi.hoisted` stub is still required.

`/posts/bookmarks` pages by `page`/`limit` (max 100) and returns posts and comments together. `meta.postTotal` is stripped by the client's `.data` unwrapping, so `hasMore` is derived from a full page of _either_ list. The pagination handler slices on the query it is given — a fixed array would answer page 1 and page 2 identically and hide the very bug these tests cover.

```ts
// Hook auto-fetches in useEffect → use waitFor, not await act
const { result } = renderHook(() => useBookmarks());
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(result.current.posts).toHaveLength(1);
```

| Scenario                                    | Assert                                                 |
| ------------------------------------------- | ------------------------------------------------------ |
| Mount (default handler)                     | `posts` populated, `isLoading=false`, `error=null`     |
| Connection dropped on mount                 | `error.network` message; `posts=[]`; `isLoading=false` |
| 429 with a `detail`                         | The API's `detail` rendered, not a fixed string        |
| `retry()` after error with restored handler | `error=null`; `posts` populated                        |
| `removePost(id)`                            | Removes post from local state; no API call             |
| API returns empty list                      | `posts=[]`; `error=null`                               |
| 25 bookmarks, then `loadMore()`             | 20 then 25; `hasMore` true then false                  |
| 3 bookmarks                                 | `hasMore` false without a second request               |
| `retry()` after `loadMore()`                | Back to 20 — the list is replaced, not appended to     |

#### `useComments` (`src/features/comment/hooks/useComments.test.ts`)

9 tests. No auto-fetch — `fetchComments()` is called explicitly. `addComment` and `removeComment` are pure local state mutations.

**Requires `vi.hoisted` localStorage stub** (imports `useAuthStore`).

| Scenario                         | Assert                                                   |
| -------------------------------- | -------------------------------------------------------- |
| Initial state                    | `comments=[]`, `isLoading=false`, `error=null`           |
| `fetchComments()` — success      | List populated from API; `isLoading=false`; `error=null` |
| `fetchComments()` — connection   | `error.network` named; `comments=[]`                     |
| 404 with a `detail`              | The API's `detail`, not a fixed string                   |
| 31 comments, then `loadMore()`   | 20 then 31; `hasMore` true then false                    |
| 4 comments                       | `hasMore` false without a second request                 |
| `addComment()` then `loadMore()` | No duplicate ids — see the note below                    |
| `addComment(comment)`            | Prepends to list; no API call                            |
| `removeComment(id)`              | Removes by id; no API call                               |

#### `useCommentReplies` (`src/features/comment/hooks/useCommentReplies.test.ts`)

8 tests. Same shape as `useComments` against `/comments/:commentId/replies`.

| Scenario                       | Assert                                          |
| ------------------------------ | ----------------------------------------------- |
| `fetchReplies()` — success     | List populated; `error=null`; `isLoading=false` |
| 27 replies, then `loadMore()`  | 20 then 27; `hasMore` true then false           |
| 3 replies                      | `hasMore` false without a second request        |
| `addReply()` then `loadMore()` | No duplicate ids                                |
| `fetchReplies()` after paging  | Back to 20 — replaced, not appended             |
| 404 with a `detail`            | `detail` surfaced; `isLoading=false`            |
| `removeReply(id)`              | Removes by id; no API call                      |

> **Why the duplicate tests exist.** Both endpoints page by a page _number_, and both lists grow at the head when the reader posts. That shifts every server row down, so page 2 comes back overlapping page 1 by however many were added since. Neither a page counter nor an offset taken from `list.length` fixes it — one duplicates, the other skips. The hooks drop incoming rows whose id is already on screen, and these tests pin that.

#### `useNotifications` (`src/features/notifications/hooks/useNotifications.test.ts`)

7 tests. `fetch()` is called explicitly. Notifications live in `useNotificationStore`, not in the hook's return value — assert against `useNotificationStore.getState().notifications`.

The page counter advances **only after** a page is in hand. To test that, the handler has to record which pages were asked for and fail one of them selectively — asserting on the store alone cannot tell a skipped page from a failed one.

**Requires `vi.hoisted` localStorage stub.**

```ts
// Pagination test: page 1 returns exactly 20 items → hasMore=true → loadMore appends page 2
const page1 = Array.from({ length: 20 }, (_, i) => ({
    ...mockNotification,
    issuerId: `user-${i + 2}`,
}));
server.use(
    http.get(`${BASE}/notifications`, ({ request }) => {
        const page = Number(
            new URL(request.url).searchParams.get("page") ?? "1",
        );
        if (page === 1) return HttpResponse.json({ data: page1 });
        return HttpResponse.json({ data: [mockNotification] });
    }),
);
await act(async () => {
    await result.current.fetch();
});
expect(useNotificationStore.getState().notifications).toHaveLength(20);
await act(async () => {
    await result.current.loadMore();
});
expect(useNotificationStore.getState().notifications).toHaveLength(21);
```

| Scenario                          | Assert                                                    |
| --------------------------------- | --------------------------------------------------------- |
| `fetch()` — success               | Store populated; `isLoading=false`; `unreadCount` correct |
| `fetch()` — API error             | `error` truthy; store empty                               |
| Server returns < 20 items         | `hasMore=false`                                           |
| `loadMore()` when `hasMore=false` | Store unchanged; `isLoadingMore=false`                    |
| `loadMore()` when `hasMore=true`  | Page 2 fetched and appended; `hasMore` updated            |
| `loadMore()` fails, then retried  | Pages requested are `[1, 2, 2]` — page 2 is not skipped   |
| `loadMore()` fails                | Loaded notifications kept; `hasMore` still true           |

#### `useNotificationSocket` (`src/features/notifications/hooks/useNotificationSocket.test.ts`)

9 tests. **Requires the `vi.hoisted` localStorage stub** (imports `useAuthStore`), and stubs `WebSocket` with a `FakeWebSocket` that records every instance in a module-level `sockets` array — the reconnect tests assert on how many sockets were dialled, so that array is the subject; the hook itself returns nothing.

The reconnect block uses **fake timers** for the backoff, and shadows `navigator.onLine` with an own property (`Object.defineProperty`) because it is a getter on `Navigator.prototype` and cannot be spied on.

**What the server does matters here and is easy to get wrong:** `realtime.routes.ts` accepts every upgrade and authenticates from a post-open `{ event: "auth", token }` frame, closing with **1008** when `fastify.jwt.verify` rejects the token and replying `{ event: "auth_success" }` when it does not. `onopen` therefore fires for connections that are about to be thrown out — a test that reads "the socket opened" as success proves nothing.

```ts
// A rejected token, as the server delivers it: the upgrade succeeds first.
function rejectAuth(ws: FakeWebSocket) {
    ws.onopen?.();
    ws.onclose?.();
}
```

| Scenario                                             | Assert                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| Authenticated with a token in the store              | One socket; first frame is `{ event: "auth", token }`           |
| Authenticated after a reload (token only in storage) | Connects using the stored JWT                                   |
| URL                                                  | `ws://localhost:8080/api/v1/realtime/ws` (pinned against drift) |
| Unauthenticated / no token anywhere                  | No socket dialled                                               |
| Server rejects the token on every attempt            | Dialling stops at 6 sockets (1 + `MAX_RETRIES`) and stays there |
| Retry budget exhausted                               | `common.notificationsUnavailable` toast added                   |
| JWT refreshed into storage between attempts          | The reconnect authenticates with the **new** token              |
| Effect torn down while the offline resume is armed   | The later `online` event dials nothing extra                    |

> The toast is asserted **before** advancing the timers again — `toast.store` dismisses after 4 s, so any further advance empties the store the assertion reads.

#### `useFollowAction` (`src/features/profile/hooks/useFollowAction.test.ts`)

5 tests. Covers optimistic follow/unfollow, silent rollback on failure, auth guard, and in-render prop sync.

**Requires `vi.hoisted` localStorage stub** (imports `useAuthStore`).

```ts
// Rollback is silent — no toast. Only check that state is unchanged.
server.use(http.post(`${BASE}/follows`, () => HttpResponse.error()));
const { result } = renderHook(() => useFollowAction("user-2", false, 10));
await act(async () => {
    await result.current.handleFollow();
});
expect(result.current.isFollowing).toBe(false);
expect(result.current.followersCount).toBe(10);
expect(result.current.isLoading).toBe(false);
```

| Scenario                                 | Assert                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| Unauthenticated `handleFollow()`         | Auth modal opened (`isOpen=true`); `isFollowing`/`followersCount` unchanged |
| Optimistic follow — success              | `isFollowing=true`; `followersCount` incremented                            |
| Optimistic unfollow — success            | `isFollowing=false`; `followersCount` decremented                           |
| API error                                | State rolled back silently; `isLoading=false`                               |
| `rerender({ initialIsFollowing: true })` | `isFollowing` syncs with new prop                                           |

> **Note:** In-render state sync pattern (`useState` + guard comparing previous prop) means `rerender()` from RTL triggers the sync immediately — no `waitFor` needed.

#### `useFollowList` (`src/features/profile/hooks/useFollowList.test.ts`)

4 tests. Backs `FollowListModal`, and pages by **offset** rather than a page counter — the endpoint allows a short page, which would desynchronise a counter.

The handler must slice against the `limit`/`offset` it is given rather than returning a fixed array. A handler that ignores them answers a paginated request and an unpaginated one identically, so the truncation these tests exist to catch stays invisible.

`meta.count` is not available to the hook: `apiClient` unwraps `.data` before returning, so `hasMore` is derived from a full page instead.

| Scenario                        | Assert                                          |
| ------------------------------- | ----------------------------------------------- |
| 34 followers, then `loadMore()` | 20 then 34; `hasMore` true then false           |
| 5 followers                     | All 5; `hasMore` false without a second request |
| Type switched to `following`    | List replaced, not appended                     |
| 404                             | `detail` surfaced; `isLoading` false            |

#### `useNetworkStatus` (`src/shared/hooks/useNetworkStatus.test.ts`)

3 tests. Simplest hook in the suite — no API calls, no Zustand stores, no `vi.hoisted` needed. Uses `window.dispatchEvent` to simulate connectivity changes.

```ts
// No vi.hoisted — pure window event listener hook
it("offline event → false", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
        window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
});
it("online event after offline → true", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => {
        window.dispatchEvent(new Event("offline"));
    });
    act(() => {
        window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
});
```

| Scenario                       | Assert                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Initial render                 | `true` (`navigator.onLine` defaults to `true` in jsdom) |
| `offline` event dispatched     | `false`                                                 |
| `online` event after `offline` | `true`                                                  |

> Cleanup is automatic: `useNetworkStatus` calls `removeEventListener` in its effect cleanup, so each fresh `renderHook` instance starts with its own listener.

#### `useTranslation` (`src/shared/hooks/useTranslation.test.ts`)

7 tests. Covers `showTranslate` derivation, auth guard, successful translation, revert, and API error.

**Requires both `vi.hoisted` localStorage stub AND `vi.mock("franc-min", ...)`** (imports `useAuthStore` + uses ESM `franc-min`).

```ts
// Both vi.hoisted and vi.mock are hoisted before imports — safe to combine.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {/* Map-backed stub */});
});
vi.mock("franc-min", () => ({ franc: vi.fn() }));

import { franc } from "franc-min"; // mocked version

beforeEach(() => {
    vi.mocked(franc).mockReturnValue("spa"); // "es" ≠ "en" (jsdom navigator.language)
});
afterEach(() => {
    vi.restoreAllMocks();
});
```

| Scenario                                           | Assert                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Content < 10 chars                                 | `showTranslate: false`                                                                |
| `franc` returns `"eng"` (same as browser language) | `showTranslate: false`                                                                |
| `franc` returns `"spa"` (different from browser)   | `showTranslate: true`                                                                 |
| Unauthenticated `handleTranslate()`                | Auth modal opened; `isTranslating=false`; `isTranslated=false`                        |
| Authenticated translate — success                  | `displayContent` = `"Translated content"`; `isTranslated=true`; `isTranslating=false` |
| `handleRevert()`                                   | `displayContent` restored to original; `isTranslated=false`                           |
| API error                                          | `translateError` truthy; `isTranslated=false`; `isTranslating=false`                  |

> `vi.mock` factory bypasses ESM module resolution entirely — no `deps.inline` change is needed in `vitest.config.ts`.
>
> `apiClient` unwraps `ApiResponse<T>.data`, so the MSW handler returns `{ data: { translatedText: "Translated content" } }` and the hook receives `{ translatedText: "Translated content" }` directly.

#### `useFeed` (`src/features/feed/components/useFeed.test.ts`)

6 tests. `fetchPosts` is called explicitly (no auto-fetch on mount). `changeCategory` calls `fetchPosts` fire-and-forget — use `waitFor` to wait for async settlement.

**Requires `vi.hoisted` localStorage stub** (`apiClient` reads `localStorage` at runtime).

```ts
// changeCategory fires fetchPosts without awaiting it — waitFor is required
act(() => {
    result.current.changeCategory("TECH_NEWS");
});
await waitFor(() => {
    expect(result.current.activeCategory).toBe("TECH_NEWS");
    expect(result.current.isLoading).toBe(false);
});
expect(result.current.posts).toHaveLength(1);

// loadMore() pagination test — override handler to return exactly 20 on page 1
const page1 = Array.from({ length: 20 }, (_, i) => ({
    ...mockPost,
    id: `post-${i + 1}`,
}));
server.use(
    http.get(`${BASE}/posts`, ({ request }) => {
        const page = Number(
            new URL(request.url).searchParams.get("page") ?? "1",
        );
        if (page === 1) return HttpResponse.json({ data: page1 });
        return HttpResponse.json({ data: [mockPost] });
    }),
);
```

| Scenario                            | Assert                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `fetchPosts("COMMUNITY")` — success | `posts` populated; `isLoading=false`; `error=null`    |
| `fetchPosts()` — API error          | `error` set to message; `posts=[]`; `isLoading=false` |
| Server returns < 20 items           | `hasMore=false`                                       |
| `loadMore()` when `hasMore=true`    | Page 2 fetched; posts appended; `hasMore` updated     |
| `changeCategory("TECH_NEWS")`       | `activeCategory` updated; new fetch triggered         |
| `addPost()` then `removePost()`     | List mutated immediately; no API call                 |

#### `useDeleteAccount` (`src/features/settings/hooks/useDeleteAccount.test.ts`)

3 tests. `DELETE /users/me` is body-carrying: the backend validates `{ password }` against `SoftDeleteUserSchema` and re-verifies it before soft-deleting, so the MSW handler mirrors that contract and answers 400 when the body is missing.

**Requires `vi.hoisted` localStorage stub** (`apiClient` and `useAuthStore` both reach `localStorage`). `react-router-dom` is mocked for `useNavigate` instead of wrapping in `MemoryRouter`, since the hook only navigates.

```ts
// Errors come back as RFC 7807 problem documents — getErrorMessage reads
// `detail`, so a `{ message }` body would surface "an unexpected error".
HttpResponse.json(
    {
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "Invalid password.",
        instance: "/api/v1/users/me",
    },
    { status: 400 },
);
```

| Scenario                  | Assert                                                             |
| ------------------------- | ------------------------------------------------------------------ |
| `handleDelete("hunter2")` | Request body is exactly `{ password: "hunter2" }`                  |
| Success (204)             | `isAuthenticated=false`; `navigate("/")` called; `error=null`      |
| Wrong password (400)      | `error` = `detail`; `isLoading=false`; session kept; no navigation |

---

### Layer 5 — Components

Test observable behavior, not implementation details. Prefer `getByRole`, `getByText`, `getByPlaceholder` over class selectors.

#### `PostList` / `CommentList`

```tsx
it("renders spinner while loading", () => {
  render(<PostList isLoading posts={[]} ... />);
  expect(document.querySelector(".animate-spin")).toBeInTheDocument();
});
it("renders error + retry button", async () => {
  const onRetry = vi.fn();
  render(<PostList isLoading={false} error="Failed" posts={[]} onRetry={onRetry} ... />);
  await userEvent.click(screen.getByRole("button", { name: /try again/i }));
  expect(onRetry).toHaveBeenCalledOnce();
});
it("renders empty state", () => {
  render(<PostList isLoading={false} error={null} posts={[]} ... />);
  expect(screen.getByText(/category empty/i)).toBeInTheDocument();
});
```

#### `MarkdownBody` (`src/features/article/components/MarkdownBody.test.tsx`)

The API stores and returns article bodies as **raw, unsanitised markdown** — sanitisation is entirely the client's job. `MarkdownBody` does it by omission: `skipHtml` on `react-markdown`, and no `rehype-raw`. Three tests exist purely to keep it that way, because on a site where anyone can publish, rendering embedded HTML is stored XSS:

| Scenario                        | Assert                                       |
| ------------------------------- | -------------------------------------------- |
| `<script>` in the body          | No `script` element reaches the DOM          |
| `<img onerror=...>` in the body | No `img[onerror]` element                    |
| `[click](javascript:...)`       | The `href` does not survive as `javascript:` |

The rest cover rendering itself: headings/emphasis/lists as real elements, fenced code inside a scrollable `<pre>`, and GFM tables — which only render if `remark-gfm` is still wired in.

`ArticleCard` has the matching assertion for `excerpt`: it is derived server-side with markdown marks stripped but **HTML left intact**, so the card must print it as text.

#### `PostCard` / `CommentCard`

8 and 5 tests. Both cards navigate on a click anywhere in the `<article>`, so much of their coverage is about the clicks that must **not** navigate. Both mock `useNavigate`, `usePostActions`/`useCommentActions` and `useTranslation`, so the card's own routing and rendering is all that is under test.

| Scenario                         | Assert                        |
| -------------------------------- | ----------------------------- |
| Card clicked                     | Navigates to the detail route |
| Avatar clicked                   | Navigates to the profile      |
| Video clicked (`PostCard`)       | Does not navigate             |
| Click ending a text selection    | Does not navigate             |
| Click with an empty selection    | Still navigates               |
| Delete button (own post/comment) | Confirmation modal opens      |
| `handleDelete` resolves true     | Modal closes                  |

> **The author fields here need no client-side guards, and adding them is a mistake worth naming.** `username` reads as optional in `PostAuthorSchema` / `CommentAuthorSchema`, but `User.username` is `NOT NULL`, the `author` relation on `Post` and `Comment` is required with `onDelete: Cascade`, and every repository query selects it. `avatarUrl` is `NOT NULL` with a database default, is absent from `UpdateProfileBodySchema` (which sets `additionalProperties: false`, so no client can write it), and `toFeedResponse` substitutes a CDN default and CDN-prefixes anything not starting with `http`. So neither a `?? fallback` nor a `getSafeImageSrc` call can ever do anything on these two cards. The slack is in the TypeBox schemas, not the data — tracked in tdn-api#182. Fixtures use a realistic CDN url rather than `""` so they match what the API actually sends.
>
> The `|| ui-avatars` fallbacks that remain in `PostBox`, `CommentBox`, `EditProfileModal`, `ProfilePage` and `ProfileSearchDropdown` are **live**: those render the current user from the auth store, whose `LoginResponse.user` carries only `{ id, username, isEmailVerified }`, so `avatarUrl` really is undefined until the profile sync lands.

> ⚠️ **`vi.spyOn(window, "getSelection")` must be restored.** `@testing-library/user-event` reads the selection while typing, and a stub left in place strands every later spec that types into a field — five unrelated auth and settings specs failed on a 5 s `user-event` timeout, all of them passing in isolation. Both card specs call `vi.restoreAllMocks()` in `afterEach`. If a batch of typing tests starts timing out for no reason, look for an unrestored global spy rather than at the specs that failed.

#### `NotificationCard`

| Scenario            | Assert                                   |
| ------------------- | ---------------------------------------- |
| `FOLLOW` type click | `navigate("/profile/<username>")` called |
| `LIKE` type click   | `navigate("/post/<referenceId>")` called |
| `isRead: false`     | Element has `border-l-blue-500` class    |

#### `AuthModal`

| Scenario               | Assert                            |
| ---------------------- | --------------------------------- |
| `step: "login"`        | `LoginView` content visible       |
| `step: "register"`     | `RegisterView` content visible    |
| `step: "verify-email"` | `VerifyEmailView` content visible |

#### `ForgotPasswordView` (`src/features/auth/components/views/ForgotPasswordView.test.tsx`)

4 tests. `/auth/forgot-password` answers 204 whether or not the address is registered — deliberate anti-enumeration — so there is no "not found" case to test, only transport failures and the advance to the reset step.

The form is `noValidate`: a `type="email"` field inside a form otherwise triggers native constraint validation, which blocks submit before any handler runs. Without it the malformed-address test can never see the app's own message, and neither can a user.

| Scenario            | Assert                                                 |
| ------------------- | ------------------------------------------------------ |
| 429 from the API    | `detail` rendered; step unchanged                      |
| Address with no `@` | Inline message; no request made at all                 |
| Enter in the field  | Advances to `reset-password`                           |
| 204                 | Step `reset-password`; `identifier` set to the address |

#### `IdentifierView` (`src/features/auth/components/views/IdentifierView.test.tsx`)

5 tests. The handler for `/auth/check` answers from an explicit list of registered identifiers and records what it was asked, which is what makes the trimming assertion possible — mirror the API's exact match rather than returning a fixed `check: true`.

`BASE_URL` is exported from the API client, so under Vitest (`import.meta.env.PROD === false`) the OAuth redirect is expected to point at `localhost:8080`.

| Scenario           | Assert                                                         |
| ------------------ | -------------------------------------------------------------- |
| `"  alice "` typed | Request carries `"alice"`; store keeps `"alice"`; step `login` |
| Enter in the field | Advances without touching the button                           |
| `/auth/check` 500s | `detail` rendered; step unchanged                              |
| Unknown identifier | Step `register`                                                |
| Google button      | `location.href` is the API base + `/oauth/google`              |

#### `LoginView` (`src/features/auth/components/views/LoginView.test.tsx`)

7 tests. The view renders only a password field and takes the account from `useAuthModalStore().identifier`, so each test seeds the store rather than typing one in.

`Button` declares no default `type`, so inside the form every button submits unless it opts out — one test pins that the change-account button does not log the user in.

| Scenario                     | Assert                                                    |
| ---------------------------- | --------------------------------------------------------- |
| Email identifier             | Rendered verbatim, no `@` prefix                          |
| Username identifier          | Rendered as `@name`                                       |
| Enter in the password field  | Signs in; token stored                                    |
| Change-account button        | `step === "identifier"`; no login attempted               |
| Happy path, unverified email | `step === "verify-email"`                                 |
| 403 carrying `recoveryToken` | `step === "account-recovery"`; token kept in the store    |
| 401                          | `detail` rendered; step unchanged; store still signed out |

> The API spreads `AccountPendingDeletionError` into the problem document, so `recoveryToken` sits at the top level beside `status` — mock it there, not nested.

#### `RecoveryView` (`src/features/auth/components/views/RecoveryView.test.tsx`)

4 tests. The view is reached with a `recoveryToken` already in the store — `LoginView` puts it there from a 403, `OAuthSuccessPage` from a query parameter — so every test seeds it rather than producing one.

`closeModal` schedules a 300 ms timer that wipes `recoveryToken` and `step`. `setState` cannot cancel it, so a test that closes the modal leaks the wipe into the next test, which then clicks a button whose `if (!recoveryToken) return` guard silently swallows the click. Seeding through `openModal("account-recovery")` cancels the pending timer first.

`/auth/recover-account` is `isAnonymous`, so a 401 reaches the view as-is. It was `isPublic` when these tests were written, which replayed the request and fired a background refresh — hence the refresh handler the spec still installs, now only as a guard against that regression returning.

| Scenario                            | Assert                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| 401 for a wrong token purpose       | `detail` rendered; store still signed out                |
| 503, then a successful retry        | Signed in; the previous failure banner is gone           |
| Recovered account, email unverified | `step === "verify-email"`; modal stays open              |
| Recovered account, email verified   | Modal closed; token stored; profile merged into the user |

> Recovery re-authenticates exactly as login does, so it owes the user the same verification prompt. `VerifyEmailView` calls `sendVerification` authenticated, which works because `setAuth` has already stored the token by then.

#### `RegisterView` (`src/features/auth/components/views/RegisterView.test.tsx`)

6 tests. Registration is two calls — `POST /auth/register` followed by an automatic `POST /auth/login` — and the halves fail differently, so mock them separately.

Field-level highlighting reads `validation[0].instancePath` (`"/username"`), the only place the API names the offending field; `getErrorMessage` returns just the message, which never does. Handlers must therefore return whole RFC 7807 problem documents, not bare strings.

| Scenario                             | Assert                                                        |
| ------------------------------------ | ------------------------------------------------------------- |
| 400 with `instancePath: "/username"` | Username input reddened, email untouched                      |
| Register succeeds, auto-login 500s   | `step === "login"`, `identifier` set to the new username      |
| Happy path                           | `step === "verify-email"`; token stored; auth store signed in |
| Whitespace-only username             | Submit stays disabled                                         |
| Enter in the password field          | Registers — the view is a `<form>`, not a div with a handler  |
| Back pressed                         | `step === "identifier"`; no `POST /auth/register` went out    |

> `type="email"` inputs run the HTML value sanitization algorithm, so jsdom strips whitespace from that field on its own — only the text inputs need a trimmed guard.

> The form is `noValidate`: with `type="email"` present, native constraint validation runs first and blocks submit, so the view's own error banner would never be reached. And because `Button` declares no default `type`, the Back button needs `type="button"` or it submits the form it sits in — the "Back pressed" row is what holds that.

#### `ResetPasswordView` (`src/features/auth/components/views/ResetPasswordView.test.tsx`)

7 tests. `POST /auth/reset-password` takes an OTP of **exactly** 8 characters and a password of at least 8, and answers 204. Both limits are schema constraints, so the view checks them itself — a short password otherwise comes back as a validation error the user reads as a bad code.

Success leaves the view immediately (`step: "login"`), so the confirmation is asserted against `useToastStore.getState()`, not the DOM.

| Scenario                      | Assert                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| 3-character code              | Length message inline; no request made at all               |
| 7-character code              | Length message inline; no request — the API would reject it |
| Password under 8 characters   | Password message inline; no request made                    |
| 400 for an OAuth-only account | `detail` rendered inline; step unchanged                    |
| Enter in the password field   | Submits                                                     |
| Code typed with whitespace    | Request body carries the bare 8 characters                  |
| 204                           | Success toast queued; step `login`                          |

> The code field strips whitespace in `onChange` rather than trimming at submit: `maxLength={8}` measures the raw DOM value, so a leading space typed into a trim-at-submit field would eat one of the eight characters.

#### `VerifyEmailView` (`src/features/auth/components/views/VerifyEmailView.test.tsx`)

6 tests. The view requests a code the moment it mounts, so **every** test needs a `/auth/send-verification` handler, even ones that never touch resend.

One test renders inside `<StrictMode>` to reproduce the double-invoked mount effect the real app runs under, and asserts a single request goes out.

| Scenario                      | Assert                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| Send-on-mount is rate limited | `detail` rendered                                           |
| Wrong code                    | `detail` rendered inline; modal stays open; user unverified |
| Resend fails                  | `detail` rendered — the call used to reject unhandled       |
| Mounted in `StrictMode`       | Exactly one send request                                    |
| Enter in the code field       | Verifies                                                    |
| Good code                     | `isEmailVerified` true; modal closed                        |

---

### Layer 6 — Page Integration Tests

Combines multiple hooks and components. API is mocked via MSW. Use `MemoryRouter` for routing.

**Auth guard pattern** — applies to `BookmarksPage`, `NotificationsPage`, `SettingsPage`:

```tsx
it("redirects unauthenticated users to /", () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    renderWithRouter(<BookmarksPage />, { route: "/bookmarks" });
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
});
```

**`FeedPage`:**

The tab strip is **Community, News, Updates, Articles**. Articles replaced Job postings in that fourth slot; `JOB_POSTING` is deliberately still in the `PostType` union so existing job posts keep rendering wherever they are linked, and `FeedPage.test.tsx` asserts the four tabs render **and** that no "Jobs" button exists — reinstating the tab has to be a deliberate edit, not a silent regression.

Articles are a separate resource, not a `PostType`, so the tab cannot live in `useFeed`'s `activeCategory`. The page owns a wider `activeTab` instead and branches on it. That makes two pieces of state that must agree, which is what these tests hold down — and it is why they drive the strip by **clicking**, never by mocking `useFeed`'s `activeCategory`.

| Scenario                             | Assert                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Initial render                       | Four tabs in order; post list showing; `fetchPosts` once                                   |
| Community → News                     | PostBox hidden; "Following" toggle and category chips appear                               |
| Articles tab clicked                 | Article list replaces post list; `fetchArticles` called; `fetchPosts` **not** called again |
| Articles tab                         | PostBox hidden; Following toggle and chips still offered (the endpoint takes both)         |
| Category chip on Articles            | Refetched with `categories: ["BACKEND"]`                                                   |
| Articles → Community                 | Post list returns and refetches                                                            |
| "Following" toggle — unauthenticated | Auth modal opened                                                                          |
| "Following" toggle — authenticated   | `followedOnly=true` appended to request                                                    |

**Articles without a cover are the normal case.** The API leaves `coverImageUrl` null on most articles and there is no generated stand-in — the same choice Medium makes. Both the card and the reading view are tested for it, because the failure mode is subtle: a reserved-but-empty image slot reads as a picture that failed to load rather than as an article that has none.

**`ArticleDetailPage`** (`src/pages/ArticleDetailPage.test.tsx`)

| Scenario            | Assert                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| Article loaded      | Title, reading time and the rendered markdown body                             |
| Loading             | Spinner, no body                                                               |
| Fetch failed        | Error text **with a retry**, not a bare not-found                              |
| Article absent      | `page.articleNotFound`                                                         |
| Comments            | `useComments` called with `{ type: "article", id }` — the uuid, never the slug |
| Like                | Delegates to `useArticleActions`                                               |
| Action hook seeding | Called with the article's own id **and** slug                                  |

**`ProfilePage` tabs** (`src/pages/ProfilePage.test.tsx`)

There is no per-author articles endpoint — the tab reuses `GET /articles?authorUsername=`, which returns published articles only, so drafts cannot leak onto someone else's profile.

| Scenario                 | Assert                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Initial render           | Posts tab active; the article list is not mounted                                     |
| Before the tab is opened | No articles request — most visits never leave Posts, and the endpoint is rate limited |
| Articles tab clicked     | `fetchArticles({ authorUsername })`; the lists swap                                   |
| Back to Posts            | The post list returns                                                                 |
| Profile itself failing   | Neither tab renders                                                                   |

**`NotificationsPage`** (`src/pages/NotificationsPage.test.tsx`)

6 tests. Every collaborator is `vi.mock`ed, so `useNotifications` and the store are handed fixed return values rather than driven through MSW — which is what makes the error-with-a-list case expressible at all.

Needs the `vi.hoisted` localStorage stub: `getErrorMessage` resolves its strings through the persisted language store.

| Scenario                     | Assert                                                |
| ---------------------------- | ----------------------------------------------------- |
| Unauthenticated              | Renders nothing; redirects to `/`                     |
| Fetching with an empty list  | Skeletons rendered                                    |
| Error with an empty list     | Message and Try Again rendered                        |
| `unreadCount > 0`            | "N unread" shown                                      |
| Error **with** a loaded list | Cards still on screen; error shown beneath them       |
| `markAllRead` rejects        | Toast queued with the API's `detail`; store untouched |

> An `error` set by `loadMore` must never gate the list itself. The two states coexist: the error belongs under the rows, with its own retry, not instead of them.

**`SettingsPage`** (`src/pages/SettingsPage.test.tsx`)

2 tests covering the form-reset rule the three mutation sections share. `handleSubmit` resolves to a boolean; the sections must branch on that, never on the `error` returned by the hook — after `await`, that binding still holds the value from the render the submit started in, so it reports the previous attempt's outcome.

MSW fails the first `PATCH /users/me/username` and accepts every one after it, so a single render covers both transitions.

| Scenario                       | Assert                                            |
| ------------------------------ | ------------------------------------------------- |
| Update fails (409)             | Error rendered; the typed username is still there |
| Success straight after failure | Success rendered; the field is cleared            |

---

### Layer 7 — E2E (Playwright)

Runs against the dev server (`pnpm dev`, auto-started by `playwright.config.ts`). All API calls are intercepted via `page.route("**/api/v1/**", ...)` — no real backend required. Auth state is injected into `localStorage` with `page.addInitScript()` before each navigation.

Two Playwright projects run from one config:

| Project    | Server                                       | Specs                            |
| ---------- | -------------------------------------------- | -------------------------------- |
| `chromium` | `pnpm dev` (Vite)                            | everything outside `e2e/worker/` |
| `worker`   | `pnpm build && wrangler dev` + `api-stub.ts` | `e2e/worker/*.spec.ts`           |

The **`chromium` project never touches the Cloudflare Worker** — Vite serves it directly. In production `worker/index.ts` sits in front of everything: it decides what is a static asset, injects the tags crawlers read, and generates `/sitemap.xml`. That gap let a routing bug reach production in which every profile whose username contained a dot lost its meta tags, so the `worker` project exists to run the real stack.

**What the `worker` project can prove that `worker/index.test.ts` cannot** is the asset layer and the Worker wired together. Cloudflare serves matching assets _before_ invoking the Worker, and `wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so a miss returns `index.html` with a **200**. Status codes therefore cannot distinguish "the Worker handled this" from "the asset layer fell back to the shell" — both are 200 HTML. The specs assert on `name="twitter:site"`, which `buildMetaTags` emits and the built shell does not contain; one test asserts that absence in `dist/client/index.html` — where `@cloudflare/vite-plugin` writes the client build; nothing is emitted to `dist/` itself — so the marker cannot silently stop being a marker.

**The API behind the `worker` project is a stub, not production.** `e2e/worker/api-stub.ts` is a third webServer serving post detail, profile detail and the post list on `127.0.0.1:8789`, and the Wrangler webServer passes `--var API_BASE:http://127.0.0.1:8789/api/v1` to point the Worker at it. `worker/index.ts` falls back to the production API when `API_BASE` is unset, so nothing has to be set at deploy time. This is what lets the specs assert the metadata the Worker _produced_ (`Stub john.smith (@john.smith) - TDN`, the stub post in the sitemap) instead of only that some tag exists; before it, every `/sitemap.xml` request in CI pulled three pages of one hundred real posts. Fixtures are shared through `e2e/worker/api-stub-data.ts` so an assertion cannot drift from what the stub returns.

> ⚠️ **`reuseExistingServer` will lie to you when comparing two versions of the Worker.** It is `!process.env.CI`, so locally Playwright reuses a Wrangler already on the port — serving a build from before your edit. A run that "passes on the broken version" almost certainly reused the fixed one. Kill the Wrangler process between comparison runs.

> `wrangler dev` needs `pnpm build` first: `@cloudflare/vite-plugin` writes `.wrangler/deploy/config.json` during the build, which is where `assets.directory` comes from. Without it Wrangler refuses to start. `.wrangler/` is gitignored, so a clean checkout must build before it can preview.

```ts
// e2e/fixtures.ts
export const mockUser = { id: "user-1", username: "alice", fullName: "Alice Smith", ... };

export const test = base.extend<{ authenticatedPage: Page }>({
    authenticatedPage: async ({ page }, use) => {
        await page.addInitScript(({ user }) => {
            localStorage.setItem("tdn-auth-storage",
                JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }));
            localStorage.setItem("access_token", "mock-token");
        }, { user: mockUser });
        await use(page);
    },
});
```

API mocking pattern (used in every spec):

```ts
await page.route("**/api/v1/**", async (route, request) => {
    if (request.url().includes("/auth/check") && request.method() === "POST") {
        await route.fulfill({ json: { data: { check: true } } });
    } else {
        await route.fulfill({ json: { data: null } });
    }
});
```

> `api` client unwraps `ApiResponse<T>.data`, so all mock responses must wrap the payload in `{ data: ... }`.

| Spec            | Scenario                                                                       |
| --------------- | ------------------------------------------------------------------------------ |
| `auth.spec`     | Clicking "Sign In" opens the identifier input                                  |
| `auth.spec`     | `check: true` response → login step (password field visible)                   |
| `auth.spec`     | `check: false` response → register step ("Create your account")                |
| `feed.spec`     | Mocked posts render as `<article>` elements                                    |
| `feed.spec`     | Clicking "News" tab sends `type=TECH_NEWS` query param                         |
| `feed.spec`     | Clicking like triggers optimistic count increment                              |
| `profile.spec`  | Visit `/profile/:username` → full name heading visible                         |
| `profile.spec`  | `isMe: true` response → "Edit Profile" button visible                          |
| `articles.spec` | The Articles tab lists the returned articles as `<article>` elements           |
| `articles.spec` | No "Jobs" tab; the strip reads Community, News, Updates, Articles in DOM order |
| `articles.spec` | Category chip sends `categories=BACKEND`                                       |
| `articles.spec` | Opening an article renders its markdown as elements, not literal `#`/`**`      |
| `articles.spec` | A body carrying raw HTML is neither rendered nor executed                      |
| `articles.spec` | Liking increments the count before the request settles                         |
| `articles.spec` | A 404 shows not-found and never hints at a draft                               |

---

## Coverage Targets

| Layer          | Lines | Branches |
| -------------- | ----- | -------- |
| Zustand stores | 100%  | 100%     |
| Utilities      | 100%  | 100%     |
| API client     | 90%+  | 90%+     |
| Custom hooks   | 80%+  | 80%+     |
| Components     | 70%+  | 65%+     |
| Pages          | 60%+  | —        |

---

## CI

See `.github/workflows/ci.yml`. The pipeline runs three jobs:

1. **`lint-and-typecheck`** — ESLint + `tsc -b`
2. **`unit-tests`** — `pnpm test` (Vitest, 123 tests)
3. **`e2e`** — `pnpm test:e2e` (Playwright, 8 tests); installs Chromium via `playwright install --with-deps chromium`; starts `pnpm dev` automatically via `webServer` config

---

## Common Gotchas

**Zustand state leaking between tests** — always reset in `beforeEach`:

```ts
beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState()));
```

**Fake timers** — required for `toast.store` (4 s auto-dismiss) and `auth-modal.store` (300 ms close delay):

```ts
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
```

**`franc-min` ESM** — add `"franc-min"`, `"trigram-utils"`, `"n-gram"` to `deps.inline` in `vitest.config.ts`. Mock the module when language detection is not under test.

**React Router in component tests** — wrap with `MemoryRouter`:

```ts
render(<MemoryRouter initialEntries={["/"]}><MyPage /></MemoryRouter>);
```
