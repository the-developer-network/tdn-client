interface RichTextProps {
    text: string;
    className?: string;
}

function parseRichText(text: string): (string | React.ReactNode)[] {
    const parts: (string | React.ReactNode)[] = [];
    const regex = /#(\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(
            <span key={match.index} className="text-blue-400 font-medium">
                #{match[1]}
            </span>,
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
}

export function RichText({ text, className }: RichTextProps) {
    return <p className={className}>{parseRichText(text)}</p>;
}
