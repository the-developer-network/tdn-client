import type { ReactNode } from "react";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
    children: ReactNode;
    rightRail?: ReactNode;
    /**
     * `"feed"` is the 600px column every timeline uses. `"reading"` widens it
     * to 720px for long-form article bodies — 600px of 18px prose runs to
     * roughly 45 characters a line, short enough to be tiring over a full
     * article.
     *
     * The widening only happens at `xl`, where there is room for it: the
     * reading column shares the row with the 275px sidebar and the 320px rail,
     * and 275 + 720 + 320 is 1315. Below that it stays at the feed's 600px,
     * because a column that keeps its 720px on a tablet does not shrink — it
     * runs off the right edge of the screen, which is exactly what article
     * pages did at every width under 1315.
     *
     * Neither cap applies below `lg`, where the column simply fills the room
     * the icon rail leaves. Capping it there would have been the same mistake
     * pointed the other way: a 600px column on an 834px tablet with 160px of
     * dead black beside it.
     *
     * Both sit flush against the sidebar. Centring the wider column in the
     * space the sidebar leaves opened a gap down its left edge and shifted
     * articles out of line with every other page.
     *
     * The outer container widens along with the column, because the feed's
     * 1250 would have squeezed the right rail's space out of the article
     * pages.
     *
     * Every branch is a whole class string so Tailwind's scanner still sees
     * it; an interpolated `max-w-[${n}px]` would never be emitted.
     */
    width?: "feed" | "reading";
    /**
     * The page owns the viewport instead of growing the document.
     *
     * A thread pins its header and its composer and scrolls only the messages
     * between them. Doing that from inside the page did not work: `main` is
     * `min-h-screen` with `pb-16` for the bottom bar, so a child that set its
     * own `h-[100dvh]` and its own bottom padding produced a document 64px
     * taller than the screen — the header scrolled away and a dead strip
     * opened under `BottomNav`.
     *
     * So the height belongs here, with the rest of the ladder. `pb-16` stays
     * *inside* the fixed height, which is what keeps the composer clear of
     * `BottomNav` without a page repeating that number.
     *
     * `100dvh` rather than `100vh`: on a phone `vh` is the large viewport, so
     * it stays taller than the screen while the URL bar is showing, which is
     * the same overflow one layer up.
     */
    fill?: boolean;
}

/**
 * The three-column shell, and the one place the breakpoint ladder lives.
 *
 *   < md   phone: no sidebar, full-width column, `BottomNav` fixed to the
 *          bottom. `md` rather than `sm`, because at 640px the old sidebar
 *          claimed 220 of the 640 and left the feed 420 — narrower than the
 *          same feed on a phone, which has the whole screen.
 *   md     tablet portrait: a 72px icon rail, no right rail, and an uncapped
 *          column filling the rest. Every tablet portrait width in use lands
 *          here (744 to 834), so the column runs 672 to 762 — close enough to
 *          the desktop 600 to read the same way.
 *   lg     tablet landscape: the icon rail keeps its 72px so the trends rail
 *          fits — 72 + 600 + 320 is 992, where the labelled sidebar's 275
 *          would have squeezed the column down to 429.
 *   xl     desktop: the sidebar expands to 275px with its labels, the reading
 *          column takes its 720px.
 */
export function PageShell({
    children,
    rightRail,
    width = "feed",
    fill = false,
}: PageShellProps) {
    const isReading = width === "reading";

    /*
     * The container is centred as a block, so its width has to account for
     * what is actually in it. With a rail it holds 275 + 600 + 320; without
     * one it holds 875, and keeping the 1250 left the column sitting to the
     * left of a 375px void — the page looked misaligned against every other
     * page rather than simply missing its rail.
     *
     * Only from `lg`, because that is where the column stops growing. Below
     * it the column fills whatever room the rail leaves, and the viewport is
     * narrower than any of these caps anyway.
     */
    const containerClasses = rightRail
        ? isReading
            ? "max-w-[1320px]"
            : "max-w-[1250px]"
        : isReading
          ? "lg:max-w-[672px] xl:max-w-[995px]"
          : "lg:max-w-[672px] xl:max-w-[875px]";
    const columnClasses = isReading
        ? "w-full min-w-0 flex-1 lg:max-w-[600px] xl:max-w-[720px]"
        : "w-full min-w-0 flex-1 lg:max-w-[600px]";

    return (
        <div
            className={`flex justify-center bg-ground ${
                fill ? "h-[100dvh] overflow-hidden" : "min-h-screen"
            }`}
        >
            <div
                className={`flex w-full ${containerClasses} ${fill ? "h-full" : ""}`}
            >
                <div className="hidden md:block w-[72px] xl:w-[275px] shrink-0">
                    <Sidebar />
                </div>

                <main
                    className={`${columnClasses} md:border-x border-ink/10 pb-16 md:pb-0 ${
                        fill ? "h-full overflow-hidden" : "min-h-screen"
                    }`}
                >
                    {children}
                </main>

                {rightRail && (
                    <aside className="hidden lg:block w-[320px] shrink-0">
                        <div className="sticky top-0 h-screen overflow-y-auto">
                            {rightRail}
                        </div>
                    </aside>
                )}
            </div>

            <AuthModal />
            <BottomNav />
        </div>
    );
}
