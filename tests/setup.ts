import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
});
afterAll(() => server.close());
