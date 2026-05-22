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
pnpm test:e2e          # Playwright E2E against the dev server
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
    auth/store/
      auth-modal.store.test.ts
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
        useComments.test.ts
        useCommentReplies.test.ts
      components/
        CommentCard.test.tsx
        CommentList.test.tsx
    notifications/
      store/
        notification.store.test.ts
      hooks/
        useNotifications.test.ts
      components/
        NotificationCard.test.tsx
    profile/
      hooks/
        useFollowAction.test.ts
  shared/
    store/
      toast.store.test.ts
    hooks/
      useNetworkStatus.test.ts
      useTranslation.test.ts
    utils/
      error-handler.test.ts
  pages/
    FeedPage.test.tsx
    PostDetailPage.test.tsx
    CommentDetailPage.test.tsx
    BookmarksPage.test.tsx
    NotificationsPage.test.tsx

e2e/
  fixtures.ts
  auth.spec.ts
  feed.spec.ts
  profile.spec.ts
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

---

### Layer 4 — Custom Hooks

Use `renderHook` + `act` from `@testing-library/react`. Override MSW handlers per-test with `server.use()`. Handler resets after each test are handled globally in `tests/setup.ts`.

**Key patterns:**

- Hooks that import `useAuthStore` — add `vi.hoisted` localStorage stub. jsdom 29 `Storage.clear()` is broken; a Map-backed stub is required so that Zustand `persist` captures a working storage at module-evaluation time.
- Hooks that auto-fetch inside `useEffect` — use `waitFor` instead of `await act` to wait for the async update to settle.
- Hooks that expose notifications / other shared state via a Zustand store — assert against `useXxxStore.getState()`, not hook return values.

#### `usePostActions` (`src/features/feed/hooks/usePostActions.test.ts`)

9 tests. Covers `handleLike`, `handleBookmark`, `handleDelete`.

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

> **Note:** `openModal()` defaults `step` to `"initial"`, overwriting a preceding `setStep("login")` call. Assert `isOpen: true` only — do not assert the step value.

#### `useBookmarks` (`src/features/feed/hooks/useBookmarks.test.ts`)

5 tests. `useBookmarks` does not import `useAuthStore` directly, but `apiClient` calls `localStorage.getItem` at runtime — the `vi.hoisted` stub is still required.

```ts
// Hook auto-fetches in useEffect → use waitFor, not await act
const { result } = renderHook(() => useBookmarks());
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(result.current.posts).toHaveLength(1);
```

| Scenario                                    | Assert                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| Mount (default handler)                     | `posts` populated, `isLoading=false`, `error=null`           |
| API fails on mount                          | `error` set to message string; `posts=[]`; `isLoading=false` |
| `retry()` after error with restored handler | `error=null`; `posts` populated                              |
| `removePost(id)`                            | Removes post from local state; no API call                   |
| API returns empty list                      | `posts=[]`; `error=null`                                     |

#### `useComments` (`src/features/comment/hooks/useComments.test.ts`)

5 tests. No auto-fetch — `fetchComments()` is called explicitly. `addComment` and `removeComment` are pure local state mutations.

**Requires `vi.hoisted` localStorage stub** (imports `useAuthStore`).

| Scenario                      | Assert                                                   |
| ----------------------------- | -------------------------------------------------------- |
| Initial state                 | `comments=[]`, `isLoading=false`, `error=null`           |
| `fetchComments()` — success   | List populated from API; `isLoading=false`; `error=null` |
| `fetchComments()` — API error | `error` set; `comments=[]`                               |
| `addComment(comment)`         | Prepends to list; no API call                            |
| `removeComment(id)`           | Removes by id; no API call                               |

#### `useNotifications` (`src/features/notifications/hooks/useNotifications.test.ts`)

5 tests. `fetch()` is called explicitly. Notifications live in `useNotificationStore`, not in the hook's return value — assert against `useNotificationStore.getState().notifications`.

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
    vi.stubGlobal("localStorage", {
        /* Map-backed stub */
    });
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

| Scenario                             | Assert                                  |
| ------------------------------------ | --------------------------------------- |
| Category tab click                   | API called with correct `type` param    |
| "Following" toggle — unauthenticated | Auth modal opened                       |
| "Following" toggle — authenticated   | `followedOnly=true` appended to request |

---

### Layer 7 — E2E (Playwright)

Runs against the dev server (`pnpm dev`, auto-started by `playwright.config.ts`). All API calls are intercepted via `page.route("**/api/v1/**", ...)` — no real backend required. Auth state is injected into `localStorage` with `page.addInitScript()` before each navigation.

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

| Spec           | Scenario                                                        |
| -------------- | --------------------------------------------------------------- |
| `auth.spec`    | Clicking "Sign In" opens the identifier input                   |
| `auth.spec`    | `check: true` response → login step (password field visible)    |
| `auth.spec`    | `check: false` response → register step ("Create your account") |
| `feed.spec`    | Mocked posts render as `<article>` elements                     |
| `feed.spec`    | Clicking "News" tab sends `type=TECH_NEWS` query param          |
| `feed.spec`    | Clicking like triggers optimistic count increment               |
| `profile.spec` | Visit `/profile/:username` → full name heading visible          |
| `profile.spec` | `isMe: true` response → "Edit Profile" button visible           |

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
