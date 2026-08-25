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
     * Both sit flush against the sidebar. Centring the wider column in the
     * space the sidebar leaves opened a gap down its left edge and shifted
     * articles out of line with every other page.
     *
     * The outer container widens along with the column, because 275 + 720 +
     * 320 is 1315 and the feed's 1250 would have squeezed the right rail's
     * space out of the article pages.
     *
     * Every branch is a whole class string so Tailwind's scanner still sees
     * it; an interpolated `max-w-[${n}px]` would never be emitted.
     */
    width?: "feed" | "reading";
}

export function PageShell({
    children,
    rightRail,
    width = "feed",
}: PageShellProps) {
    const isReading = width === "reading";

    const containerClasses = isReading ? "max-w-[1320px]" : "max-w-[1250px]";
    const columnClasses = isReading
        ? "max-w-full flex-1 sm:max-w-[720px]"
        : "max-w-full flex-1 sm:max-w-[600px]";

    return (
        <div className="flex justify-center min-h-screen bg-black">
            <div className={`flex w-full ${containerClasses}`}>
                <div className="hidden sm:block sm:w-[220px] lg:w-[275px] shrink-0">
                    <Sidebar />
                </div>

                <main
                    className={`${columnClasses} sm:border-x border-white/10 min-h-screen pb-16 sm:pb-0`}
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
