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
    realtime/
      useRealtimeSocket.test.ts
  features/
    article/
      api/
        article.api.test.ts
      hooks/
        useArticle.test.ts
        useArticles.test.ts
        useArticleActions.test.ts
        useArticleEditor.test.ts
        useMyArticles.test.ts
      components/
        ArticleCard.test.tsx
        ArticleList.test.tsx
        MarkdownBody.test.tsx
        TagInput.test.tsx
      utils/
        tags.test.ts
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
    block/
      api/
        block.api.test.ts
      hooks/
        useBlockAction.test.ts
        useBlockedList.test.ts
      components/
        BlockedAccountsList.test.tsx
    feed/
      hooks/
        usePostActions.test.ts
        useBookmarks.test.ts
        useQuotes.test.ts
      components/
        useFeed.test.ts
        PostCard.test.tsx
        PostList.test.tsx
        QuotedPostCard.test.tsx
        QuoteComposerModal.test.tsx
      store/
        feed-snapshot.store.test.ts
    comment/
      hooks/
        useCommentActions.test.ts
        useComments.test.ts
        useCommentReplies.test.ts
      components/
        CommentBox.test.tsx
        CommentCard.test.tsx
        CommentList.test.tsx
    messages/
      store/
        message.store.test.ts
      hooks/
        useConversations.test.ts
        useOpenConversation.test.ts
        useSendMessage.test.ts
      components/
        MessageBubble.test.tsx
    notifications/
      store/
        notification.store.test.ts
      hooks/
        useNotifications.test.ts
        useInitialUnreadCount.test.ts
      components/
        NotificationCard.test.tsx
    profile/
      api/
        profile.api.test.ts
      hooks/
        useFollowAction.test.ts
        useFollowList.test.ts
      components/
        FollowListModal.test.tsx
    onboarding/
      store/
        onboarding.store.test.ts
      hooks/
        useOnboardingSuggestions.test.ts
        useOnboardingFollows.test.ts
    settings/
      hooks/
        useDeleteAccount.test.ts
  shared/
    components/
      ui/
        SensitiveMedia.test.tsx
    store/
      toast.store.test.ts
      theme.store.test.ts
    hooks/
      useNetworkStatus.test.ts
      useTranslation.test.ts
      useTheme.test.ts
    utils/
      assert-list.test.ts
      error-handler.test.ts
      caret-position.test.ts
      media-errors.test.ts
      mentions.test.ts
  pages/
    ArticleDetailPage.test.tsx
    ArticleEditorPage.test.tsx
    ExplorePage.test.tsx
    FeedPage.test.tsx
    PostDetailPage.test.tsx
    CommentDetailPage.test.tsx
    BookmarksPage.test.tsx
    NotificationsPage.test.tsx
    MessagesPage.test.tsx
    OnboardingPage.test.tsx
    SettingsPage.test.tsx
  app/
    OnboardingGate.test.tsx
    sitemap-routes.test.ts

worker/
  index.test.ts

e2e/
  fixtures.ts
  theme.spec.ts
  article-editor.spec.ts
  articles.spec.ts
  auth.spec.ts
  explore-tags.spec.ts
  feed.spec.ts
  mentions.spec.ts
  messages.spec.ts
  feed-restore.spec.ts
  mobile-zoom.spec.ts
  onboarding.spec.ts
  profile.spec.ts
  quotes.spec.ts
  responsive.spec.ts
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

**The list never defines the count.** It used to: `setNotifications` recounted
the unread ones on every fresh first page, which made the page size the badge's
ceiling — 35 unread notifications rendered as 20. Paging could not rescue it
either, because recounting across an appended page wiped every realtime
`incrementUnread`, and the socket payload is too thin to become a
`Notification` and be counted back.

`GET /notifications/unread-count` answers the question directly, so the
derivation is gone and `setUnreadCount` is authoritative. Restoring the link in
either branch of `setNotifications` brings back one bug or the other, depending
on the branch — which is why two tests assert the _absence_ of the derivation
rather than its result.

| Scenario                                | Assert                                          |
| --------------------------------------- | ----------------------------------------------- |
| `setNotifications(list, append=false)`  | Replaces list; `unreadCount` **untouched**      |
| `setNotifications(list, append=true)`   | Appends to existing list; count untouched       |
| Fresh first page over a server count    | Count survives — no re-derivation               |
| Append after a realtime increment       | The increment survives                          |
| `setUnreadCount(n)`                     | Taken verbatim, list need not agree             |
| `setUnreadCount(0)`                     | Accepted                                        |
| `setUnreadCount` then `incrementUnread` | The server count is the base the socket adds to |
| `addNotification` (unread)              | `unreadCount` incremented                       |
| `addNotification` (read)                | `unreadCount` unchanged                         |
| `markAllRead()`                         | All `isRead: true`, `unreadCount === 0`         |

#### `toast.store`

| Scenario              | Assert                                                |
| --------------------- | ----------------------------------------------------- |
| `addToast()`          | Toast added with unique id                            |
| Auto-remove after 4 s | `vi.useFakeTimers()` + `vi.advanceTimersByTime(4000)` |
| `removeToast(id)`     | Only the targeted toast removed                       |

#### `theme.store` (`src/shared/store/theme.store.test.ts`)

9 tests. Persists under `tdn-theme`, so the **`vi.hoisted` localStorage stub is required**.

| Scenario                                   | Assert                                             |
| ------------------------------------------ | -------------------------------------------------- |
| Initial state                              | `"dark"` — see below                               |
| `setTheme(t)`                              | Recorded verbatim                                  |
| `resolveTheme("light" \| "dark")`          | Passed straight through, `matchMedia` never called |
| `resolveTheme("system")`                   | Resolves against `prefers-color-scheme`            |
| `systemPrefersDark()` with no `matchMedia` | Falls back to dark rather than throwing            |
| `watchSystemTheme`                         | Fires on change; the returned unsubscribe detaches |

**The default is asserted, not incidental.** `"dark"` rather than `"system"` is the decision that keeps every existing account reading what it has always read — the app shipped dark-only, so resolving against the OS would repaint it white for everyone whose laptop is set light. A change of that default is a product decision, and this test is what makes it a deliberate one.

**`matchMedia` is guarded because jsdom does not define it.** An unguarded call would fail every suite whose module graph reaches this file — which, through `useTheme` and `AppInit`, is most of them — and the failure would name whatever that suite was actually testing. Two tests stub it away entirely to hold the guard down.

#### `onboarding.store` (`src/features/onboarding/store/onboarding.store.test.ts`)

6 tests. Persists under `tdn-onboarding`, so the **`vi.hoisted` localStorage stub is required**.

Completion is a **list of user ids**, not a boolean: a shared browser would otherwise let a second account skip the flow because the first one finished it. `complete(userId, [])` is the gate's call when the server already reports follows, and it must not wipe interests a real trip through the picker stored.

| Scenario               | Assert                                        |
| ---------------------- | --------------------------------------------- |
| Unknown user           | `isCompleted` false                           |
| `complete(id, fields)` | `isCompleted` true; `interests` stored        |
| Second user            | `isCompleted` false for them                  |
| Same user twice        | `completedUserIds` holds one entry            |
| `complete(id, [])`     | Existing `interests` left alone               |
| After `complete`       | `localStorage["tdn-onboarding"]` holds the id |

#### `message.store` (`src/features/messages/store/message.store.test.ts`)

17 tests. No persistence, so no storage stub — but reset with
`useMessageStore.setState(useMessageStore.getInitialState())` in `beforeEach`,
because every reducer here is cumulative.

**The list never defines the badge**, the same rule `notification.store` learned
the hard way: counting loaded rows caps an account with 35 unread messages at
the page size, and recounting after an appended page wipes every realtime
increment. `/conversations/unread-count` answers it directly.

| Scenario                                     | Assert                                                            |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `setConversations` with unread rows          | `unreadCount` untouched                                           |
| `applyIncoming` for an unfocused thread      | Badge +1; the row unread +1; the row moves to the front           |
| `applyIncoming` for the **focused** thread   | Badge unchanged; `threadRevision` +1                              |
| `applyIncoming` for a thread not in the page | `conversationsRevision` +1                                        |
| `applyRequest`                               | `requestCount` +1, `unreadCount` **unchanged**                    |
| `setRequests` after blind increments         | Count reset to the listing length                                 |
| `upsertConversation` → `ACCEPTED`            | Leaves the request tab, joins the inbox                           |
| `upsertConversation` → `DECLINED`            | Leaves both lists — it is never listed again                      |
| `markConversationRead`                       | Row zeroed; **global count left alone** for the caller to re-read |
| `applyRead`                                  | `otherLastReadAt` moved on the row and the open thread            |
| `applyDeleted`                               | Row kept in place, emptied                                        |
| `applyMediaRejected`                         | `mediaPending` false, `mediaRejected` true, urls cleared          |
| `setThread(..., append)`                     | Older page appended at the **end** (the array runs newest first)  |
| `replaceMessage(tempId, sent)`               | The optimistic bubble is swapped, not duplicated                  |
| `clearThread`                                | Messages, cursor, conversation **and focus** all cleared          |

The two revision counters are the store admitting what it cannot do. A realtime
payload carries a `preview`, not a `content`, so it can update a list row and
cannot become a bubble — rather than inventing the missing half, the store bumps
a counter and the hook that owns the request re-reads. That is what keeps every
reducer a pure function these tests can drive through `getState()`.

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

> `getErrorMessage` resolves its fallback strings through `translate()`, which reads `useLanguageStore`. That store is persisted, so this spec needs the `vi.hoisted` Map-backed `localStorage` stub. `beforeEach` pins the locale to `en`; the localisation tests below set `tr` explicitly.

**Localisation, and where the line is drawn.** The API answers in English only — it reads no `Accept-Language` — so every `detail` shown verbatim reaches a Turkish reader in English. Only the sentences the API writes when it has nothing specific to say are replaced with a translated one:

- `"An unexpected error occurred."` and `"The server could not complete the request."` — what `error-handler.plugin.ts` emits for a non-`CustomError` 5xx, deliberately hiding what broke
- a 5xx with no `detail` at all
- any document `apiClient` synthesised for an unreadable body (`type: "tdn:unreadable-response"`) — those are ours, so the wording is ours

**Translating by status instead would be wrong twice over**, and both ways are covered:

- a 401 from `/auth/login` means "wrong password", not "your session ended" — `LoginView.test.tsx` and four other auth specs fail loudly on that mistake
- `error-handler.plugin.ts` lets a `CustomError` carry its own message at **any** status, 5xx included, so `"Articles are unavailable."` on a 503 must survive — `useArticles.test.ts` and `useMyArticles.test.ts` pin it

| Scenario                                            | Assert                            |
| --------------------------------------------------- | --------------------------------- |
| Generic 5xx sentence, `en` then `tr`                | Translated both times             |
| 5xx with no detail                                  | Translated                        |
| `type: "tdn:unreadable-response"`                   | Translated whatever the status    |
| 401 / 403 / 404 / 429, and a 503 with a real detail | The server's own words, untouched |
| Validation array present                            | Still wins over everything above  |

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

