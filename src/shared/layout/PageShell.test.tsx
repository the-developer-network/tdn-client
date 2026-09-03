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

            expect(main().className).toContain("lg:max-w-[600px]");
        });

        it("widens to 720px for reading", () => {
            renderShell({ width: "reading" });

            expect(main().className).toContain("xl:max-w-[720px]");
        });

        // The reading column shares the row with a 275px sidebar and a 320px
        // rail. 275 + 720 + 320 is 1315, so below `xl` it has to come down to
        // the feed's 600 — a 720px column that never shrinks is one that runs
        // off the right edge of a tablet, which is what it used to do.
        it("holds the reading column at the feed width below xl", () => {
            renderShell({ width: "reading" });

            expect(main().className).toContain("lg:max-w-[600px]");
            expect(main().className).not.toContain("sm:max-w-[720px]");
            expect(main().className).not.toContain("md:max-w-[720px]");
        });

        // Below `lg` the column fills whatever the 72px icon rail leaves.
        // Capping it at 600 on an 834px tablet would leave 160px of dead
        // black beside the feed.
        it("caps neither width below lg", () => {
            renderShell();
            expect(main().className).not.toMatch(/\b(sm|md):max-w-\[/);

            renderShell({ width: "reading" });
            expect(main().className).not.toMatch(/\b(sm|md):max-w-\[/);
        });

        // 275 + 720 + 320 is 1315, so the feed's 1250 container would squeeze
        // the reading column below its own cap and crowd out the right rail.
        it("widens the container along with the reading column", () => {
            renderShell({
                width: "reading",
                rightRail: <div data-testid="rail" />,
            });

            expect(container().className).toContain("max-w-[1320px]");
        });

        it("keeps the narrower container for the feed", () => {
            renderShell({ rightRail: <div data-testid="rail" /> });

            expect(container().className).toContain("max-w-[1250px]");
        });

        /*
         * The container is centred as a block, so its width has to match what
         * is in it. Keeping the 1250 with no rail left the column sitting to
         * the left of a 375px void — the page read as misaligned against every
         * other page rather than as one that simply has no rail, which is
         * exactly how it was reported.
         */
        describe("without a right rail", () => {
            it("drops the space the rail would have filled", () => {
                renderShell();

                expect(container().className).toContain("xl:max-w-[875px]");
                expect(container().className).not.toContain("max-w-[1250px]");
            });

            it("does the same for the reading column", () => {
                renderShell({ width: "reading" });

                expect(container().className).toContain("xl:max-w-[995px]");
                expect(container().className).not.toContain("max-w-[1320px]");
            });

            // Below lg the column fills the room the icon rail leaves, so a
            // cap there would put back the dead space this removes.
            it("caps nothing below lg", () => {
                renderShell();

                expect(container().className).not.toMatch(/\b(sm|md):max-w-\[/);
            });
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
            expect(main().className).toContain("xl:max-w-[720px]");
        });
    });

    /*
     * A thread pins its header and its composer and scrolls only what is
     * between them. Doing that from inside the page did not work: `main` is
     * `min-h-screen` with `pb-16` for the bottom bar, so a child setting its
     * own `h-[100dvh]` and its own bottom padding made the document 64px
     * taller than the screen. The height belongs here, with the rest of the
     * ladder — and `pb-16` stays inside it, which is what keeps a composer
     * clear of `BottomNav` without the page knowing that bar's height.
     */
    describe("fill", () => {
        it("grows the document by default", () => {
            renderShell();

            expect(main().className).toContain("min-h-screen");
            expect(main().className).not.toContain("h-full");
        });

        it("hands the viewport to the page instead", () => {
            renderShell({ fill: true });

            expect(main().className).toContain("h-full");
            expect(main().className).toContain("overflow-hidden");
            expect(main().className).not.toContain("min-h-screen");
        });

        // `100dvh`, not `100vh`: on a phone `vh` is the large viewport, so it
        // stays taller than the screen while the URL bar shows — the same
        // overflow one layer up.
        it("measures the outer height in dvh", () => {
            renderShell({ fill: true });

            const outer = container().parentElement!;
            expect(outer.className).toContain("h-[100dvh]");
            expect(outer.className).not.toContain("min-h-screen");
        });

        it("still leaves room for the bottom nav below md", () => {
            renderShell({ fill: true });

            expect(main().className).toContain("pb-16 md:pb-0");
        });
    });

    // The sidebar and the bottom nav have to change over at the same width, or
    // a tablet gets both at once — or, as it did at 640px, a sidebar that took
    // 220 of the 640 and left the feed narrower than it gets on a phone.
    describe("the sidebar / bottom-nav changeover", () => {
        const sidebarWrapper = () =>
            screen.getByTestId("sidebar").parentElement!;

        it("holds the sidebar back until md", () => {
            renderShell();

            expect(sidebarWrapper().className).toContain("hidden md:block");
        });

        it("leaves room under the column for the bottom nav below md", () => {
            renderShell();

            expect(main().className).toContain("pb-16 md:pb-0");
        });

        // 72 + 600 + 320 is 992: the rail arrives at lg only because the
        // sidebar is still the narrow icon rail there.
        it("keeps the sidebar at rail width until xl", () => {
            renderShell();

            expect(sidebarWrapper().className).toContain("w-[72px]");
            expect(sidebarWrapper().className).toContain("xl:w-[275px]");
        });
    });
});
