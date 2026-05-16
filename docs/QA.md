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

Tests are co-located with their source files. E2E lives in a top-level `e2e/` directory.

```
src/
  test/
    setup.ts
    msw-server.ts
  mocks/
    handlers.ts
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
        useFeed.test.ts
      components/
        PostCard.test.tsx
        PostList.test.tsx
    comment/
      hooks/
        useCommentActions.test.ts
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
    BookmarksPage.test.tsx
    NotificationsPage.test.tsx

e2e/
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

Use `renderHook` + `act`. Override MSW handlers per-test with `server.use()`.

#### `usePostActions` / `useCommentActions`

Both follow the optimistic update pattern: state changes immediately, rolls back on API error.

```ts
it("like — optimistic rollback on error", async () => {
    server.use(http.post("*/posts/*/like", () => HttpResponse.error()));
    const { result } = renderHook(() =>
        usePostActions(false, 5, false, "post-1"),
    );
    await act(async () => {
        await result.current.handleLike(mockMouseEvent());
    });
    expect(result.current.isLiked).toBe(false);
    expect(result.current.likeCount).toBe(5);
});
```

| Scenario                             | Assert                             |
| ------------------------------------ | ---------------------------------- |
| Unauthenticated like / bookmark      | Auth modal opened; state unchanged |
| Optimistic like — success            | `isLiked` toggled, count updated   |
| Optimistic like — error              | State rolled back, toast shown     |
| Double-click guard (`isLikeLoading`) | API called only once               |

#### `useFollowAction`

| Scenario                         | Assert                                    |
| -------------------------------- | ----------------------------------------- |
| Follow — optimistic update       | `isFollowing: true`, `followersCount` + 1 |
| Follow — API error               | State rolled back                         |
| `initialIsFollowing` prop change | Internal state syncs with new prop        |

#### `useNetworkStatus`

```ts
it("offline event → false", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);
});
it("online event after offline → true", () => {
    const { result } = renderHook(() => useNetworkStatus());
    act(() => window.dispatchEvent(new Event("offline")));
    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toBe(true);
});
```

#### `useTranslation`

| Scenario                               | Assert                    |
| -------------------------------------- | ------------------------- |
| Content < 10 chars                     | `showTranslate: false`    |
| Same language as `navigator.language`  | `showTranslate: false`    |
| Different language detected by `franc` | `showTranslate: true`     |
| Unauthenticated `handleTranslate()`    | Auth modal opened         |
| Successful translate                   | `displayContent` updated  |
| `handleRevert()`                       | Original content restored |

> Mock `franc-min` when language detection is not under test:
>
> ```ts
> vi.mock("franc-min", () => ({ franc: vi.fn().mockReturnValue("spa") }));
> ```

#### `useFeed`

| Scenario                      | Assert                                        |
| ----------------------------- | --------------------------------------------- |
| `fetchPosts("COMMUNITY")`     | `posts` populated, `isLoading` false          |
| `loadMore()`                  | Page 2 requested; posts appended              |
| API returns < 20 items        | `hasMore: false`                              |
| `changeCategory("TECH_NEWS")` | New fetch triggered, `activeCategory` updated |
| `addPost` / `removePost`      | List updated immediately                      |

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

Runs against the dev server (`pnpm dev`). Share auth state via a `loginAs` helper.

```ts
// e2e/helpers.ts
export async function loginAs(page: Page, username: string, password: string) {
    await page.goto("/");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.getByPlaceholder(/email or username/i).fill(username);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByPlaceholder(/password/i).fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL("/");
}
```

| Spec           | Scenario                                          |
| -------------- | ------------------------------------------------- |
| `auth.spec`    | identifier → login → dashboard                    |
| `auth.spec`    | register → verify-email step shown                |
| `auth.spec`    | `/oauth-success?code=` → redirects to `/`         |
| `feed.spec`    | Create a post → appears at top of feed            |
| `feed.spec`    | Like a post → count increments                    |
| `feed.spec`    | Bookmark a post → appears in `/bookmarks`         |
| `profile.spec` | Visit `/profile/:username` → profile info visible |
| `profile.spec` | Own profile → "Edit Profile" button visible       |

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

```yaml
- name: Unit & integration tests
  run: pnpm test

- name: Coverage
  run: pnpm test:coverage

- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps

- name: E2E
  run: pnpm test:e2e
  env:
      VITE_API_BASE: ${{ secrets.STAGING_API_URL }}
```

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
