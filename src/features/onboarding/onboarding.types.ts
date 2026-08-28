import type { PostCategory } from "../feed/api/feed.types";

/**
 * One suggested account in the onboarding flow.
 *
 * Every entry is a news bot from `GET /profiles/bots`. The type is kept
 * separate from `BotProfile` because the page and the cards care about a
 * follow list, not about what a bot is: `bannerUrl` has no place on a row this
 * size, and if the flow ever mixes people back in, only the mapping changes.
 */
export interface OnboardingAccount {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    bio: string;
    followersCount: number;
    /**
     * The fields the bot posts in — shown on the card so a user who picked two
     * fields can see which one each suggestion answers.
     */
    categories: PostCategory[];
    /**
     * Whether the account already followed this bot when the list was fetched.
     *
     * Load-bearing for a *returning* user: someone who followed three bots and
     * left before finishing must come back to those three already marked, or
     * the flow asks them to follow accounts they have followed once already.
     */
    isFollowing: boolean;
}

/** How many accounts a new user has to follow before the flow lets them out. */
export const MIN_FOLLOWS = 5;
