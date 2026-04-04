import type { ReactNode } from "react";
import { AuthModal } from "../../features/auth/components/AuthModal";
import { Sidebar } from "./Sidebar";

interface PageShellProps {
    children: ReactNode;
    rightRail?: ReactNode;
}

export function PageShell({ children, rightRail }: PageShellProps) {
    return (
        <div className="flex justify-center min-h-screen bg-black">
            <div className="flex w-full max-w-[1250px]">
                <div className="hidden sm:block w-[275px] shrink-0">
                    <Sidebar />
                </div>

                <main className="flex-1 max-w-[600px] border-x border-white/10 min-h-screen">
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
        </div>
    );
}
