import {
    createMentionPattern,
    findMention,
    isHandleLength,
    trimHandle,
} from "../../../shared/utils/mentions";
import type { Mention } from "../../../shared/utils/mentions";

/**
 * The slice of mdast this needs. Typed locally rather than pulled from
 * `@types/mdast`, which is not a dependency and would be one more package for
 * four fields.
 */
interface MdNode {
    type: string;
    value?: string;
    url?: string;
    children?: MdNode[];
}

/**
 * Where a handle is text but not a mention.
 *
 * `code` and `inlineCode` because an `@` in a snippet is part of the snippet —
 * a decorator, an npm scope, an email in an example. `link` and `image`
 * because their children are a label for something else, and turning half of
 * one into a second link produces a link inside a link, which is invalid HTML
 * and renders unpredictably.
 */
const OPAQUE = new Set([
    "code",
    "inlineCode",
    "link",
    "linkReference",
    "image",
    "imageReference",
    "definition",
]);

function splitTextNode(node: MdNode, mentions: Mention[]): MdNode[] {
    const value = node.value ?? "";
    const out: MdNode[] = [];
    let last = 0;

    for (const match of value.matchAll(createMentionPattern())) {
        const pre = match.groups?.pre ?? "";
        const written = match.groups?.handle ?? "";
        const handle = trimHandle(written);
        const mention = isHandleLength(handle)
            ? findMention(handle, mentions)
            : undefined;
        if (!mention) continue;

        const at = match.index + pre.length;
        if (at > last) out.push({ type: "text", value: value.slice(last, at) });

        out.push({
            type: "link",
            url: `/profile/${mention.username}`,
            children: [{ type: "text", value: `@${handle}` }],
        });

        // A trailing dot the sentence put there, not the author.
        last = at + 1 + handle.length;
    }

    if (out.length === 0) return [node];
    if (last < value.length) {
        out.push({ type: "text", value: value.slice(last) });
    }
    return out;
}

function walk(node: MdNode, mentions: Mention[]): void {
    if (!node.children) return;

    const next: MdNode[] = [];
    for (const child of node.children) {
        if (child.type === "text") {
            next.push(...splitTextNode(child, mentions));
            continue;
        }
        if (!OPAQUE.has(child.type)) walk(child, mentions);
        next.push(child);
    }
    node.children = next;
}

/**
 * Turns a resolved `@handle` in an article body into a link to the profile.
 *
 * A remark plugin rather than a pass over the rendered output, because the
 * body is markdown: matching text after rendering would have to be told apart
 * from a URL, a code span and a link label, and the tree already knows which
 * is which.
 *
 * Only handles present in `mentions` become links, on the same reasoning as
 * `RichText` — a typo, a deleted account and one renamed since are all
 * unmatchable and all stay text.
 */
export function remarkMentions(mentions: Mention[] | undefined) {
    return () => (tree: MdNode) => {
        if (!mentions?.length) return;
        walk(tree, mentions);
    };
}
