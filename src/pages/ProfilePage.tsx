import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, LinkIcon, Settings } from "lucide-react";
import { PageShell } from "../shared/layout/PageShell";
import { TrendingTopicsWidget } from "../shared/components/TrendingTopicsWidget";
import { PostList } from "../features/feed/components/PostList";
import { FollowListModal } from "../features/profile/components/FollowListModal";
import { EditProfileModal } from "../features/profile/components/EditProfileModal";
import { useProfile } from "../features/profile/hooks/useProfile";
import { useUserPosts } from "../features/profile/hooks/useUserPosts";
import { useFollowAction } from "../features/profile/hooks/useFollowAction";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import type { Profile } from "../features/profile/api/profile.types";

export default function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();

    const [followModal, setFollowModal] = useState<
        "followers" | "following" | null
    >(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);

    const updateUser = useAuthStore((state) => state.updateUser);
    const openModal = useAuthModalStore((state) => state.openModal);

    const {
        profile,
        isLoading: profileLoading,
        error: profileError,
    } = useProfile(username ?? "");

    useEffect(() => {
        if (
            profileError &&
            /token|expired|session|unauthorized/i.test(profileError)
        ) {
            openModal();
        }
    }, [profileError, openModal]);

    const {
        isFollowing,
        followersCount,
        isLoading: followLoading,
        handleFollow,
    } = useFollowAction(
        profile?.id ?? profile?.userId ?? "",
        profile?.isFollowing ?? false,
        profile?.followersCount ?? 0,
    );

    // Sync auth store when viewing own profile so sidebar avatar stays fresh
    useEffect(() => {
        if (profile?.isMe) {
            updateUser({
                avatarUrl: profile.avatarUrl,
                fullName: profile.fullName,
            });
        }
    }, [profile, updateUser]);
    const {
        posts,
        isLoading: postsLoading,
        isLoadingMore,
        error: postsError,
        hasMore,
        loadMore,
        removePost,
    } = useUserPosts(username ?? "");

    const displayProfile = useMemo(
        () => localProfile ?? profile,
        [localProfile, profile],
    );

    if (!username) {
        navigate("/", { replace: true });
        return null;
    }

    return (
        <PageShell rightRail={<TrendingTopicsWidget />}>
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        {profileLoading ? (
                            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <h1 className="text-base font-bold text-white leading-tight">
                                {displayProfile?.fullName || username}
                            </h1>
                        )}
                        <p className="text-xs text-white/40">
                            {posts.length > 0
                                ? `${posts.length} posts`
                                : "\u00a0"}
                        </p>
                    </div>
                    {displayProfile?.isMe && (
                        <button
                            onClick={() => navigate("/settings")}
                            className="sm:hidden p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                            aria-label="Settings"
                        >
                            <Settings size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Profile error */}
            {profileError &&
                !profileLoading &&
                !/token|expired|session|unauthorized/i.test(profileError) && (
                    <div className="p-10 text-center text-red-400/60 text-sm">
                        {profileError}
                    </div>
                )}

            {/* Profile skeleton */}
            {profileLoading && (
                <div className="animate-pulse">
                    <div className="h-24 sm:h-32 md:h-40 bg-zinc-900" />
                    <div className="px-4 pb-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-800 border-4 border-black -mt-10 mb-3" />
                        <div className="h-5 w-40 bg-zinc-800 rounded mb-2" />
                        <div className="h-4 w-24 bg-zinc-800 rounded mb-3" />
                        <div className="h-4 w-64 bg-zinc-800 rounded" />
                    </div>
                </div>
            )}

            {/* Profile content */}
            {!profileLoading && displayProfile && (
                <>
                    {/* Banner */}
                    <div className="relative h-24 sm:h-32 md:h-40 bg-zinc-900 overflow-hidden">
                        {displayProfile.bannerUrl && (
                            <img
                                src={displayProfile.bannerUrl}
                                alt="Banner"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </div>

                    {/* Avatar + actions row — relative z-10 ensures it renders above the positioned banner */}
                    <div className="relative z-10 px-4 flex items-end justify-between -mt-10 mb-3">
                        <img
                            src={
                                displayProfile.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${displayProfile.username}&size=80`
                            }
                            alt={displayProfile.username}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-black object-cover shrink-0 bg-zinc-900"
                        />

                        {displayProfile.isMe ? (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="mt-8 sm:mt-12 rounded-full border border-white/20 px-5 py-1.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                            >
                                Edit Profile
                            </button>
                        ) : (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`mt-8 sm:mt-12 rounded-full border px-5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                                    isFollowing
                                        ? "border-white/20 text-white/70 bg-transparent hover:border-red-500/50 hover:text-red-400"
                                        : "border-white bg-white text-black hover:bg-white/90"
                                }`}
                            >
                                {followLoading
                                    ? "..."
                                    : isFollowing
                                      ? "Following"
                                      : "Follow"}
                            </button>
                        )}
                    </div>

                    {/* Bio section */}
                    <div className="px-4 pb-4 border-b border-white/10">
                        <h2 className="text-xl font-bold text-white leading-tight">
                            {displayProfile.fullName || displayProfile.username}
                        </h2>
                        <p className="text-sm text-white/50 mt-0.5">
                            @{displayProfile.username}
                        </p>

                        {displayProfile.bio && (
                            <p className="mt-3 text-sm text-white/80 leading-relaxed">
                                {displayProfile.bio}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/40">
                            {displayProfile.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {displayProfile.location}
                                </span>
                            )}
                            {displayProfile.createdAt && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    Joined{" "}
                                    {new Date(
                                        displayProfile.createdAt,
                                    ).toLocaleDateString("en-US", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </span>
                            )}
                            {displayProfile.socials &&
                                Object.entries(displayProfile.socials)
                                    .filter(([, v]) => v)
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                        <a
                                            key={key}
                                            href={value}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 text-blue-400 hover:underline"
                                        >
                                            <LinkIcon size={12} />
                                            {key}
                                        </a>
                                    ))}
                        </div>

                        {/* Followers / Following counts */}
                        <div className="mt-4 flex gap-5 text-sm">
                            <button
                                onClick={() => setFollowModal("following")}
                                className="hover:underline text-left"
                            >
                                <span className="font-bold text-white">
                                    {(
                                        displayProfile.followingCount ?? 0
                                    ).toLocaleString()}
                                </span>{" "}
                                <span className="text-white/40">Following</span>
                            </button>
                            <button
                                onClick={() => setFollowModal("followers")}
                                className="hover:underline text-left"
                            >
                                <span className="font-bold text-white">
                                    {followersCount.toLocaleString()}
                                </span>{" "}
                                <span className="text-white/40">Followers</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Posts list */}
            <PostList
                posts={posts}
                isLoading={postsLoading && posts.length === 0}
                error={postsError}
                onPostDeleted={removePost}
            />

            {/* Load more */}
            {hasMore && !isLoadingMore && posts.length > 0 && (
                <div className="flex justify-center py-6">
                    <button
                        onClick={loadMore}
                        className="rounded-full border border-white/20 px-6 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        Load more
                    </button>
                </div>
            )}

            {isLoadingMore && (
                <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Followers / Following modal */}
            <FollowListModal
                isOpen={followModal !== null}
                onClose={() => setFollowModal(null)}
                username={username}
                type={followModal ?? "followers"}
            />

            {/* Edit Profile modal */}
            {displayProfile?.isMe && displayProfile && (
                <EditProfileModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    profile={displayProfile}
                    username={username}
                    onSuccess={(updated) => {
                        setLocalProfile(updated);
                        updateUser({
                            fullName: updated.fullName,
                            avatarUrl: updated.avatarUrl,
                        });
                    }}
                    onAvatarUpdate={(avatarUrl) => {
                        setLocalProfile((prev) =>
                            prev ? { ...prev, avatarUrl } : null,
                        );
                        updateUser({ avatarUrl });
                    }}
                    onBannerUpdate={(bannerUrl) => {
                        setLocalProfile((prev) =>
                            prev ? { ...prev, bannerUrl } : null,
                        );
                    }}
                />
            )}
        </PageShell>
    );
}
