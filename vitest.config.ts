import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        // `worker/` is included because the Cloudflare Worker is what crawlers
        // actually see, and the Playwright suite runs against `pnpm dev` — the
        // Vite server — so it never exercises the Worker at all.
        include: [
            "src/**/*.{test,spec}.{ts,tsx}",
            "worker/**/*.{test,spec}.ts",
        ],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}", "worker/**/*.ts"],
            exclude: ["src/app/main.tsx", "src/**/*.types.ts"],
            thresholds: { lines: 70, branches: 70 },
        },
    },
});
