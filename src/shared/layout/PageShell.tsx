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
}: PageShellProps) {
    const isReading = width === "reading";

    const containerClasses = isReading ? "max-w-[1320px]" : "max-w-[1250px]";
    const columnClasses = isReading
        ? "w-full min-w-0 flex-1 lg:max-w-[600px] xl:max-w-[720px]"
        : "w-full min-w-0 flex-1 lg:max-w-[600px]";

    return (
        <div className="flex justify-center min-h-screen bg-ground">
            <div className={`flex w-full ${containerClasses}`}>
                <div className="hidden md:block w-[72px] xl:w-[275px] shrink-0">
                    <Sidebar />
                </div>

                <main
                    className={`${columnClasses} md:border-x border-ink/10 min-h-screen pb-16 md:pb-0`}
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
