import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, Bell, CircleUser, Mail } from "lucide-react";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useMessageStore } from "../../features/messages/store/message.store";
import { useAuthStore } from "../../core/auth/auth.store";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";
import { useI18n } from "../hooks/useI18n";

export function BottomNav() {
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const unreadMessages = useMessageStore((state) => state.unreadCount);
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const { openModal } = useAuthModalStore();
    const { t } = useI18n();

    function handleProfileClick() {
        if (!isAuthenticated) {
            openModal();
            return;
        }
        navigate(`/profile/${user!.username}`);
    }

    return (
        <nav
            data-testid="bottom-nav"
            className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-ink/10 bg-ground md:hidden"
        >
            <NavLink
                to="/"
                end
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-ink" : "text-ink/40 hover:text-ink/70"}`
                }
            >
                <Home size={22} />
                <span>{t("nav.home")}</span>
            </NavLink>

            <NavLink
                to="/explore"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-ink" : "text-ink/40 hover:text-ink/70"}`
                }
            >
                <Compass size={22} />
                <span>{t("nav.explore")}</span>
            </NavLink>

            <NavLink
                to="/notifications"
                className={({ isActive }) =>
                    `relative flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-ink" : "text-ink/40 hover:text-ink/70"}`
                }
            >
                <span className="relative">
                    <Bell size={22} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-blue-500 text-on-fill text-[9px] font-bold leading-none">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </span>
                <span>{t("nav.notifs")}</span>
            </NavLink>

            {/*
             * Messages took the slot Saved used to hold rather than becoming a
             * sixth tab. Six tabs leave 60px each on a 360px phone, which is
             * narrower than the label needs; and Saved is reachable from the
             * sidebar at every width above `md` and from the profile page
             * below it, while the inbox had no way in on a phone at all.
             */}
            <NavLink
                to="/messages"
                className={({ isActive }) =>
                    `relative flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors ${isActive ? "text-ink" : "text-ink/40 hover:text-ink/70"}`
                }
            >
                <span className="relative">
                    <Mail size={22} />
                    {unreadMessages > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 flex items-center justify-center rounded-full bg-blue-500 text-on-fill text-[9px] font-bold leading-none">
                            {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                    )}
                </span>
                <span>{t("nav.msgs")}</span>
            </NavLink>

            <button
                onClick={handleProfileClick}
                className="flex flex-col items-center justify-center flex-1 py-3 gap-0.5 text-[10px] transition-colors text-ink/40 hover:text-ink/70"
            >
                {isAuthenticated && user?.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-ink/20"
                    />
                ) : (
                    <CircleUser size={22} />
                )}
                <span>{t("nav.profile")}</span>
            </button>
        </nav>
    );
}
