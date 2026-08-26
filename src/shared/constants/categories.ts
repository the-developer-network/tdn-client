import { Gamepad2, Monitor, Server, Smartphone, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PostCategory } from "../../features/feed/api/feed.types";
import type { TranslationKey } from "../i18n/translations";

export interface CategoryOption {
    labelKey: TranslationKey;
    value: PostCategory;
    Icon: LucideIcon;
}

/**
 * The five fields the API knows about. `PostCategory` is the whole taxonomy
 * the system has — it tags posts and articles, and onboarding borrows it to
 * ask a new account what it is here for.
 *
 * Shared rather than declared per page: the feed's filter chips and the
 * onboarding picker must offer the same five, in the same order, or a field
 * chosen at sign-up would have no chip to match it later.
 */
export const CATEGORY_OPTIONS: CategoryOption[] = [
    { labelKey: "feed.frontend", value: "FRONTEND", Icon: Monitor },
    { labelKey: "feed.backend", value: "BACKEND", Icon: Server },
    { labelKey: "feed.mobile", value: "MOBILE", Icon: Smartphone },
    { labelKey: "feed.game", value: "GAME", Icon: Gamepad2 },
    { labelKey: "feed.ai", value: "AI", Icon: Sparkles },
];
