import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader } from "lucide-react";
import { useProfileSearch } from "../hooks/useProfileSearch";

export function ProfileSearchDropdown() {
    const navigate = useNavigate();
    const { query, setQuery, results, isLoading, clear } = useProfileSearch();
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const showDropdown = isFocused && query.length >= 2;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleSelect(username: string) {
        clear();
        setIsFocused(false);
        navigate(`/profile/${username}`);
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                {isLoading && query.length >= 2 ? (
                    <Loader
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin"
                    />
                ) : (
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />
                )}
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Search profiles..."
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/30 focus:bg-white/8 transition-colors"
                />
            </div>

            {showDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                    {isLoading && results.length === 0 && (
                        <div className="px-4 py-3 text-sm text-white/40">
                            Searching...
                        </div>
                    )}
                    {!isLoading && results.length === 0 && (
                        <div className="px-4 py-3 text-sm text-white/40">
                            No profiles found.
                        </div>
                    )}
                    {results.map((profile) => (
                        <button
                            key={profile.id ?? profile.username}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(profile.username)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                        >
                            <img
                                src={
                                    profile.avatarUrl ||
                                    `https://ui-avatars.com/api/?name=${profile.username}&size=40`
                                }
                                alt={profile.username}
                                className="w-9 h-9 rounded-full object-cover bg-zinc-800 shrink-0"
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate leading-tight">
                                    {profile.fullName || profile.username}
                                </p>
                                <p className="text-xs text-white/40 truncate">
                                    @{profile.username}
                                </p>
                            </div>
                            <div className="ml-auto text-xs text-white/30 shrink-0">
                                {profile.followersCount.toLocaleString()}{" "}
                                followers
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
