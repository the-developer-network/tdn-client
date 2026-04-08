import { useNavigate } from "react-router-dom";

interface RichTextProps {
    text: string;
    className?: string;
    onTagClick?: (tag: string) => void;
}

function parseRichText(
    text: string,
    onTagClick?: (tag: string) => void,
): (string | React.ReactNode)[] {
    const parts: (string | React.ReactNode)[] = [];
    const regex = /(https?:\/\/[^\s<>"']+|\*\*(.+?)\*\*|#(\w+))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const full = match[0];

        if (full.startsWith("**")) {
            parts.push(
                <strong key={match.index} className="font-bold">
                    {match[2]}
                </strong>,
            );
        } else if (full.startsWith("http")) {
            parts.push(
                <a
                    key={match.index}
                    href={full}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {full}
                </a>,
            );
        } else {
            const tag = match[3];
            parts.push(
                <span
                    key={match.index}
                    className="text-blue-400 font-medium cursor-pointer hover:underline"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTagClick?.(tag);
                    }}
                >
                    #{tag}
                </span>,
            );
        }

        lastIndex = match.index + full.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export function RichText({ text, className, onTagClick }: RichTextProps) {
    const navigate = useNavigate();
    const handleTagClick =
        onTagClick ?? ((tag: string) => navigate(`/explore?tag=${tag}`));
    return <p className={className}>{parseRichText(text, handleTagClick)}</p>;
}