#### `mentions` — the handle grammar (`src/shared/utils/mentions.test.ts`)

21 tests, and **the cases are the API's contract rather than this file's
preference**. Every rule and negative example is lifted from `docs/mentions.md`
in the API repo, because the client re-implements the server's parser and the
only thing holding the two together is that they agree on the same examples.

| Reads                                 | Ignores                                 |
| ------------------------------------- | --------------------------------------- |
| `@ada`, `@ada.b`, `@a_b_c`            | `ada@example.com`, `docs/@v2`, `@@here` |
| `@Ada` as `Ada`, matched to `ada`     | a handle under 3 or over 30 characters  |
| `@ada.` as `ada`; `@ada.b` as `ada.b` | a bare `@`                              |
| `@ada @Ada` as one                    |                                         |

The API expresses the "not glued to a preceding word" rule as a lookbehind; the
client consumes the character instead, because Safari had none before 16.4 and
Vite does not transpile regex syntax — an unsupported pattern is a blank page,
not a missing feature. The two were compared over the doc's cases and 20,000
random strings with no difference, and the "adjacent handles" block holds that
reasoning down.

`findMention` covers the three unmatchable cases together — a typo, a deleted
account, and one renamed since the body was written. All three stay plain text,
which is the only behaviour that never links a name to a stranger's profile.

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
| Error response with an empty body                 | Rejects with `status` and a detail naming the empty body       |
| Error response that is not JSON                   | Rejects with `status` and a detail saying so                   |
| Error response that _is_ problem+json             | The API's own `detail` is preserved                            |

**Three of those rows are about one message.** "An unexpected error occurred." was all the app could say when a body would not parse, because `response.json()` threw a bare `SyntaxError` — no `status`, no `title`, nothing `getErrorMessage` can read, and the real HTTP status lost. Every unreadable body is now turned into a problem document carrying the status, so a 502 from a proxy or a plugin answering outside the error format says which it was.

**`isPublic` vs `isAnonymous`.** Both skip the authenticated 401 path, and they are not interchangeable:

- `isPublic` — readable either way (feed, profiles, trends, comments). A 401 means the token is stale, so the request is replayed without it and a refresh runs in the background. The content still arrives.
- `isAnonymous` — called to _obtain_ a session (everything in `auth-api.ts` except `sendVerification`, `verifyEmail` and `logout`). No token is sent and a 401 is the endpoint's verdict on the credentials, so there is no replay and no refresh. Asserting this is what `auth-api.test.ts` is for.

Flagging a credential endpoint `isPublic` sends every rejected attempt twice and then reports the session as expired — see `auth-api.test.ts` for the four regressions that guard against it.

**Refresh is single-flight, and two tests keep it that way.** Every caller that needs a renewed session shares one in-flight `POST /auth/refresh`. The public branch used to call refresh directly and so escaped the queue the authenticated path uses: opening an article fires several public reads at once — the article, its comments, the trending rail — and with a stale token each one asked for its own. That spends a five-a-minute budget three at a time, and where the refresh token rotates the later calls present one the first has already consumed, fail, and sign the reader out.

The second test covers the guest case: a public request that carried **no** token is already anonymous, so its 401 says nothing about a session. Renewing one that was never opened ends by reporting it expired, which puts the sign-in modal in front of a reader who never signed in.

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

#### `blockApi` (`src/features/block/api/block.api.test.ts`)

7 tests, on the same reasoning as `profileApi`: a query string can be wrong without anything throwing.

`GET /blocks` takes `limit`/`offset` (default 20, min 1, max 50, and a 400 outside that), so both ends are clamped and both clamps are tested. `DELETE /blocks` is the unusual one — it reads its target from a **body**, which `fetch` sends but does not encode, so the test asserts the `Content-Type` header alongside the payload. Without the header the API reads no body at all and answers 400.

| Scenario                    | Assert                                         |
| --------------------------- | ---------------------------------------------- |
| `getBlocked()`              | `limit=20&offset=0` present                    |
| `{ offset: 40 }`            | Carried through for the next page              |
| `{ limit: 500 }` / `{ 0 }`  | Clamped to 50 / 1                              |
| `{ data }` envelope         | Rows returned unwrapped                        |
| `block("user-2")`           | Body is `{ targetId }`                         |
| `unblock("user-2")`         | Same body on a `DELETE`, `Content-Type` set    |

#### `api.getPage` — the cursor escape hatch

4 tests in `client.test.ts`. `api.get` unwraps `ApiResponse.data` and drops
`meta` with it, which is right for everything paged by `page`/`limit` and fatal
for a cursor-paginated listing: the cursor that reaches the next page lives in
`meta`, so unwrapping leaves no way to walk a conversation backwards at all.

| Scenario               | Assert                                          |
| ---------------------- | ----------------------------------------------- |
| A listing              | `data` **and** `meta.nextCursor` both returned  |
| End of a listing       | `nextCursor` is `null`                          |
| A `404`                | The problem document still reaches the caller   |
| `api.get` alongside it | Still unwraps — the option changed nothing else |

The last row is the point of testing it at all: `_envelope` is one branch inside
the shared client, so the 401 refresh, the queue and the 15 s budget are the same
code either way rather than a second implementation that can drift.

---

### Layer 3a — Cloudflare Worker (`worker/index.ts`)

31 tests in `worker/index.test.ts`. Covers the Worker's logic in isolation, with a stubbed `env` and no Miniflare; the `worker` Playwright project (Layer 7) covers it wired to the real asset layer.

`vitest.config.ts` includes `worker/**` for exactly this reason. The Worker's `fetch` is called directly with a request and a stub `env`; there is no Miniflare in the loop.

The `ASSETS` stub **records the paths it was asked for**. Every routing bug in this file is a request reaching the asset store when it should have reached the SPA shell, or the reverse — asserting on the response body alone cannot tell those apart, because a 404 body and a missing asset look identical.

| Scenario                                     | Assert                                                          |
| -------------------------------------------- | --------------------------------------------------------------- |
| `/profile/john.smith`, `.dev`, `.io`         | App shell served; only `/index.html` requested                  |
| `/profile/john.smith` with a profile in API  | OG title and description built from the profile                 |
| `/assets/…js`, `/favicon.svg`, `/robots.txt` | Passed straight to the asset store                              |
| `/`                                          | Placeholder `og:` and `description` replaced, not duplicated    |
| Post content containing markup               | Escaped — no live `<script>` in the head                        |
| `/sitemap.xml`                               | Generated XML; asset store never consulted                      |
| `env.API_BASE` set                           | Profile, post and sitemap all read from it, not production      |
| `env.API_BASE` unset                         | Production API used — deployment needs no setting               |
| Any injected page                            | Exactly one `<title>` and one `<link rel="canonical">`          |
| An article title                             | Branded `… · TDN`; a title already carrying "TDN" is left alone |
| `/sitemap.xml` against a 50-capped `/posts`  | Posts and profiles still advertised                             |
| Every route                                  | The `google-site-verification` tag survives the head rewrite    |

> **`index.html` carries the Search Console ownership tag, and the Worker must not strip it.** Verification is re-checked periodically rather than once, so losing the tag un-verifies the property and drops the sitemap reporting with it — silently, on every route, with nothing else visibly different. `injectIntoHead` only removes `og:`, `twitter:` and `description`; widening that to "every `<meta name=…>`" would look like tidying and would break this. Held down at both layers: parameterised over four routes in the unit tests, and against the real built shell in the `worker` e2e project.

> **The shell's own `<title>` must be removed, not appended past.** A second `<title>` does not override the first, and the first is the one search engines read. Injecting without stripping left every article, post and profile on the site titled "TDN - The Developer Network" — invisible when sharing a link, because the OG tags were correct all along, and fatal when searching for one. The e2e `worker` project asserts this against the **real built shell**, where the tag is indented inside `<head>`; the unit fixture cannot prove that on its own.

> **Both list endpoints cap `limit` at 50 — 100 is a 400, not a truncation.** `fetchPostPage` swallows a failed page into `[]`, so asking for 100 cost the live sitemap every post _and_ every profile (profiles are derived from post authors) while still returning 200 and looking healthy. The handler in the regression test enforces the cap the real API enforces; the old one ignored the query string entirely, which is why nothing caught it.

> The `API_BASE` tests register a handler for **both** origins and assert the recorded request URLs, rather than only asserting the tags — a request to the wrong origin then fails an assertion naming the origin it reached. Requests are collected with `server.events.on("request:start", …)` and released with `server.events.removeAllListeners()` in `afterEach`.

**Every test here stubs the production origin, and `tests/setup.ts` errors on anything unhandled.** Most call `makeEnv()` with no `API_BASE`, which is the deployed configuration, so the Worker reads `DEFAULT_API_BASE` — the real API. The handlers in `tests/mocks/handlers.ts` only cover the dev origin, so four of those reads escaped to production on every run: `/posts/p1` and `/articles/anything` for the metadata tests, and two pages of `/articles` for the sitemap. MSW's `"warn"` default let them through. They passed while the API was warm and timed out at the 5 s limit when it was not, as a failure with nothing in it pointing at the cause — which is how CI failed on a PR that had touched none of this.

`stubProductionApi()` runs in the file's `beforeEach` with the emptiest payloads the Worker accepts; a test that cares about content registers its own `server.use`, which is checked first. `onUnhandledRequest: "error"` is what keeps it that way for tests nobody has written yet.

> **Do not decide "is this an asset?" by testing the whole pathname for a trailing extension.** Usernames are `^[a-zA-Z0-9._]+$`, so `/profile/john.smith` ends in something that looks exactly like a file extension. `isAssetPath` requires either the `/assets/` prefix or a single root-level segment, which is what the build actually produces.

---

### Layer 4 — Custom Hooks

Use `renderHook` + `act` from `@testing-library/react`. Override MSW handlers per-test with `server.use()`. Handler resets after each test are handled globally in `tests/setup.ts`.

**Key patterns:**

- **A list payload is checked before it is committed** (`assertList`, `src/shared/utils/assert-list.ts`). The tempting shape — `setPosts(data)` and then `data.length` — does throw, and the caller's `catch` does show the error, but the state is by then holding a `null` the rest of the app believes is an array. That crash resurfaced at **unmount**, inside the feed snapshot, where it took the whole route down and cancelled a redirect the app was in the middle of. `e2e/onboarding.spec.ts` was the only thing that caught it, and only indirectly; the hook tests now pin it down directly.
- Hooks that import `useAuthStore` — add `vi.hoisted` localStorage stub. jsdom 29 `Storage.clear()` is broken; a Map-backed stub is required so that Zustand `persist` captures a working storage at module-evaluation time.
- Hooks that auto-fetch inside `useEffect` — use `waitFor` instead of `await act` to wait for the async update to settle.
- Hooks that expose notifications / other shared state via a Zustand store — assert against `useXxxStore.getState()`, not hook return values.

#### Article hooks (`src/features/article/hooks/`)

Three hooks, each cloned from an existing model rather than invented:

