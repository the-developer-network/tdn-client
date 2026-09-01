import { Link, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuthStore } from "../../core/auth/auth.store";
import { Button } from "../components/ui/Button";
import logo from "../assets/images/logo.png";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";
import { useNotificationStore } from "../../features/notifications/store/notification.store";
import { useI18n } from "../hooks/useI18n";

export function Sidebar() {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const { openModal } = useAuthModalStore();
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const { t } = useI18n();

    function handleProfileClick() {
        if (!isAuthenticated) {
            openModal();
            return;
        }
        navigate(`/profile/${user?.username}`);
    }

    return (
        /*
         * Two shapes, not three: a 72px icon rail from `md` to `lg`, and the
         * labelled 275px column from `xl`. The rail is what makes room for the
         * feed on a tablet — the old 220/275px column showed the same icons
         * with the labels still hidden, so its extra width bought nothing and
         * cost the feed 200px.
         */
        <aside className="fixed h-screen w-[72px] xl:w-[275px] flex flex-col justify-between py-6 px-2 xl:px-4 border-r border-ink/10 bg-ground">
            <div className="flex flex-col gap-y-6">
                {/* Brand Logo */}
                <Link
                    to="/"
                    className="mb-2 flex justify-center xl:justify-start xl:px-3"
                >
                    {/*
                     * The mark is a white glyph baked onto an opaque black
                     * square, so on a light page it reads as a black tile
                     * rather than a logo. It is greyscale end to end, which
                     * makes inverting it exact — the glyph goes black, its
                     * square goes white, and the square disappears into the
                     * page the same way it disappears into black today.
                     */}
                    <img
                        src={logo}
                        alt="TDN"
                        className="h-8 w-auto object-contain light:invert"
                    />
                </Link>

                {/* Navigation Links */}
                <nav className="flex flex-col gap-y-1">
                    <NavItem to="/" label={t("nav.home")} icon={<HomeIcon />} />
                    <NavItem
                        to="/explore"
                        label={t("explore.title")}
                        icon={<ExploreIcon />}
                    />
                    <NavItem
                        to="/notifications"
                        label={t("nav.notifications")}
                        icon={<BellIcon />}
                        badge={unreadCount}
                    />
                    <NavItem
                        to="/follows"
                        label={t("nav.follows")}
                        icon={<UsersIcon />}
                    />
                    <NavItem
                        to="/bookmarks"
                        label={t("nav.bookmarks")}
                        icon={<BookmarkIcon />}
                    />
                    {/*
                     * Settings is reached through the hover popup below, and a
                     * hover popup does not exist on a touch screen. On a phone
                     * the profile page carries a gear for that reason; between
                     * the two, every tablet width had no way in at all. The
                     * rail has the room, so it gets the link outright.
                     */}
                    <div className="xl:hidden">
                        <NavItem
                            to="/settings"
                            label={t("nav.settings")}
                            icon={<SettingsIcon />}
                        />
                    </div>
                    <button
                        onClick={handleProfileClick}
                        aria-label={t("nav.profile")}
                        className="flex w-full items-center justify-center gap-x-4 rounded-full py-3 text-left text-ink/80 transition-all hover:bg-ink/10 hover:text-ink group xl:justify-start xl:px-4"
                    >
                        <span className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110">
                            <ProfileIcon />
                        </span>
                        <span className="text-xl hidden xl:block">
                            {t("nav.profile")}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Bottom Section: Profile or Sign In */}
            <div className="mt-auto pt-4 border-t border-ink/5">
                {isAuthenticated && user ? (
                    <div className="group relative">
                        <button
                            onClick={() =>
                                navigate(`/profile/${user.username}`)
                            }
                            // Below `xl` all that shows is the avatar, whose
                            // `alt` is the literal word "Avatar".
                            aria-label={user.fullName || user.username}
                            className="w-full flex items-center justify-center gap-x-3 p-2 rounded-full hover:bg-ink/5 transition-all text-left xl:justify-start xl:p-3"
                        >
                            <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden border border-ink/10 bg-surface-2">
                                {user.avatarUrl ? (
                                    <img
                                        src={user.avatarUrl}
                                        alt="Avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-600 text-on-fill font-bold">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden hidden xl:block">
                                <p className="font-bold text-ink truncate">
                                    {user.fullName || user.username}
                                </p>
                                <p className="text-sm text-ink/40 truncate">
                                    @{user.username}
                                </p>
                            </div>
                            <svg
                                className="hidden w-5 h-5 text-ink/20 group-hover:text-ink/50 xl:block"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                                />
                            </svg>
                        </button>

                        {/* Settings popup on hover. Only where the sidebar is
                            wide enough to read it — the rail carries Settings
                            as an ordinary link instead. */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate("/settings");
                            }}
                            className="absolute -top-12 left-0 hidden w-full bg-surface-1 border border-ink/10 rounded-xl py-3 px-4 text-sm font-bold text-ink opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all hover:bg-surface-2 text-left shadow-xl xl:block"
                        >
                            {t("nav.settings")}
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="primary"
                        size="full"
                        aria-label={t("nav.signIn")}
                        onClick={() => useAuthModalStore.getState().openModal()}
                    >
                        {/* The label does not fit the rail, so the rail shows
                            the icon and keeps the name in `aria-label`. */}
                        <LogIn className="h-5 w-5 xl:hidden" />
                        <span className="hidden xl:inline">
                            {t("nav.signIn")}
                        </span>
                    </Button>
                )}
            </div>

            {/* Footer links. Four of them wrapped onto three ragged lines in
                the rail; they live on every page's footer reach anyway, so the
                rail drops them rather than showing them badly. */}
            <div className="hidden flex-wrap gap-x-6 gap-y-1 px-3 pt-3 pb-1 xl:flex">
                <Link
                    to="/privacy"
                    className="text-[11px] text-ink/25 hover:text-ink/50 transition-colors"
                >
                    {t("auth.privacy")}
                </Link>
                <Link
                    to="/terms"
                    className="text-[11px] text-ink/25 hover:text-ink/50 transition-colors"
                >
                    {t("auth.terms")}
                </Link>
                <Link
                    to="/contact"
                    className="text-[11px] text-ink/25 hover:text-ink/50 transition-colors"
                >
                    {t("nav.contact")}
                </Link>
                <Link
                    to="/socials"
                    className="text-[11px] text-ink/25 hover:text-ink/50 transition-colors"
                >
                    {t("nav.social")}
                </Link>
            </div>
        </aside>
    );
}

/* Helper Components & Icons */

function NavItem({
    to,
    label,
    icon,
    badge,
}: {
    to: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}) {
    return (
        <Link
            to={to}
            // The label is `display: none` below `xl`, and hidden text is left
            // out of the accessible name — so without this the rail is a
            // column of six links a screen reader can only call "link".
            aria-label={label}
            className="flex items-center justify-center gap-x-4 rounded-full py-3 text-ink/80 transition-all hover:bg-ink/10 hover:text-ink group xl:justify-start xl:px-4"
        >
            <span className="relative w-6 h-6 shrink-0 transition-transform group-hover:scale-110">
                {icon}
                {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-blue-500 text-on-fill text-[10px] font-bold leading-none">
                        {badge > 9 ? "9+" : badge}
                    </span>
                )}
            </span>
            <span className="text-xl hidden xl:block">{label}</span>
        </Link>
    );
}

const HomeIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
    </svg>
);
const ExploreIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
        />
    </svg>
);
const BellIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
    </svg>
);
const UsersIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
    </svg>
);
const BookmarkIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
    </svg>
);
const SettingsIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
    </svg>
);
const ProfileIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
    </svg>
);
