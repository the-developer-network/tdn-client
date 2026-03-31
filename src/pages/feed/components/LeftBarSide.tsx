import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.png";

interface LeftBarSideProps {
  isLoggedIn: boolean;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  onOpenAuth?: () => void;
}

export function LeftBarSide({
  isLoggedIn,
  fullName,
  username,
  avatarUrl,
  onOpenAuth,
}: LeftBarSideProps) {
  const navigate = useNavigate();

  return (
    <aside className="fixed w-[275px] h-screen flex flex-col justify-between py-6 px-4 border-r border-white/10 bg-black">
      {/* Top Section: Logo & Nav */}
      <div className="flex flex-col gap-y-6">
        <Link to="/" className="px-3 mb-2">
          <img src={logo} alt="TDN" className="h-8 w-auto object-contain" />
        </Link>

        <nav className="flex flex-col gap-y-2">
          <NavItem to="/" label="Home" icon={<HomeIcon />} />
          <NavItem to="/explore" label="Explore" icon={<ExploreIcon />} />
          <NavItem to="/notifications" label="Notifications" icon={<BellIcon />} />
          <NavItem to="/follows" label="Follows" icon={<UsersIcon />} />
          <NavItem to="/bookmarks" label="Bookmarks" icon={<BookmarkIcon />} />
          <NavItem 
            to={isLoggedIn ? `/profile/${username}` : "/home"} 
            label="Profile" 
            icon={<ProfileIcon />} 
          />
        </nav>
      </div>

      {/* Bottom Section: Auth State */}
      <div className="mt-auto pt-4 border-t border-white/5">
        {isLoggedIn ? (
          <button
            onClick={() => navigate(`/profile/${username}`)}
            className="w-full flex items-center gap-x-3 p-3 rounded-full hover:bg-white/5 transition-all group text-left"
          >
            <img
              src={avatarUrl || `https://ui-avatars.com/api/?name=${username}&background=random`}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover border border-white/10"
            />
            <div className="flex-1 overflow-hidden">
              <p className="font-bold text-white truncate">{fullName}</p>
              <p className="text-sm text-white/40 truncate">@{username}</p>
            </div>
            <svg className="w-5 h-5 text-white/20 group-hover:text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
          >
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-x-4 px-4 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium"
    >
      <span className="w-6 h-6">{icon}</span>
      <span className="text-lg">{label}</span>
    </Link>
  );
}

const HomeIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ExploreIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>;
const BellIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const UsersIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const BookmarkIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>;
const ProfileIcon = () => <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;