| Hook                | Modelled on      | What its tests pin down                                                                                                                                                                                                                                               |
| ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useArticles`       | `useFeed`        | `hasMore` inferred from a full page; page 2 repeats page 1's filters; a failed page 2 keeps page 1 on screen; a stale response from an abandoned filter never overwrites the current list; a body that is not a list fails as this request rather than becoming state |
| `useArticle`        | `useProfile`     | Loading is derived from the slug, so the previous article never shows while the next loads; `retry` returns to loading rather than leaving the stale error; a 404 reads as ordinary not-found                                                                         |
| `useArticleActions` | `usePostActions` | Optimistic like/bookmark with rollback plus an error toast; guest interactions open the auth modal; share uses the article's own URL                                                                                                                                  |

**All three require the `vi.hoisted` localStorage stub** — their module graphs reach `apiClient` or `useAuthStore`.

The undo paths are asserted explicitly in `article.api.test.ts`. Articles undo with `DELETE /articles/:id/like` and `DELETE /articles/:id/bookmark`, where posts use `/unlike` and `/unsave`; the tests exist because copying `feedApi` verbatim would 404 on every undo and the optimistic UI would silently roll back.

#### `useArticleEditor` (`src/features/article/hooks/useArticleEditor.test.ts`)

The editor autosaves, and almost everything that can go wrong there is a rate limit or a lost edit rather than a rendering bug. These are the tests that hold the shape:

| Scenario                        | Assert                                                                                                         |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Title only, or body only        | `canSave` false and **no request** — creation requires both, so firing early only 400s                         |
| First autosave                  | One `POST /articles`, draft created                                                                            |
| Every autosave after            | `PATCH`, never a second `POST` — creation is 5/min, and a second one orphans the first draft                   |
| Nothing changed                 | No request at all                                                                                              |
| Save failed                     | State `error`, reason surfaced, text still `isDirty`                                                           |
| A cover, then several autosaves | **Exactly one upload** — the endpoint allows 5/min, and uploading per save spends it in three keystroke pauses |
| Cover untouched                 | `coverImageKey` **absent** from the PATCH body                                                                 |
| Cover removed                   | `coverImageKey: null` — `undefined` leaves it alone, `null` erases it                                          |
| Publish with unsaved text       | Saves first, then publishes                                                                                    |
| Publish when the save failed    | **Does not publish** — going ahead would put older text live and discard what is on screen                     |

Uses fake timers (`shouldAdvanceTime: true`) to jump the 2 s autosave debounce.

#### `useMyArticles` (`src/features/article/hooks/useMyArticles.test.ts`)

`/articles/me` is the only endpoint that returns drafts, so it is never flagged public — a stale token replayed anonymously would come back empty rather than erroring, and the writer would think their drafts were gone. The tests cover the status query, that page two repeats the same status, the request-id guard against a slow status switch landing last, and that the token is sent.

#### `usePostActions` (`src/features/feed/hooks/usePostActions.test.ts`)

18 tests. Covers `handleLike`, `handleBookmark`, `handleDelete`, `handleShare`, `registerQuote`, and the write-back into the feed snapshot.

**Requires `vi.hoisted` localStorage stub** (transitively imports `useAuthStore`). Also reset `useFeedSnapshotStore` in `beforeEach` — leaked state between tests is the usual failure here.

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
| `registerQuote`                  | `quoteCount` +1 locally **and** in the feed snapshot               |
| `handleShare` — sheet dismissed  | No toast at all (`AbortError` is a cancel, not a failure)          |
| Like with a snapshot holding it  | `isLiked`/`likeCount` written into the stored feed as well         |
| That like fails                  | Taken back out of the stored feed too                              |
| Bookmark with a snapshot         | `isBookmarked` written into the stored feed                        |
| Snapshot without the post        | Stored list untouched **by identity** — a miss must not rebuild it |
| No snapshot at all               | No-op; the local optimistic update still applies                   |

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

11 tests. `useBookmarks` does not import `useAuthStore` directly, but `apiClient` calls `localStorage.getItem` at runtime — the `vi.hoisted` stub is still required.

`/posts/bookmarks` pages by `page`/`limit` (max 100) and returns posts, comments **and articles** together — articles as summaries, without `body`. `meta.postTotal` and its siblings are stripped by the client's `.data` unwrapping, so `hasMore` is derived from a full page of _any_ of the three. The pagination handler slices on the query it is given — a fixed array would answer page 1 and page 2 identically and hide the very bug these tests cover.

`articles` shipped in a later API version than the other two, so the hook reads it as `data.articles ?? []`; one test pins that an older server's response is not a crash.

```ts
// Hook auto-fetches in useEffect → use waitFor, not await act
const { result } = renderHook(() => useBookmarks());
await waitFor(() => expect(result.current.isLoading).toBe(false));
expect(result.current.posts).toHaveLength(1);
```

| Scenario                                       | Assert                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| Mount (default handler)                        | `posts` and `articles` populated, `isLoading=false`, `error=null` |
| Connection dropped on mount                    | `error.network` message; `posts=[]`; `isLoading=false`            |
| 429 with a `detail`                            | The API's `detail` rendered, not a fixed string                   |
| `retry()` after error with restored handler    | `error=null`; `posts` populated                                   |
| `removePost(id)`                               | Removes post from local state; no API call                        |
| API returns empty list                         | `posts=[]`; `articles=[]`; `error=null`                           |
| 25 bookmarks, then `loadMore()`                | 20 then 25; `hasMore` true then false                             |
| 3 bookmarks                                    | `hasMore` false without a second request                          |
| `retry()` after `loadMore()`                   | Back to 20 — the list is replaced, not appended to                |
| Response with no `articles` field              | `articles=[]`; `posts` still populated; `error=null`              |
| 25 saved articles, no posts, then `loadMore()` | 20 then 25 articles; `hasMore` true then false                    |

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

| Scenario                          | Assert                                                      |
| --------------------------------- | ----------------------------------------------------------- |
| `fetch()` — success               | Store populated; `isLoading=false`; `unreadCount` untouched |
| `fetch()` — API error             | `error` truthy; store empty                                 |
| Server returns < 20 items         | `hasMore=false`                                             |
| `loadMore()` when `hasMore=false` | Store unchanged; `isLoadingMore=false`                      |
| `loadMore()` when `hasMore=true`  | Page 2 fetched and appended; `hasMore` updated              |
| `loadMore()` fails, then retried  | Pages requested are `[1, 2, 2]` — page 2 is not skipped     |
| `loadMore()` fails                | Loaded notifications kept; `hasMore` still true             |

#### `useInitialUnreadCount` (`src/features/notifications/hooks/useInitialUnreadCount.test.ts`)

10 tests. **Requires the `vi.hoisted` localStorage stub.**

The name used to be a lie: it fetched the first page and counted the unread
ones in it, so the badge could never read higher than the page size. It now
makes **two requests** — the list from `/notifications`, the count from
`/notifications/unread-count` — issued together and settled **independently**,
so a failed count does not cost the list and a failed list does not cost the
count. Both stay silent; nothing here is worth a toast on a cold start.

Called at boot and after an ambiguous mark-all-read failure, never on a timer:
the realtime socket delivers increments, and a poll would only race it.

Two tests exist for the defect itself and pin it from both sides: a 20-item
first page with a server count of 35 must render 35, and an all-read first page
must not drag a server count of 7 down to zero.

The logout branch now resets the count **explicitly**. That used to fall out of
`setNotifications([])` recounting an empty list; with the derivation gone, the
previous account's badge would otherwise survive the sign-out.

| Scenario                     | Assert                                     |
| ---------------------------- | ------------------------------------------ |
| Authenticated                | List and count both populated              |
| 20-item page, server says 35 | Badge reads **35**, list holds 20          |
| All-read page, server says 7 | Badge reads 7                              |
| Authenticated                | Both endpoints hit in the same pass        |
| Not authenticated            | Neither endpoint called; store stays empty |
| `isAuthenticated` → false    | List cleared **and** count reset to 0      |
| Both requests fail           | Nothing thrown; store untouched            |
| Only the count fails         | The list still lands                       |
| Only the list fails          | The count still lands                      |

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

#### `useBlockAction` (`src/features/block/hooks/useBlockAction.test.ts`)

6 tests. **Requires the `vi.hoisted` localStorage stub** (imports `useAuthStore`).

The hook is deliberately **not** optimistic, and that is what its tests pin. A like flips one icon and a failed one flips it back; a block hides an account from a reader who then has no way of telling a block that worked from one that did not — the timeline is empty either way. So the request is awaited, the outcome is returned to the caller, and a failure is toasted rather than rolled back silently the way `useFollowAction` can afford to.

`pendingId` names the account being worked on rather than being a bare boolean, because the settings list renders a row per blocked account and one shared flag would disable all of them at once. That test gates the MSW handler on a promise built **before** the handler, so releasing it cannot race the request meant to be waiting on it.

| Scenario                 | Assert                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Unauthenticated `block()`| Auth modal opened; no request sent; returns `false`           |
| `block()` success        | Returns `true`; no toast                                      |
| `unblock()` success      | Request goes out as `DELETE`                                  |
| API error                | Returns `false`; one **error** toast carrying the server text |
| Empty target id          | No request; `console.warn`; returns `false`                   |
| While in flight          | `pendingId` is the target, then `null`                        |

#### `useBlockedList` (`src/features/block/hooks/useBlockedList.test.ts`)

7 tests. Modelled on `useFollowList` — offset paging, `hasMore` from a full page because `apiClient` unwraps `meta` away — with one thing of its own: `remove(userId)`, called only after the server has confirmed an unblock.

That ordering is the point. This list is the **only** route back to a block, since the account is invisible in the feed, in search and on its own timeline. Dropping the row on a request that then fails would strand the block with nothing on screen pointing at it. Removal is also what keeps `users.length` a correct offset: the server's list shrinks by the same row, so both stay in step where a page counter would skip one.

| Scenario                     | Assert                                             |
| ---------------------------- | -------------------------------------------------- |
| First page                   | Rows land; `isLoading` false; no error             |
| Full page / short page       | `hasMore` true / false                             |
| `loadMore()`                 | Offsets asked for are `0` then `20`                |
| `enabled: false`             | Nothing fetched, and not stuck loading             |
| 500 then `retry()`           | Error surfaced, then cleared with rows on screen   |
| `remove("u-1")`              | That row alone is gone                             |

#### `FollowListModal` (`src/features/profile/components/FollowListModal.test.tsx`)

6 tests. Each row carries a live follow button, so the list is where an account is unfollowed — the old row was a single `<button>` that could only navigate, and the "Following" text beside it was an inert `<span>`.

The row is a `role="button"` `<div>` rather than a `<button>` because a button cannot legally contain the follow button; keyboard access is kept via `tabIndex`/`onKeyDown`. The follow control calls `stopPropagation`, which is the behaviour two of these tests exist to pin.

`onFollowChange` is reported from an effect watching the hook's `isFollowing`, not from the click handler, so a rolled-back request reports its reversal too — `ProfilePage` feeds its own `followingCount` from it and would otherwise drift.

| Scenario                | Assert                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Click "Following"       | `DELETE /follows` with `{ targetId }`; label flips to "Follow"; row still present; `onFollowChange(-1)`   |
| Click the follow button | `navigate` not called, `onClose` not called                                                               |
| Click the row itself    | `onClose` + `navigate("/profile/bob")`                                                                    |
| `DELETE /follows` fails | Label back to "Following"; `onFollowChange` called `-1` then `1`                                          |
| Signed-out click        | `onClose` called and auth modal `isOpen=true` — both modals share `z-[100]`, so the list must close first |
| `isMe` row              | No follow button rendered                                                                                 |

#### `useTheme` (`src/shared/hooks/useTheme.test.ts`)

6 tests. Needs the `vi.hoisted` localStorage stub (`theme.store` persists), and stubs `matchMedia` per test.

Asserts against `document.documentElement.dataset.theme`, because that attribute is the entire contract — it is what the token overrides in `index.css` key off, and nothing else the hook does is observable.

| Scenario                        | Assert                          |
| ------------------------------- | ------------------------------- |
| Mount                           | `data-theme` stamped            |
| `setTheme("light")`             | Restamped, and the store agrees |
| `"system"` on a light desktop   | Resolves to `light`             |
| OS flips while on `"system"`    | Restamped without a rerender    |
| OS flips after an explicit pick | **No listener attached at all** |
| Unmount                         | Listener detached               |

The fifth is the one worth keeping. A reader who picked light picked it for a reason, and a listener left attached would hand their theme back to the laptop at sunset. Asserting the listener count is zero says that in a way that asserting the colour cannot — the colour is right either way until the OS actually changes.

> jsdom has no cascade, so none of these prove a pixel changed. That is `e2e/theme.spec.ts`'s job.

#### `media-errors` (`src/shared/utils/media-errors.test.ts`)

12 tests over the moderation contract. No DOM and no localStorage stub — it is pure predicates plus one retry.

| Scenario                                 | Assert                             |
| ---------------------------------------- | ---------------------------------- |
| 422 / two 415s / 413                     | `clearsSelection` is true          |
| 503 `ModerationUnavailableError`         | `clearsSelection` is **false**     |
| A 500, an `Error`, `null`, a bare string | `clearsSelection` is false         |
| `isMediaError` on the two 415s           | Does not confuse them              |
| `withModerationRetry` on success         | Called once                        |
| 503 then success                         | Called twice                       |
| 503 twice                                | Throws the second on, called twice |
| 422                                      | Not retried                        |

**The polarity is the test.** `clearsSelection` defaulting the other way — clear unless told otherwise — would take four picked files away over a 500 from the create call that follows the upload, or over a dropped connection, neither of which says anything about the files. The "not a verdict" case is what pins that down.

**`withModerationRetry` is tested here rather than through a component**, with fake timers and no DOM. In a component test the three-second wait deadlocks: `waitFor` drives its polling off the same clock, and MSW answers on the same loop. `CommentBox` therefore waits the real three seconds and asserts only the selection.

#### `usePendingMedia` (`src/features/feed/hooks/usePendingMedia.test.ts`)

6 tests. Fake timers with `shouldAdvanceTime`, and MSW counts the reads so "only this post" is an assertion rather than a claim.

| Scenario              | Assert                                              |
| --------------------- | --------------------------------------------------- |
| Manual refresh        | Reads `/posts/post-1` once, hands the post back     |
| `mediaPending: true`  | Reads again every 20 s                              |
| `mediaPending: false` | Never polls, even after two minutes                 |
| Past five minutes     | Stops; the count stops moving                       |
| Unmount               | Stops                                               |
| A failing poll        | No throw, no callback, `isRefreshing` back to false |

The five-minute cap and the unmount case are both about a page left open: a video that has not been judged in five minutes is not about to be, and something is wrong further back.

#### `SensitiveMedia` (`src/shared/components/ui/SensitiveMedia.test.tsx`)

4 tests. **The accessibility assertion is by role, not by alt text** — `*ByAltText` walks the DOM and finds the blurred copy whether or not it is `aria-hidden`, so it would pass against a cover that reads out the photo it is covering. `queryByRole("img")` is the only query that answers the question being asked.

The click test asserts the event does not reach a parent handler. The cards this sits inside navigate on click, so without that the photo would be uncovered on a page nobody asked to be on.

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

11 tests. `fetchPosts` is called explicitly (no auto-fetch on mount) and is fire-and-forget — use `waitFor` to wait for async settlement, never `await act`.

The hook holds no notion of which tab is open: the type is passed into `fetchPosts` and remembered only so `loadMore` can repeat it. `FeedPage` reads the tab from the URL instead (see its section below), which is what survives a Back.

**Requires `vi.hoisted` localStorage stub** (`apiClient` reads `localStorage` at runtime).

```ts
// fetchPosts does not await — waitFor is required
act(() => {
    result.current.fetchPosts("TECH_NEWS");
});
await waitFor(() => {
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

| Scenario                             | Assert                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `fetchPosts("COMMUNITY")` — success  | `posts` populated; `isLoading=false`; `error=null`                             |
| `fetchPosts()` — API error           | `error` set to message; `posts=[]`; `isLoading=false`                          |
| Server returns < 20 items            | `hasMore=false`                                                                |
| `loadMore()` when `hasMore=true`     | Page 2 fetched; posts appended; `hasMore` updated                              |
| A fetch for another type             | Replaces the list rather than appending it                                     |
| A body that is not a list            | `posts` stays `[]` and the error shows; page 2 likewise keeps page 1 on screen |
| Mounted with a `restore`             | Starts from the given list and pages on from its page rather than page 1       |
| A superseded slow response           | Never overwrites the list a newer fetch produced                               |
| `loadMore()` after a filtered page 1 | Repeats the original params instead of rebuilding them                         |
| `addPost()` then `removePost()`      | List mutated immediately; no API call                                          |

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

#### `useOnboardingSuggestions` (`src/features/onboarding/hooks/useOnboardingSuggestions.test.ts`)

13 tests. **Requires the `vi.hoisted` localStorage stub** — `apiClient` reads it on every request and the hook reads `useAuthStore`.

The hook used to infer an account's field from the categories of the posts and articles it had written, because `Profile` carried no category of its own. `GET /profiles/bots` is that data source arriving for real, so the inference is gone: one request, filtered server-side, ranked by follower count.

Four properties of that request are asserted because getting any of them wrong is invisible until it is expensive:

- **One comma-joined request, not one per field.** A bot matches on _any_ of its categories, so a request per field refetches the same bots and spends the 100/minute budget doing it.
- **No `categories` parameter at all when nothing was picked**, which is a different request from an empty one — it means every categorised bot.
- **`limit=50`**, the endpoint's ceiling. One page is the whole flow for almost everyone: the thinnest field carries 25 bots, well past `MIN_FOLLOWS`.
- **The token goes with it.** `getBots` is neither `isPublic` nor `isAnonymous`; auth is optional on the endpoint, but the token is what fills `isFollowing`, and without it a returning account is handed back the bots it already follows as fresh suggestions.

Paging is a "show more" button over `offset`, not infinite scroll. The append **deduplicates by `userId`** even though the endpoint promises a deterministic order — following a bot raises its follower count, which _is_ the ranking key, so a bot can slide across the page boundary mid-flow and arrive twice. A failed second page toasts and keeps the list; raising it into `error` would swap out a screen of bots the user may already have followed.

`load` sets no state synchronously because it runs from an effect (`react-hooks/set-state-in-effect`); `retry` is an event handler and does, or the button looks dead until the request returns.

| Scenario                             | Assert                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| Endpoint returns bots                | Listed in the order given; `error` null                        |
| A bot with bio, fields, follow state | All mapped through, `isFollowing` included                     |
| Two fields picked                    | One request, `categories=BACKEND,AI`                           |
| No field picked                      | No `categories` parameter at all                               |
| Any request                          | `limit=50`                                                     |
| First page short                     | `hasMore` false                                                |
| First page full, `loadMore()`        | Next page appended; `hasMore` false once short                 |
| Next page repeats a bot              | Listed once; the new bots still appended                       |
| Next page fails (429)                | List kept, `error` null, error toast with the API's `detail`   |
| First page fails (429)               | The API's `detail` surfaced; `accounts` empty; `hasMore` false |
| `retry()` after a failure            | `error` cleared; the list arrives                              |
| Fields change                        | Refetched with the new `categories`                            |
| Same fields, new array identity      | Not refetched                                                  |

#### `useOnboardingFollows` (`src/features/onboarding/hooks/useOnboardingFollows.test.ts`)

11 tests. **Requires the `vi.hoisted` localStorage stub.**

`useFollowAction` is deliberately **not** reused here. It keeps follow state inside each card, which is right on a profile page and wrong in a flow whose only gate is "how many so far" — a counter cannot be assembled from state the cards hold privately. So the set lives above the list, and a follow the server refused must roll the count back rather than leave a phantom entry pushing the user past the requirement.

The hook keeps **two** sets, because they answer different questions. `followedIds` is what a card renders. `serverFollowedIds` is what was already true when the bot arrived (`isFollowing` from the endpoint), and subtracting it gives `netFollowChange` — the only honest input to the gate, since the profile's `followingCount` already counts every bot the user followed on an earlier visit. Counting the seeded ones again would let a returning user out having followed nobody, which is the bug the double-count tests exist to catch.

A `seenIds` ref records every bot the seeding has already ruled on. Without it, appending a second page re-runs the seeding over the first one and quietly restores a bot the user had just unfollowed.

| Scenario                               | Assert                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Initial                                | Nothing followed; `netFollowChange` 0                                          |
| `toggle(id)`                           | Optimistically followed; net 1                                                 |
| `toggle(id)` twice                     | Unfollowed; net 0                                                              |
| A bot arrives with `isFollowing`       | Rendered as followed; the others are not                                       |
| A seeded bot                           | Net stays 0; it is in `serverFollowedIds`                                      |
| Unfollowing a seeded bot               | Net −1                                                                         |
| Second page re-lists an unfollowed bot | Stays unfollowed; net still −1                                                 |
| Follow rejected (429)                  | Net back to 0; error toast carrying the API's `detail`                         |
| Unfollow rejected                      | The follow is restored                                                         |
| Any follow                             | Body is `{ targetId }` with the **id**, never the username                     |
| Request in flight                      | `isPending(id)` true for that id only; a second toggle sends no second request |

#### `useFollowingCount` (`src/features/onboarding/hooks/useFollowingCount.ts`)

Reads `followingCount` off the signed-in account's own profile so the page can credit follows already on the books. Read here rather than handed over from the gate so the page is still right on a reload or a direct visit to `/onboarding`, where no gate ran. A failure counts as zero — the same fail-open the gate takes, and it can only ever ask for more, never fewer.

#### `useConversations` (`src/features/messages/hooks/useConversations.test.ts`)

6 tests. The first cursor-paginated listing in the client, and the assertions are
about the cursor rather than the rows.

| Scenario                     | Assert                                                      |
| ---------------------------- | ----------------------------------------------------------- |
| Mount                        | First page loaded; `hasMore` follows `meta.nextCursor`      |
| `loadMore`                   | The cursor goes back **verbatim** — never parsed or built   |
| `loadMore` with no cursor    | No request; the listing is at its end, not at its start     |
| `PENDING` tab                | `status=PENDING` sent; `requestCount` is the listing length |
| Failure then `fetch()`       | Error surfaced, then cleared on the retry                   |
| `conversationsRevision` bump | The listing re-reads                                        |

The third row is the one that matters: treating a missing cursor as "start
again" restarts from the top and appends every row already on screen a second
time.

#### `useSendMessage` (`src/features/messages/hooks/useSendMessage.test.ts`)

5 tests. Optimistic, and rolled back loudly rather than quietly — a message that
vanishes without a word is indistinguishable from one that was sent.

| Scenario       | Assert                                                      |
| -------------- | ----------------------------------------------------------- |
| Success        | The `temp-` bubble is swapped for the server copy; no toast |
| `403`          | Bubble removed; the server `detail` toasted                 |
| `429`          | The **client** sentence toasted, not the server English     |
| In flight      | `isPendingMessage(id)` true — nothing to withdraw yet       |
| Media attached | Body carries `content` **and** `mediaUrls`                  |

The `429` case is deliberate coverage of the second (and last) title
`getErrorMessage` answers in its own words. Five writes a minute is low enough
that an ordinary exchange reaches it.

#### `placeList` (`src/shared/utils/caret-position.test.ts`)

8 tests over the arithmetic half of the suggestion list's position: the line
under the caret, clamping inside the field, and flipping above when the
viewport has no room below.

Only the arithmetic. The other half builds a mirror element and reads its
geometry, and **jsdom reports every element as 0×0** — that part is measured in
`e2e/mentions.spec.ts`, where a real browser lays text out.

The flip has two conditions, not one: there must be no room below **and** room
above. Near the top of a short viewport neither holds, and the cramped view
below still beats one that runs off the top.

#### `readActiveHandle` (`src/shared/hooks/useMentionAutocomplete.test.ts`)

13 tests over the caret reader, which decides whether a suggestion list opens.
Pure on purpose: the rest of the hook is a textarea and a debounce, and neither
is where this goes wrong.

It has to agree with the rendering grammar about what an `@` starts — a list
that offers accounts inside an email address is promising a link that can never
exist. It reads only the text **before** the caret, or moving back into a
finished handle reopens the list on every keystroke elsewhere in the body.

#### `checkDraft` (`src/features/article/hooks/checkDraft.test.ts`)

11 tests over the pure validator behind the editor's `canSave`: empty, title and
body caps, the request byte cap, and the ten-handle mention cap.

**The mention cap is checked here rather than at the publish button**, and the
placement is the point: autosave is gated on the same `canSave`, so a body
naming eleven people would otherwise retry a request the server is certain to
refuse, every two seconds, for as long as the editor stayed open. Distinct
accounts are counted, not occurrences — a body repeating one name is fine, and
eleven email addresses name nobody.

#### `useOpenConversation` (`src/features/messages/hooks/useOpenConversation.test.ts`)

4 tests, written after the message button shipped sending `{}`.

| Scenario                | Assert                                             |
| ----------------------- | -------------------------------------------------- |
| A recipient             | Body is `{ recipientId }`; navigates to the thread |
| **No recipient**        | **No request at all**, and nothing navigated       |
| Signed out              | The auth modal opens; no request                   |
| `InvalidRecipientError` | The server `detail` toasted; no navigation         |

The second row is the regression. `JSON.stringify` drops a key whose value is
`undefined`, so a caller reading an id off a field the API does not send
produced an empty body — and the only thing the server could answer was that
`recipientId` was missing, which reads as a malformed request rather than as a
profile with no id. No request beats one that cannot succeed and misreports
why.

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

`PostList` takes an optional `emptyMessage`. The feed's "Category Empty" is
wrong for a list that is not the feed — the quotes page passes its own — and
`onPostQuoted`, which it forwards to each card, is how a freshly created quote
reaches the list that should show it.

#### Quotes (`QuotedPostCard`, `QuoteComposerModal`, `useQuotes`)

A quote is not a separate entity — it is a post whose `quotedPostId` is set —
so the coverage here is deliberately narrow: the embedded card, the composer,
and the list endpoint. Everything else (liking, bookmarking, commenting on,
deleting a quote) is already covered by the post specs and needs no quote-
specific case, which is the point of the API's design.

Three payload facts drive the assertions:

- The embedded card carries **no counters and no `isLiked`/`isBookmarked`**, so
  `QuotedPostCard` renders no action row at all — one test asserts it has no
  buttons, so an action added there fails loudly rather than rendering a
  control with nothing behind it.
- It carries **no `quotedPost` of its own**. The card can never nest, and the
  composer therefore always quotes the _outer_ post.
- `content` may be `""` when `quotedPostId` is set. That is a plain repost, and
  both the card spec and `e2e/quotes.spec.ts` pin the repost rendering.

`useQuotes` (10 tests) pages the way every list in the app pages — a short page
is the last page — because `apiClient` unwraps `ApiResponse.data` and the
endpoint's `meta.totalPages` never reaches a caller. Its 404 test matters: a
deleted original cascades to the posts that quoted it, so this endpoint can 404
on a post the reader was just looking at. That surfaces as a list error with a
retry, never as a "this post was removed" tombstone.

| Scenario                   | Assert                                                   |
| -------------------------- | -------------------------------------------------------- |
| First page                 | Quotes populated, `isLoading` false, no error            |
| Request shape              | `GET /posts/<id>/quotes?page=1&limit=20`                 |
| Short page                 | `hasMore` false                                          |
| Full page then a short one | Appended; `hasMore` flips false                          |
| 404 (original deleted)     | `error` set, list stays empty, nothing throws            |
| `data: null`               | `assertList` rejects it before it becomes state          |
| `loadMore` fails           | Page counter does not advance — page 2 is retried, not 3 |
| `addQuote` / `removeQuote` | Prepend / filter                                         |
| No post id                 | No request fired                                         |

`QuoteComposerModal` (6 tests) covers the preview, the body it posts
(`content` + `quotedPostId`), the empty body that makes a repost, the created
post handed back to the caller, the 300-character guard, and a 429 surfacing
the API's own rate-limit message rather than a generic one.

#### `MarkdownBody` (`src/features/article/components/MarkdownBody.test.tsx`)

The API stores and returns article bodies as **raw, unsanitised markdown** — sanitisation is entirely the client's job. `MarkdownBody` does it by omission: `skipHtml` on `react-markdown`, and no `rehype-raw`. Three tests exist purely to keep it that way, because on a site where anyone can publish, rendering embedded HTML is stored XSS:

| Scenario                        | Assert                                       |
| ------------------------------- | -------------------------------------------- |
| `<script>` in the body          | No `script` element reaches the DOM          |
| `<img onerror=...>` in the body | No `img[onerror]` element                    |
| `[click](javascript:...)`       | The `href` does not survive as `javascript:` |

The rest cover rendering itself: headings/emphasis/lists as real elements, fenced code inside a scrollable `<pre>`, and GFM tables — which only render if `remark-gfm` is still wired in.

`ArticleCard` has the matching assertion for `excerpt`: it is derived server-side with markdown marks stripped but **HTML left intact**, so the card must print it as text.

#### `TagInput` and `normaliseTag` (`src/features/article/`)

Tags must match `^[a-z0-9-]{1,30}$`, and a tag that fails comes back as a bare 400 that **never names the field** — so the input has to fix or refuse it before it is sent.

`normaliseTag` is tested as a pure function, including the property that every input either normalises to something the server pattern accepts or to the empty string. Turkish letters are transliterated rather than stripped — `yazılım` quietly becoming `yazlm` would be worse than rejecting it — and the component shows the writer what their input will become before they commit it.

#### `PostCard` / `CommentCard`

16 and 5 tests. Both cards navigate on a click anywhere in the `<article>`, so much of their coverage is about the clicks that must **not** navigate. Both mock `useNavigate`, `usePostActions`/`useCommentActions` and `useTranslation`, so the card's own routing and rendering is all that is under test.

| Scenario                         | Assert                        |
| -------------------------------- | ----------------------------- |
| Card clicked                     | Navigates to the detail route |
| Avatar clicked                   | Navigates to the profile      |
| Video clicked (`PostCard`)       | Does not navigate             |
| Click ending a text selection    | Does not navigate             |
| Click with an empty selection    | Still navigates               |
| Delete button (own post/comment) | Confirmation modal opens      |
| `handleDelete` resolves true     | Modal closes                  |

`PostCard` carries eight more for quotes. Note that it now reaches
`useAuthStore` — to gate the composer behind a session — so its spec needs the
`vi.hoisted` localStorage stub like every other file whose module graph touches
`persist`.

| Scenario                           | Assert                                           |
| ---------------------------------- | ------------------------------------------------ |
| `quotedPost` present               | Embedded card renders the quoted author and text |
| `quotedPost` null                  | No embedded card                                 |
| `quoteCount` 0                     | No quote badge                                   |
| Quote badge clicked                | `navigate("/posts/<id>/quotes")`                 |
| Empty `content` + `quotedPost`     | "reposted" marker, no empty text bubble          |
| Non-empty `content` + `quotedPost` | The post's own text, no repost marker            |
| Quote button, signed in            | Composer opens                                   |
| Quote button, signed out           | Auth modal opens; composer does not              |

> **The author fields here need no client-side guards, and adding them is a mistake worth naming.** `username` reads as optional in `PostAuthorSchema` / `CommentAuthorSchema`, but `User.username` is `NOT NULL`, the `author` relation on `Post` and `Comment` is required with `onDelete: Cascade`, and every repository query selects it. `avatarUrl` is `NOT NULL` with a database default, is absent from `UpdateProfileBodySchema` (which sets `additionalProperties: false`, so no client can write it), and `toFeedResponse` substitutes a CDN default and CDN-prefixes anything not starting with `http`. So neither a `?? fallback` nor a `getSafeImageSrc` call can ever do anything on these two cards. The slack is in the TypeBox schemas, not the data — tracked in tdn-api#182. Fixtures use a realistic CDN url rather than `""` so they match what the API actually sends.
>
> The `|| ui-avatars` fallbacks that remain in `PostBox`, `CommentBox`, `EditProfileModal`, `ProfilePage` and `ProfileSearchDropdown` are **live**: those render the current user from the auth store, whose `LoginResponse.user` carries only `{ id, username, isEmailVerified }`, so `avatarUrl` really is undefined until the profile sync lands.

> ⚠️ **`vi.spyOn(window, "getSelection")` must be restored.** `@testing-library/user-event` reads the selection while typing, and a stub left in place strands every later spec that types into a field — five unrelated auth and settings specs failed on a 5 s `user-event` timeout, all of them passing in isolation. Both card specs call `vi.restoreAllMocks()` in `afterEach`. If a batch of typing tests starts timing out for no reason, look for an unrestored global spy rather than at the specs that failed.

#### `NotificationCard`

`NotificationType` must mirror the API's enum exactly, and `COMMENT_REPLY`
showed what it costs when it does not. `MESSAGE_KEYS` is a
`Record<NotificationType, TranslationKey>`, so a value missing from the _union_
is missing from the map too — and a `Record` cannot flag a member its key type
does not have, so TypeScript saw nothing wrong. The card then called
`t(undefined)`, which throws inside `{{var}}` interpolation rather than
returning a fallback string. One `COMMENT_REPLY` in the feed took down the
whole notification list.

The API owns that enum and can grow it after any build ships, so the union is
no longer the only defence: an unrecognised type falls back to a generic
message and to the issuer's profile, which is always a valid destination. Two
tests cover the unknown-type path specifically, because the _next_ enum value
will arrive the same way this one did.

| Scenario                 | Assert                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| `FOLLOW` type click      | `navigate("/profile/<username>")` called                          |
| `LIKE` type click        | `navigate("/post/<referenceId>")` called                          |
| `NEW_POST` type click    | `navigate("/post/<referenceId>")` called                          |
| `NEW_POST`, no reference | Falls back to `/profile/<username>`                               |
| `COMMENT` type click     | `navigate("/comments/<referenceId>")` called                      |
| `COMMENT_REPLY` render   | Its own message, not a crash                                      |
| `COMMENT_REPLY` click    | `navigate("/comments/<referenceId>")` called                      |
| `QUOTE` render           | "@user quoted your post", not a crash                             |
| `QUOTE` click            | `navigate("/post/<referenceId>")` — the _quote_, not the original |
| `QUOTE`, no reference    | Falls back to `/profile/<username>`                               |
| An unknown type          | Renders a generic message; does not throw                         |
| An unknown type, clicked | Falls back to `/profile/<username>`                               |
| `isRead: false`          | Element has `border-l-blue-500` class                             |

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

#### `MarkdownBody` — mentions (`src/features/article/components/MarkdownBody.test.tsx`)

8 tests appended to the existing sanitisation and typography ones. An article
body is markdown, so mentions are linked by a remark plugin over the tree
rather than a pass over rendered output: afterwards a handle in a code span
looks exactly like one in a sentence.

| Left alone                    | Why                                        |
| ----------------------------- | ------------------------------------------ |
| inline code, fenced blocks    | an `@` in a snippet is part of the snippet |
| the label of an existing link | a link inside a link is invalid HTML       |
| an autolinked email           | `remark-gfm` already made it a link node   |

A mention link renders through `Link` with no `target` or `rel`; an author's own
link keeps both. The email case asserts that no `/profile/` link appears rather
than that no link appears at all — `remark-gfm` autolinks bare emails, so there
is one either way.

#### `RichText` (`src/shared/components/ui/RichText.test.tsx`)

15 tests. Urls, `**bold**` and `#tags` were already there and are pinned so the
mention branch cannot break them; the rest is the pairing rule.

| Given                                              | Renders                                  |
| -------------------------------------------------- | ---------------------------------------- |
| `@ada` with a matching entry                       | a link to `/profile/ada`                 |
| `@Ada` with entry `ada`                            | the typed text, linked to `/profile/ada` |
| `@nobody`, or no `mentions` at all                 | plain text                               |
| an entry whose username no longer matches the text | plain text                               |
| `ada@example.com`, `docs/@ada`                     | plain text                               |
| `@ada.`                                            | the link stops before the dot            |

Two assertions are structural rather than about mentions: `(@ada)` keeps its
bracket, and a mixed body round-trips to exactly its input. The parser consumes
the character before a handle, so losing it is the failure this shape invites.

#### `MessageBubble` (`src/features/messages/components/MessageBubble.test.tsx`)

14 tests. Four server flags that are independent of each other, plus the delete
affordance and the read watermark.

| Flag            | Renders                                |
| --------------- | -------------------------------------- |
| `isDeleted`     | Tombstone; the row **keeps its place** |
| `mediaPending`  | `PendingMedia` with a working refresh  |
| `mediaRejected` | "Media removed"                        |
| `isSensitive`   | `SensitiveMedia` cover                 |

**"Media removed" is the deliberate exception to the rule posts follow.** A post
whose media was refused is byte-for-byte a post that never had any, so saying
otherwise means reconstructing the difference from session memory and showing two
readers different things. A message states it in a field, so nothing is
reconstructed. Do not "fix" this to match `PostCard`.

The delete control is withheld from someone else's message (only the sender may
withdraw) and from a `temp-` bubble (nothing to withdraw yet), and it confirms
before firing. The watermark is per conversation, not per message: a sent message
reads "Seen" once its `createdAt` precedes `otherLastReadAt`.

#### `BlockedAccountsList` (`src/features/block/components/BlockedAccountsList.test.tsx`)

5 tests, MSW-backed and wrapped in `MemoryRouter` (the rows link to profiles).
**Requires the `vi.hoisted` localStorage stub** — the module graph reaches
`useAuthStore`.

This is the Settings section, and the only screen that can reach a block once
it stands: the account is invisible in the feed, in search, on its own
timeline and in the inbox. The rows still link to the profile, which is served
to a blocked viewer for the same reason it is served at all.

| Scenario           | Assert                                                     |
| ------------------ | ---------------------------------------------------------- |
| Empty list         | "You have not blocked anyone.", not a blank section        |
| One row            | Name, `@handle`, and a link to `/profile/bob`              |
| Unblock succeeds   | Row gone; one **success** toast                            |
| Unblock fails      | Row **stays**; one **error** toast                         |
| The list itself fails | Retry offered                                           |

The failure row is the one that matters: dropping the row on a request that
then failed would strand the block with nothing on screen pointing at it.

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

**`BookmarksPage`:**

6 tests. `useBookmarks` is mocked wholesale, and `PostList`, `CommentList` and `ArticleList` are stubbed to `data-testid` divs — the page's own job is the tab strip and the empty state, not the lists.

The strip is **Posts, Comments, Articles**, and exactly one list is mounted at a time. That is not cosmetic: `PostList` and `ArticleList` each install an `IntersectionObserver` sentinel calling the same `loadMore`, and side by side both would fire in one tick past the `isLoadingMore` guard. A test that lets two lists render together would pass while re-opening that hole.

The illustrated empty state belongs to the page and covers all three collections at once; a tab that is empty on its own falls through to its list's own empty state.

| Scenario             | Assert                                              |
| -------------------- | --------------------------------------------------- |
| Unauthenticated      | Renders nothing; `navigate("/", { replace: true })` |
| `isLoading`          | `.animate-spin` present                             |
| Nothing saved at all | "Save posts for later" rendered                     |
| Default tab          | `post-list` present; `article-list` absent          |
| Click **Articles**   | `article-list` present; `post-list` gone            |
| Only articles saved  | Illustrated empty state **not** rendered            |

**`FeedPage`:**

The tab strip is **Community, News, Updates, Articles**. Articles replaced Job postings in that fourth slot; `JOB_POSTING` is deliberately still in the `PostType` union so existing job posts keep rendering wherever they are linked, and `FeedPage.test.tsx` asserts the four tabs render **and** that no "Jobs" button exists — reinstating the tab has to be a deliberate edit, not a silent regression.

Articles are a separate resource, not a `PostType`, so the tab cannot live inside `useFeed`. It lives in the **query string** instead — `?tab=news&following=1&categories=AI,BACKEND` — and `useFeed` no longer carries an `activeCategory`/`changeCategory` pair at all. That is what makes Back correct by construction: opening a post unmounts the page, and the URL is the one piece of it the browser already restores. It also makes a filtered feed a link someone can send. The slugs (`community`, `news`, `updates`, `articles`) are their own vocabulary rather than the `PostType` values, so renaming a post type in the API cannot break a shared link.

The tests therefore drive the strip by **clicking** and assert on the resulting URL, never by mocking hook internals. Filter and tab writes use `replace: true`: pushing would turn Back into an undo stack for chip taps — three taps, three presses to leave the feed — when Back's job here is to leave.

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
| Tab clicked                          | `?tab=news` written to the URL, replacing the history entry                                |
| Mounted at `?tab=updates`            | Updates opens; an unknown slug falls back to Community rather than an empty page           |
| Chips and "Following" toggled        | Both land in the URL, and are read back out of it on the next mount                        |
| Three chip taps                      | One history entry, not three                                                               |

**Coming back (`describe("surviving a Back")`)**

The URL restores the tab; it cannot restore the list. That is `useFeedSnapshotStore` (`src/features/feed/store/feed-snapshot.store.ts`), holding one entry — posts, articles, the page each had reached, and the scroll offset — filed under the router's `location.key`.

Three rules the tests hold down:

- **Only a POP restores.** A key that does not match is a different visit — a reload resets it, a fresh navigation gets its own — and a fresh visit must fetch. Asking for the feed again (the Home link, a notification) is a PUSH and gets a current feed.
- **The snapshot is read once, in a state initialiser.** One arriving mid-render would swap the list out from under the reader.
- **Scroll is captured on every scroll event, not at unmount.** Leaving swaps in a shorter page and the browser clamps `window.scrollY` before any cleanup runs, so by then the number is already gone.

| Scenario                           | Assert                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| Back onto a matching entry         | The stored list renders; `fetchPosts` **not** called again                                     |
| Back onto a matching entry         | `window.scrollTo` called with the offset the reader left from                                  |
| Left before the first page arrived | Nothing saved — restoring an empty feed would strand the reader on a list that never refetches |
| Tab changed after a restore        | Fetches again; the restore is spent, not sticky                                                |

Restoring means **not** refetching, so a like or bookmark made on the post's own page has to be written back by hand. `usePostActions` calls `patchPost` alongside its own optimistic update and again on rollback; `feed-snapshot.store.test.ts` pins the misses down by **identity** — no snapshot, or a post the snapshot does not hold, must not rebuild the stored list, because every like anywhere in the app comes through that call.

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

**`ExplorePage` tag view** (`src/pages/ExplorePage.test.tsx`)

A tag is not a post-only idea. `GET /articles?tag=` narrows articles the same way `GET /posts?tag=` narrows posts, so `/explore?tag=nodejs` carries the same Posts / Articles strip the profile does — an author who tags an article `nodejs` expects it under #nodejs.

Which tab is open lives in the **query string** beside the tag, so `/explore?tag=nodejs&tab=articles` is a link someone can send. `posts` is the default and is left out of the URL, so the plain `/explore?tag=nodejs` already shared around still opens on posts. Switching **replaces** the entry: Back here is for leaving the tag, not for walking back through which of its two lists was looked at last.

The tests mock both hooks and stub both lists down to a marker — which list is mounted, and what the hooks were asked for, is the whole question. The URL is asserted through a `useLocation` probe and the replace through `useNavigationType`, rather than by reaching into history.

| Scenario                   | Assert                                                                          |
| -------------------------- | ------------------------------------------------------------------------------- |
| `?tag=nodejs`              | `fetchPosts({ tag })`; post list mounted; **no** articles request yet           |
| Articles tab clicked       | `fetchArticles({ tag })`; the lists swap; `fetchPosts` **not** called again     |
| Articles tab clicked       | `tab=articles` written to the URL, alongside the tag                            |
| `?tag=nodejs&tab=articles` | Opens on articles with no post request at all                                   |
| `?tab=nonsense`            | Falls back to Posts rather than an empty page                                   |
| Tab switched               | Navigation type is `REPLACE`; returning to Posts drops `tab` from the URL again |
| Either tab                 | The subtitle says which of the two it is counting                               |
| No tag                     | Trending view only — no strip, and neither list fetches                         |

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

4 tests: two on the form-reset rule, two on the theme picker.

The form-reset pair covers the rule the three mutation sections share. `handleSubmit` resolves to a boolean; the sections must branch on that, never on the `error` returned by the hook — after `await`, that binding still holds the value from the render the submit started in, so it reports the previous attempt's outcome.

MSW fails the first `PATCH /users/me/username` and accepts every one after it, so a single render covers both transitions.

The theme pair asserts the store, the `data-theme` attribute, and `aria-pressed` — the pills are the only control on the page with no label of their own to read state from, so a sighted reader sees the fill and everyone else has the attribute or nothing. Both register their own `GET /users/me`: the shared handler answers with a shape the page does not read, and `AccountInfoSection` throws on it before the pills ever render.

| Scenario                       | Assert                                            |
| ------------------------------ | ------------------------------------------------- |
| Update fails (409)             | Error rendered; the typed username is still there |
| Success straight after failure | Success rendered; the field is cleared            |
| Click "Light"                  | Store set, `<html data-theme="light">`            |
| Click "System"                 | `aria-pressed` moves; only one pill is pressed    |

**`OnboardingPage`:**

15 tests. All three onboarding hooks are mocked wholesale; the page's own job is the two-step machine and the gate on the finish button. Step one is walked by **clicking** ("Backend", then "Continue") rather than by seeding state, because the picked fields have to reach `useOnboardingSuggestions` for step two to mean anything — one test asserts exactly that hand-off.

The gate opens at five follows _in total_, which makes the arithmetic worth spelling out:

- `stillNeeded = MIN_FOLLOWS − alreadyFollowing`, from the profile's own `followingCount`. Asking someone who follows four for five more is a different requirement than the one that sent them here.
- Progress is `netFollowChange`, **not** the size of the followed set. Bots that arrived already followed are inside `alreadyFollowing` already; counting the marked cards again would open the finish button for a returning user who followed nobody this time. Unfollowing one has to move the number back down, too.
- `required` drops to what the list can supply, but **only once the list is final** — an empty answer, or an endpoint that never answered. While a page is in flight the full requirement stands, or the finish button sits briefly open over a list that has not arrived.

The escape hatch is narrow by design: only a final, empty list (a failed request, or a field with no bots) opens the finish button with nothing followed. The flow is a requirement, not a trap.

Step one writes the picked fields to `useOnboardingStore` as they are picked rather than at the end. The API has nowhere to keep them — a profile carries no interests and `/profiles/bots` only takes them as a query parameter — so the store is the whole record, and writing late means a reload on step two comes back to an empty picker.

| Scenario                             | Assert                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Initial                              | Field picker rendered                                                      |
| No field picked                      | "Continue" disabled; enabled after a pick                                  |
| After "Continue"                     | `useOnboardingSuggestions` called with `["BACKEND"]`; `interests` stored   |
| 2 of 6 followed                      | "Go to my feed" disabled; "2 of 5 followed"                                |
| 5 of 6 followed                      | "Go to my feed" enabled                                                    |
| Only 2 accounts exist, both followed | Requirement drops — "2 of 2 followed", finish enabled                      |
| Suggestions errored                  | Finish enabled; "Try again" offered                                        |
| Already following 3, 2 more done     | "2 of 2 followed"; finish enabled                                          |
| Already following 3, all 3 seeded    | "0 of 2 followed"; finish **disabled**                                     |
| List still loading                   | Finish disabled — an empty list and a late one look alike                  |
| `hasMore`                            | "Show more" calls `loadMore`                                               |
| List complete                        | No "Show more"                                                             |
| Finish                               | `isCompleted` true, `interests` stored, `navigate("/", { replace: true })` |
| "Back"                               | Field picker again                                                         |

**`OnboardingGate` (`src/app/OnboardingGate.test.tsx`):**

9 tests. A pathless layout route wrapping every app route, rendered here through a `MemoryRouter` with a stub child so the pass/redirect decision is observable. `profileApi` is mocked; **the `vi.hoisted` localStorage stub is required** (two persisted stores).

The threshold is `followingCount < MIN_FOLLOWS`, not `=== 0` — an account that got partway and wandered off still has to finish. Three rules are load-bearing and each has a test:

- **It stands down while the auth modal is open.** `RegisterView` calls `setAuth` and then `setStep("verify-email")`, leaving the modal up over the page. Redirecting at that moment unmounts `AuthModal` along with the `PageShell` holding it, and the verification step is lost.
- **A failed profile request passes rather than redirects**, and warns to the console. Passing is deliberate — the gate is a requirement, not a trap — but silence made the whole feature look like it was never built: a profile endpoint that is down disables onboarding with no trace at all.
- **Finishing once settles it for good.** With a `< 5` check and no local completion flag, the account would be dragged back the moment it unfollowed someone, which is nagging rather than onboarding.

| Scenario                   | Assert                                           |
| -------------------------- | ------------------------------------------------ |
| Signed out                 | Passes; no profile request                       |
| Auth modal open            | Passes; no profile request                       |
| Already completed locally  | Passes; no profile request                       |
| `followingCount === 0`     | Redirects to `/onboarding`                       |
| `followingCount === 3`     | Redirects; completion **not** recorded           |
| `followingCount === 5`     | Passes and records completion so it stops asking |
| Completed locally, count 1 | Passes; no profile request — finishing is final  |
| Profile request rejects    | Passes                                           |
| Request in flight          | Spinner; the child is not rendered               |

**Sitemap routes (`src/app/sitemap-routes.test.ts`):** the path collector walks `children`, not just the top level — since the gate landed, nearly every route sits under a pathless layout route and a flat read would pass vacuously.

#### `ProfilePage` — the id every write carries

3 tests. `GET /profiles/:username` sends `id` and **no** `userId`; the type
declared the opposite, which is what let the message button read a field that
is never sent.

| Scenario              | Assert                               |
| --------------------- | ------------------------------------ |
| Profile with `id`     | `open` called with that id           |
| Profile with neither  | **Both** Message and Follow disabled |
| Profile with `userId` | The legacy fallback still resolves   |

**The fixtures carry `id` alone on purpose.** One that also sets `userId`
passes either way and proves nothing — which is exactly what the MSW mock in
`tests/mocks/handlers.ts` used to do, leaving every profile test exercising
only the `?? userId` fallback and none of them the shape the API returns. That
mock now sends `id`.

The second row covers both buttons because they share one derived id. Guarding
only the message button left Follow live on an empty id, where it posts
`{ targetId: "" }` — an empty string is **not** dropped from a body the way
`undefined` is, so the request goes out, fails validation, and the optimistic
flip rolls back with no toast by convention. The button appears to work and
then silently un-presses itself.

Use `{ name: "Follow" }` — a string matches the whole accessible name, whereas
`/follow/i` also matches the followers and following count buttons. (`getByRole`
has no `exact` option; that one belongs to `getByText`.)

#### `ProfilePage` — blocking

5 tests. The API keeps serving a blocked account's profile rather than
answering 404, so that a blocked reader can be told what happened instead of
concluding the app is broken. The page therefore has to say the two directions
apart: `isBlocked` offers the way out, `isBlockedBy` is a wall with nothing to
act on — following it answers 403 and opening a conversation answers 400.

| Scenario                       | Assert                                                    |
| ------------------------------ | --------------------------------------------------------- |
| Ordinary profile               | Block control offered; the post list renders              |
| `isBlocked`                    | Unblock offered; "You blocked @bob"; no Follow, no Message |
| `isBlockedBy`                  | "@bob blocked you"; no Follow, no Block, no Unblock       |
| Both flags                     | Treated as your own block — Unblock wins                  |
| Either flag                    | Tabs and timeline replaced by the notice                  |

The last row is the product decision worth keeping: a blocked account's
timeline comes back **empty**, and an empty tab reads as "this account has
never written anything", which is a different and wrong statement.

#### `MessagesPage` (`src/pages/MessagesPage.test.tsx`)

5 tests. MSW-backed, so the listing goes through `api.getPage` for real — a
handler that answers `{ data }` without `meta` fails here, which is the point.

| Scenario         | Assert                                                      |
| ---------------- | ----------------------------------------------------------- |
| Accepted listing | Rows rendered with their previews                           |
| Empty            | The empty state, not a blank column                         |
| Requests tab     | `status=PENDING` requested; the pending rows render         |
| Signed out       | `navigate("/", { replace: true })` and the auth modal opens |
| Listing fails    | Retry offered, and it works                                 |

The tab switch remounts the listing (`key={tab}`) so one tab's cursor is never
appended onto the other's.

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

**`onboarding.spec.ts`** — the one spec that opts _out_ of the shared fixture. `injectAuth` writes `tdn-onboarding` with the mock user's id alongside the auth state, because without it `OnboardingGate` would send **every authenticated spec** to `/onboarding` (the mocked profile reports `followingCount: 0`) and the whole suite would fail on a page it never meant to visit. This spec signs in by hand without that key so the gate actually runs, then drives both steps and asserts the redirect out to `/`. Its follow loop uses `getByRole("button", { name: "Follow", exact: true })`: without `exact`, "Following" also matches and the loop keeps clicking the button it just toggled.

The route handler matches `/profiles/bots` **before** the generic `/profiles/` arm — that one matches the bot URL too, and would answer the list with a profile object.

Five tests: the full flow out to `/`; an account at 4 follows still gated and asked for one more; a returning account whose bots come back `isFollowing: true` (three cards read "Following", the counter still says "0 of 2", and the finish button stays shut until two _new_ follows land — the double-count bug, end to end); an account at 5 left alone; and **a real registration** — identifier → register form → "Skip for now" → `/onboarding`. That last one exists because every other spec injects auth into `localStorage` and so never exercises the modal at all: a brand-new account is never email-verified, so `RegisterView` parks it on `verify-email` with the modal open, and the gate deliberately stands down until that modal closes. Nothing else covers the hand-off between the two.

**`quotes.spec.ts`** — five tests over the quote flow end to end: the embedded card in the feed, a textless quote drawn as a repost, the badge routing to `/posts/:id/quotes`, that page's own empty state, and composing a quote. The last one is the one worth keeping: it asserts both the request body (`content` + `quotedPostId`) and that the new row appears **without a refetch**. The feed is cached for 60 s server-side, so a quote that only showed up after reloading would look, to the person who wrote it, exactly like one that failed to post.

**The follow control in the follower/following list is measured, not asserted by class.** It sits inside a row that navigates to the profile, so every pixel the thumb misses opens the profile instead — which is indistinguishable, to the person holding the phone, from a button that does nothing. `profile.spec` sets a 390px viewport and reads `boundingBox().height`, because the number is the whole point: the pill shipped at 26px against a 44px minimum, and only a measurement catches it going back.

**`block.spec.ts`** — three tests over blocking end to end. Blocking from a profile asserts the request body and then the **re-read**: the server also drops both follows and answers the counts as zero, so the page throws its local copy away and asks again rather than patching four fields out of a response that carries one. The route handler flips a `blocked` flag so the second `/profiles/bob` answers differently, which is the only way to prove the refetch happened at all. The third test is the settings list — the only route back to a block, and so the one screen the feature cannot ship without.

> Every button assertion here passes `exact: true`. Playwright matches an accessible name as a substring by default, so a bare `"Follow"` also matches the "10 Followers" and "5 Following" count buttons — which is how the first draft of the blocked-by test reported two Follow buttons on a page that has none. Same trap as `onboarding.spec`.

**`theme.spec.ts`** — six tests, and the only place the theme is proved to change anything. The unit tests can assert the attribute; only a browser resolves `--color-ground` through the cascade, so these read `getComputedStyle(document.body).backgroundColor` and expect literal `rgb(255, 255, 255)` / `rgb(0, 0, 0)`. Three cover the stored choice (light, dark, and an account that never picked one still getting dark), one uses `test.use({ colorScheme: "light" })` to prove `"system"` follows the desktop, and one switches in Settings and reloads.

**The sixth blocks every module and expects the attribute anyway.** That is the only way to test the inline script in `index.html`, which duplicates `resolveTheme` so the first paint is already the right colour — `persist` cannot read `localStorage` until React has mounted, and until then the stylesheet's default is dark. Aborting only `/src/app/main.tsx` does **not** work: Vite serves modules with a `?t=` cache key, so a path-exact route misses and the app boots regardless, leaving a test that passes while proving nothing. The route is a regex over module extensions instead, and `#root` is asserted empty to show nothing of the app ran.

**It pins the locale.** `useI18n` sniffs `navigator.language`, so `seed()` writes `tdn-language` alongside `tdn-theme`: a spec that clicks a pill labelled "Light" should say which language it means rather than inherit one from whatever machine is running it. The rest of the suite leaves this to the default and passes, so this is insurance rather than a fix for an observed failure.

**`mobile-zoom.spec.ts`** — the only spec that overrides the viewport (`test.use({ viewport: { width: 390, height: 844 } })`), and it has to: the rule it guards lives behind a `max-width` media query, so at the desktop width every other spec runs at, the assertion would pass while proving nothing.

iOS Safari zooms the page in when it focuses a field rendering text under 16px, and never zooms back out. The fix is one rule in `src/app/index.css` rather than a class on each field — the per-field version had already been missed, with the search box carrying `text-[16px] sm:text-sm` while the comment and post boxes still sat at 15px.

The spec reads `getComputedStyle(el).fontSize` on every visible field, not the class list: what matters is the pixel value the browser resolved, whatever produced it. `expectNoFieldZooms` asserts a minimum field count first, so a page that rendered no fields cannot pass the loop vacuously. Removing the CSS rule fails all three tests, naming the offending placeholders.

Two mobile-only facts are baked into how it drives the app, and both bit on the first run: the sidebar is hidden below `md`, so the way into the auth modal is BottomNav's profile **button** (not a link); and comments live at `/posts/:id/comments`, so a route mock matching `/posts/` before `/comments` answers the comment list with a single post object.

**`responsive.spec.ts`** — the other spec that sets its own viewport, and the only one that sets four: 390 and 320 for phones, 768 and 1024 for a tablet upright and turned sideways. It exists because the layout ladder is not something a unit test can see. jsdom reports every element as 0×0, so a column that runs 172px off the right edge of a tablet measures the same as one that fits; only a browser resolving widths against a real viewport can tell them apart.

Twelve of its fifteen tests are one assertion — `documentElement.scrollWidth - clientWidth <= 1` — over three pages at each width. That number caught, in order: the post card's action row (six controls with `gap-6` need 120px of gutter before an icon is drawn, which a 390px phone does not have after the avatar column, so the share button hung 20px past the edge of every card); and the reading column, which kept its 720px cap at every width and so ran off the screen on every tablet and every narrow desktop window.

**It waits for an `article`, not for `main`.** The card is what overflows. Waiting on the column measures an empty page and passes on a broken one — which it did, silently, until the wait was moved: with `main` the phone feed passed while overflowing by 20px, and only the profile page caught it.

The remaining three cover the changeover. The sidebar and `BottomNav` have to move together, and they did not: the sidebar arrived at `sm` (640px) where it claimed 220 of the 640 and left the feed 420 — narrower than the same feed gets on a phone, which at least has the whole screen. The third asserts Settings is reachable from the tablet sidebar, because it had been reachable nowhere: the desktop sidebar hides it behind a **hover** popup, a tablet has no hover, and the profile page's gear was `sm:hidden`. The rail carries it as an ordinary link now, and the gear moved to `md:hidden` to match.

> The rail also gave every sidebar link an `aria-label`. Below `xl` the labels are `display: none`, and hidden text is left out of the accessible name — so the rail was six links a screen reader could only call "link". That is also what lets this spec find Settings by name.

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

| Spec                  | Scenario                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `auth.spec`           | Clicking "Sign In" opens the identifier input                                                           |
| `auth.spec`           | `check: true` response → login step (password field visible)                                            |
| `auth.spec`           | `check: false` response → register step ("Create your account")                                         |
| `feed.spec`           | Mocked posts render as `<article>` elements                                                             |
| `feed.spec`           | Clicking "News" tab sends `type=TECH_NEWS` query param                                                  |
| `feed.spec`           | Clicking like triggers optimistic count increment                                                       |
| `feed-restore.spec`   | Back from a post keeps the News tab instead of resetting to Community                                   |
| `feed-restore.spec`   | Back does not refetch the feed it already had (request count unchanged)                                 |
| `feed-restore.spec`   | The Home link is a PUSH, so it fetches a current, unfiltered feed                                       |
| `feed-restore.spec`   | Back returns to the offset the post was clicked from, not to the top                                    |
| `feed-restore.spec`   | A like made on the post page shows on the feed the reader comes back to                                 |
| `explore-tags.spec`   | The Articles tab under a tag requests `/articles?tag=` and lists what it returns                        |
| `explore-tags.spec`   | `?tab=articles` opens on articles without fetching posts at all                                         |
| `explore-tags.spec`   | Switching tabs replaces the entry, so Back leaves the tag                                               |
| `profile.spec`        | Visit `/profile/:username` → full name heading visible                                                  |
| `profile.spec`        | `isMe: true` response → "Edit Profile" button visible                                                   |
| `profile.spec`        | Following-list follow button is ≥44px tall at 390px wide, and unfollows rather than opening the profile |
| `articles.spec`       | The Articles tab lists the returned articles as `<article>` elements                                    |
| `articles.spec`       | No "Jobs" tab; the strip reads Community, News, Updates, Articles in DOM order                          |
| `articles.spec`       | Category chip sends `categories=BACKEND`                                                                |
| `articles.spec`       | Opening an article renders its markdown as elements, not literal `#`/`**`                               |
| `articles.spec`       | A body carrying raw HTML is neither rendered nor executed                                               |
| `articles.spec`       | Liking increments the count before the request settles                                                  |
| `articles.spec`       | A 404 shows not-found and never hints at a draft                                                        |
| `article-editor.spec` | Write, preview, publish — created **once**, then published                                              |
| `article-editor.spec` | Publish stays disabled until there is a title and a body                                                |
| `article-editor.spec` | A tag is normalised to what the server pattern accepts                                                  |
| `article-editor.spec` | A guest is redirected home rather than into the editor                                                  |
| `messages.spec`       | The inbox lists conversations and opens one                                                             |
| `messages.spec`       | A sent message appears before the request settles; body carries `mediaUrls`                             |
| `messages.spec`       | A request sits in its own tab, offers accept/decline, and gains a composer                              |
| `messages.spec`       | A thread that is not yours reads "not found", never "forbidden"                                         |
| `messages.spec`       | The four message states render — tombstone, removed, pending, sensitive                                 |
| `responsive.spec`     | The thread fills the viewport at 390 — `scrollHeight === innerHeight`                                   |
| `responsive.spec`     | The composer sits above `BottomNav` on a phone                                                          |
| `responsive.spec`     | The trends rail is present on the thread at 1440, like every other page                                 |
| `responsive.spec`     | The inbox fits every width in the ladder                                                                |
| `mentions.spec`       | A resolved handle links and opens the profile                                                           |
| `mentions.spec`       | A handle nobody owns stays plain text                                                                   |
| `mentions.spec`       | An email address is not turned into a mention                                                           |
| `mentions.spec`       | The composer refuses an eleventh distinct handle                                                        |
| `mentions.spec`       | Typing `@ad` suggests accounts, and picking one completes the handle                                    |
| `mentions.spec`       | Enter belongs to the open list rather than to the newline                                               |
| `mentions.spec`       | Suggestions from the **first** character after the `@`                                                  |
| `mentions.spec`       | No suggestions inside an email address                                                                  |
| `mentions.spec`       | The list opens on the caret's line, not under the composer                                              |
| `mentions.spec`       | It follows the caret down a long article body                                                           |
| `mentions.spec`       | It stays on screen at 320 and 390px                                                                     |
| `responsive.spec`     | The shell stays centred at 1024–1600 — the columns, not the container                                   |

**The two positioning rows are measured and both fail on the code they were
written against**: the list opened 138px from the caret line in the post box
(the bound is 73) and 730px down in the article editor (the bound is 531). The
two width rows pass either way — the old list spanned the field, so it never
overflowed — and lock the intent rather than catching that regression.

**The centring row measures the columns, not the container, and that distinction
is the test.** The dead space sat _inside_ the container: at 1200 the container
was full-width, so its own margins were 0 and 0 and read as perfectly centred
while the rail ended 208px short of the right edge. The first version of this
assertion measured the container and passed on the broken layout. Measured on
`firstElementChild`/`lastElementChild` it fails by 32, 108, 208 and 258 across
the `lg` band.

**The two thread rows are measured, not eyeballed**, and both fail on the code
they were written against: 908 against an 844px screen, and no rail at 1440.
`PageShell` gives `main` `min-h-screen pb-16`, so a page setting its own
`h-[100dvh]` and its own bottom padding made the document 64px taller than the
screen — the header could be dragged away and a dead strip opened under
`BottomNav`. The height and the container width belong to the shell (`fill`,
and a container that follows the rail); `PageShell.test.tsx` covers both in
jsdom by class, and these cover what only a real viewport can show.

**`messages.spec.ts`** — its route helper answers the full `{ data, meta }`
envelope on every listing. A `route.fulfill` that returns `{ data }` alone leaves
`meta.nextCursor` undefined, which the client reads as "there is always another
page" — so the shape of the mock is load-bearing here in a way it is not for the
page-numbered endpoints.

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
2. **`unit-tests`** — `pnpm test` (Vitest, 675 tests)
3. **`e2e`** — `pnpm test:e2e` (Playwright, 69 tests across the `chromium` and `worker` projects); installs Chromium via `playwright install --with-deps chromium`; starts `pnpm dev` automatically via `webServer` config

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
