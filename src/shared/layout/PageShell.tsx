import type { ReactNode } from "react";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface PageShellProps {
    children: ReactNode;
    rightRail?: ReactNode;
    /**
     * `"feed"` is the 600px column every timeline uses. `"reading"` widens it
     * for long-form article bodies and centres it in the space left over by
     * the sidebar — 600px of 18px prose runs to roughly 45 characters a line,
     * which is short enough to be tiring over a full article.
     *
     * Both branches are written as whole class strings so Tailwind's scanner
     * still sees them; an interpolated `max-w-[${n}px]` would not be emitted.
     */
    width?: "feed" | "reading";
}

export function PageShell({
    children,
    rightRail,
    width = "feed",
}: PageShellProps) {
    const columnClasses =
        width === "reading"
            ? "w-full sm:mx-auto sm:max-w-[720px]"
            : "max-w-full flex-1 sm:max-w-[600px]";

    return (
        <div className="flex justify-center min-h-screen bg-black">
            <div className="flex w-full max-w-[1250px]">
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
