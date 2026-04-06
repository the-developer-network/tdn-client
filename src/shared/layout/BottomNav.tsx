import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, Bell, CircleUser, Bookmark } from "lucide-react";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useAuthStore } from "../../core/auth/auth.store";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";

export function BottomNav() {
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const { setStep, openModal } = useAuthModalStore();

    function handleProfileClick() {
        if (!isAuthenticated) {
            setStep("login");
            openModal();
            return;
        }
        navigate(`/profile/${user!.username}`);
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-black border-t border-white/10 sm:hidden">
            <NavLink
                to="/"
                end
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`
                }
            >
                <Home size={22} />
                <span>Home</span>
            </NavLink>

            <NavLink
                to="/explore"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`
                }
            >
                <Compass size={22} />
                <span>Explore</span>
            </NavLink>

            <NavLink
                to="/notifications"
                className={({ isActive }) =>
                    `relative flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`
                }
            >
                <span className="relative">
                    <Bell size={22} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </span>
                <span>Notifs</span>
            </NavLink>

            <NavLink
                to="/bookmarks"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}`
                }
            >
                <Bookmark size={22} />
                <span>Saved</span>
            </NavLink>

            <button
                onClick={handleProfileClick}
                className="flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors text-white/40 hover:text-white/70"
            >
                {isAuthenticated && user?.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-white/20"
                    />
                ) : (
                    <CircleUser size={22} />
                )}
                <span>Profile</span>
            </button>
        </nav>
    );
}
