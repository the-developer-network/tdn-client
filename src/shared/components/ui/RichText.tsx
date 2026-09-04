import { Link, useNavigate } from "react-router-dom";
import {
    MENTION_PATTERN_SOURCE,
    findMention,
    isHandleLength,
    trimHandle,
} from "../../utils/mentions";
import type { Mention } from "../../utils/mentions";

interface RichTextProps {
    text: string;
    className?: string;
    onTagClick?: (tag: string) => void;
    /**
     * The accounts the API resolved out of this body.
     *
     * Taken rather than derived, and that is the whole design: the API returns
     * the body unchanged and says separately which handles name a real
     * account. A handle with no entry here stays plain text — a typo, a
     * deleted account and one renamed since are all unresolvable and all read
     * the same way, which is the only version that never links a name to a
     * stranger's profile.
     *
     * Absent where the API does not resolve mentions at all: a quoted post
     * card (`QuotedPostSchema` carries no `mentions`) and a direct message.
     */
    mentions?: Mention[];
}

/**
 * Named groups rather than positional ones: four alternatives with their own
 * captures make the numbering a liability, and the mention branch has two of
 * its own.
 *
 * The mention branch is `MENTION_PATTERN_SOURCE` verbatim — it already names
 * its own groups, so this composes it rather than rewriting it. Editing the
 * grammar in two places is how the client stops agreeing with the server, and
 * that disagreement shows up as a link which quietly never appears.
 *
 * Its `pre` group exists because the grammar has to reject an `@` glued to a
 * preceding word, path or `@`, and it consumes that character instead of
 * looking behind for it — see `mentions.ts` for why. It is put back as text.
 */
const richTextPattern = () =>
    new RegExp(
        `(?<url>https?:\\/\\/[^\\s<>"']+)` +
            `|\\*\\*(?<bold>.+?)\\*\\*` +
            `|#(?<tag>\\w+)` +
            `|${MENTION_PATTERN_SOURCE}`,
        "g",
    );

function parseRichText(
    text: string,
    onTagClick: (tag: string) => void,
    mentions?: Mention[],
): (string | React.ReactNode)[] {
    const parts: (string | React.ReactNode)[] = [];
    const regex = richTextPattern();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const g = match.groups!;
        const full = match[0];

        if (g.bold !== undefined) {
            parts.push(
                <strong key={match.index} className="font-bold">
                    {g.bold}
                </strong>,
            );
        } else if (g.url !== undefined) {
            parts.push(
                <a
                    key={match.index}
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {g.url}
                </a>,
            );
        } else if (g.tag !== undefined) {
            parts.push(
                <span
                    key={match.index}
                    className="text-blue-400 font-medium cursor-pointer hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTagClick(g.tag!);
                    }}
                >
                    #{g.tag}
                </span>,
            );
        } else {
            // The character before the `@` belongs to the surrounding text.
            if (g.pre) parts.push(g.pre);

            const written = g.handle!;
            const handle = trimHandle(written);
            const mention = isHandleLength(handle)
                ? findMention(handle, mentions)
                : undefined;

            if (mention) {
                /*
                 * The text stays as the author typed it and the link points at
                 * the account's current handle. Those differ after a rename,
                 * and showing the new name would silently rewrite what someone
                 * wrote; sending the reader to the old one would 404.
                 */
                parts.push(
                    <Link
                        key={match.index}
                        to={`/profile/${mention.username}`}
                        className="text-blue-400 font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        @{handle}
                    </Link>,
                );
                // A trailing dot the sentence put there, not the author.
                if (handle.length < written.length) {
                    parts.push(written.slice(handle.length));
                }
            } else {
                parts.push(`@${written}`);
            }
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export function RichText({
    text,
    className,
    onTagClick,
    mentions,
}: RichTextProps) {
    const navigate = useNavigate();
    const handleTagClick =
        onTagClick ?? ((tag: string) => navigate(`/explore?tag=${tag}`));
    return (
        <p className={className}>
            {parseRichText(text, handleTagClick, mentions)}
        </p>
    );
}
