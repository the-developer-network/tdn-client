import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// PageShell mounts the sidebar, the bottom nav and the auth modal, all of
// which reach the persisted auth store. Only the layout is under test here.
vi.mock("./Sidebar", () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock("./BottomNav", () => ({
    BottomNav: () => <div data-testid="bottom-nav" />,
}));
vi.mock("../../features/auth/components/AuthModal", () => ({
    AuthModal: () => null,
}));

import { PageShell } from "./PageShell";

const renderShell = (props: Partial<Parameters<typeof PageShell>[0]> = {}) =>
    render(
        <PageShell {...props}>
            <div data-testid="content" />
        </PageShell>,
    );

const main = () => document.querySelector("main")!;
const container = () => main().parentElement!;

describe("PageShell", () => {
    it("renders the content, sidebar and bottom nav", () => {
        renderShell();

        expect(screen.getByTestId("content")).toBeInTheDocument();
        expect(screen.getByTestId("sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });

    it("omits the right rail when none is given", () => {
        renderShell();

        expect(document.querySelector("aside")).toBeNull();
    });

    it("renders a right rail when one is given", () => {
        renderShell({ rightRail: <div data-testid="rail" /> });

        expect(screen.getByTestId("rail")).toBeInTheDocument();
    });

    describe("column width", () => {
        it("defaults to the 600px feed column", () => {
            renderShell();

            expect(main().className).toContain("sm:max-w-[600px]");
        });

        it("widens to 720px for reading", () => {
            renderShell({ width: "reading" });

            expect(main().className).toContain("sm:max-w-[720px]");
            expect(main().className).not.toContain("sm:max-w-[600px]");
        });

        // 275 + 720 + 320 is 1315, so the feed's 1250 container would squeeze
        // the reading column below its own cap and crowd out the right rail.
        it("widens the container along with the reading column", () => {
            renderShell({ width: "reading" });

            expect(container().className).toContain("max-w-[1320px]");
        });

        it("keeps the narrower container for the feed", () => {
            renderShell();

            expect(container().className).toContain("max-w-[1250px]");
        });

        // Centring the wider column in the space the sidebar leaves opened a
        // visible gap down its left edge; both widths sit flush instead.
        it("never centres the column with auto margins", () => {
            renderShell({ width: "reading" });

            expect(main().className).not.toContain("mx-auto");
        });

        it("carries the reading column and a right rail together", () => {
            renderShell({
                width: "reading",
                rightRail: <div data-testid="rail" />,
            });

            expect(screen.getByTestId("rail")).toBeInTheDocument();
            expect(main().className).toContain("sm:max-w-[720px]");
        });
    });
});
