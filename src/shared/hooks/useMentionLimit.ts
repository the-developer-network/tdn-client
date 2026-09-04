import { useMemo } from "react";
import { MAX_MENTIONS, extractHandles } from "../utils/mentions";

/**
 * How many accounts the body being written names, and whether that is more
 * than the API will accept.
 *
 * The server counts the handles **written**, before it looks any of them up,
 * and answers `400 MentionLimitExceededError` past ten. Mirroring the count
 * here is what keeps that error unreachable in ordinary use — the same reason
 * the message composer mirrors the 4000-character cap rather than letting the
 * server explain it after the fact.
 *
 * Memoised because it runs a regex over the whole body, and a composer re-runs
 * it on every keystroke.
 */
export function useMentionLimit(content: string) {
    return useMemo(() => {
        const count = extractHandles(content).length;
        return { count, isOverLimit: count > MAX_MENTIONS, max: MAX_MENTIONS };
    }, [content]);
}
