import { AuthModal } from "../features/auth/components/AuthModal";
import { Sidebar } from "../shared/layout/Sidebar";

export default function FeedPage() {
    return (
        <div className="flex justify-center min-h-screen bg-black">
            <div className="flex w-full max-w-[1250px]">
                <div className="hidden sm:block w-[275px] shrink-0">
                    <Sidebar />
                </div>
                <main className="flex-1 max-w-[600px] border-x border-white/10">
                    {/* ... content */}
                </main>
            </div>

            {/* Global Modals */}
            <AuthModal />
        </div>
    );
}
