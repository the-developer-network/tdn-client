import { Fragment } from "react";
import { PostCard } from "./PostCard";
import { AdPlaceholderCard } from "./AdPlaceholderCard";
import type { Post } from "../api/feed.types";

const AD_INTERVAL = 5;

interface PostListProps {
    posts: Post[];
    isLoading: boolean;
    error: string | null;
    onPostDeleted?: (postId: string) => void;
}

export function PostList({
    posts,
    isLoading,
    error,
    onPostDeleted,
}: PostListProps) {
    if (isLoading) {
        return (
            <div className="flex justify-center p-10">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center text-red-400/60 text-sm">
                {error}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="p-10 text-center text-white/30 italic text-sm">
                Caterogy Empty
            </div>
        );
    }

    const showAds = posts.length > AD_INTERVAL;

    return (
        <div className="flex flex-col">
            {posts.map((post, index) => (
                <Fragment key={post.id}>
                    <PostCard {...post} onDeleted={onPostDeleted} />
                    {showAds && (index + 1) % AD_INTERVAL === 0 && (
                        <AdPlaceholderCard />
                    )}
                </Fragment>
            ))}
        </div>
    );
}
