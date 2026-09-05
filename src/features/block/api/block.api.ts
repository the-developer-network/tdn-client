import { api } from "../../../core/api/client";
import type { BlockActionResponse, BlockedUser } from "./block.types";

export interface BlockedListParams {
    limit?: number;
    offset?: number;
}

/**
 * `GET /blocks` takes the same pagination shape as the follow lists — `limit`
 * default 20, min 1, max 50 — and answers an out-of-range value with a 400,
 * so it is clamped here rather than sent and rendered as an error.
 */
export const BLOCKED_LIST_MAX_LIMIT = 50;

function blockedListQuery({
    limit = 20,
    offset = 0,
}: BlockedListParams): string {
    const query = new URLSearchParams();
    query.set(
        "limit",
        String(Math.min(Math.max(limit, 1), BLOCKED_LIST_MAX_LIMIT)),
    );
    query.set("offset", String(offset));
    return query.toString();
}

export const blockApi = {
    /**
     * Idempotent: blocking an account already blocked answers the same way.
     * The server also tears down the follow in both directions, in the same
     * transaction — so a caller holding a follow state has to drop it rather
     * than wait for a second request to fail.
     */
    block: (targetId: string): Promise<BlockActionResponse> =>
        api.post<BlockActionResponse>("/blocks", { targetId }),

    /**
     * Idempotent the same way, and it only lifts *your* row: if the other
     * account blocked you independently that block stands, which is why the
     * caller re-reads the profile rather than assuming both flags cleared.
     *
     * `DELETE` carries a body here, which `fetch` sends but does not type — so
     * the header goes with it, exactly as `profileApi.unfollow` does.
     */
    unblock: (targetId: string): Promise<BlockActionResponse> =>
        api.delete<BlockActionResponse>("/blocks", {
            body: JSON.stringify({ targetId }),
            headers: { "Content-Type": "application/json" },
        }),

    /**
     * The accounts you have blocked, newest first.
     *
     * This is the **only** way back to a block: the account is invisible
     * everywhere else, so without this list there is no route to an unblock
     * button. There is deliberately no "who blocked me" endpoint.
     */
    getBlocked: (params: BlockedListParams = {}): Promise<BlockedUser[]> =>
        api.get<BlockedUser[]>(`/blocks?${blockedListQuery(params)}`),
};
