import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw-server";

/*
 * An unhandled request is a bug, not a fallback.
 *
 * `"warn"` let it through to the real network, and `worker/index.test.ts` was
 * taking that route on every run — four calls to the live production API,
 * because the Worker falls back to `DEFAULT_API_BASE` whenever the `API_BASE`
 * binding is unset and no handler covered that origin. It passed locally and
 * on most CI runs, then timed out at the 5 s limit whenever the API was cold,
 * as a failure with nothing in it pointing at the cause.
 *
 * `"error"` blocks the request and names it instead, and it holds for tests
 * nobody has written yet: one that forgets a handler fails immediately rather
 * than quietly depending on production being up and fast.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
});
afterAll(() => server.close());
