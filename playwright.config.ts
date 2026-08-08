import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 5173;
const WORKER_PORT = 8788;
const STUB_API_PORT = 8789;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: "html",
    use: {
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            testIgnore: /worker\//,
            use: {
                ...devices["Desktop Chrome"],
                baseURL: `http://localhost:${APP_PORT}`,
            },
        },
        {
            // The app specs run against Vite, so they never load
            // `worker/index.ts` — yet in production the Worker serves every
            // HTML request and everything a crawler sees. This project is the
            // only place the real thing runs.
            name: "worker",
            testMatch: /worker\/.*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                baseURL: `http://127.0.0.1:${WORKER_PORT}`,
            },
        },
    ],
    webServer: [
        {
            command: "pnpm dev",
            url: `http://localhost:${APP_PORT}`,
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
        },
        {
            // Stands in for the TDN API. Without it the Worker reads
            // production on every request the worker specs make — including
            // three pages of one hundred posts per /sitemap.xml.
            command: `node e2e/worker/api-stub.ts`,
            url: `http://127.0.0.1:${STUB_API_PORT}/health`,
            env: { STUB_API_PORT: String(STUB_API_PORT) },
            reuseExistingServer: !process.env.CI,
            timeout: 30_000,
        },
        {
            // Wrangler serves `dist/`, so the build has to have happened
            // first. The worker specs also read `dist/index.html` directly, to
            // prove their marker tag is absent before the Worker adds it.
            //
            // `--var API_BASE` is what keeps this run off the production API;
            // `worker/index.ts` falls back to production when it is unset, so
            // a deployment needs no equivalent setting.
            //
            // Probed on an asset rather than "/", because a bare origin is
            // answered by the asset layer before the Worker is even reached —
            // either would prove the port is up, but an asset is the cheaper
            // check and never touches the API.
            command: `pnpm run build && pnpm exec wrangler dev --port ${WORKER_PORT} --var API_BASE:http://127.0.0.1:${STUB_API_PORT}/api/v1`,
            url: `http://127.0.0.1:${WORKER_PORT}/favicon.svg`,
            // Reuse is convenient locally but will quietly serve you a Worker
            // built from code you have since edited — including the fix you
            // are trying to prove these tests catch. It will also serve one
            // started without the `--var` above, which fails the stub-content
            // assertions with production data. Kill the Wrangler process
            // between runs when you are comparing two versions of the Worker.
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
});
