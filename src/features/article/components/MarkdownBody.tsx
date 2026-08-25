import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownBodyProps {
    body: string;
}

/**
 * Renders an article body, which the API stores and returns as raw markdown —
 * unescaped and unsanitised, by design, so the stored text is never mangled.
 *
 * Sanitisation is therefore this component's job, and it is done by omission:
 * `skipHtml` drops embedded HTML instead of rendering it, and `rehype-raw` is
 * deliberately absent. Adding it — or swapping this for
 * `dangerouslySetInnerHTML` — opens stored XSS on a site where anyone can
 * publish an article.
 *
 * Element styling is supplied per tag because the project has no typography
 * plugin; unstyled markdown renders as run-together browser defaults against
 * the dark theme.
 */
export function MarkdownBody({ body }: MarkdownBodyProps) {
    return (
        <div className="px-6 py-8 text-[18px] leading-[1.75] text-white/80">
            <Markdown
                skipHtml
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="mt-10 mb-4 text-[28px] font-bold leading-snug tracking-tight text-white first:mt-0">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="mt-9 mb-3 text-[24px] font-bold leading-snug tracking-tight text-white first:mt-0">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="mt-8 mb-2 text-[20px] font-semibold leading-snug text-white first:mt-0">
                            {children}
                        </h3>
                    ),
                    p: ({ children }) => (
                        <p className="my-6 first:mt-0">{children}</p>
                    ),
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-blue-400 hover:underline break-words"
                        >
                            {children}
                        </a>
                    ),
                    ul: ({ children }) => (
                        <ul className="my-6 list-disc pl-6 space-y-2">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-6 list-decimal pl-6 space-y-2">
                            {children}
                        </ol>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="my-6 border-l-[3px] border-white/25 pl-5 text-[19px] italic text-white/60">
                            {children}
                        </blockquote>
                    ),
                    // `pre` already provides the scrolling block, so an inline
                    // `code` is the only one that needs its own chip styling.
                    code: ({ className, children }) =>
                        className ? (
                            <code className={className}>{children}</code>
                        ) : (
                            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-pink-300">
                                {children}
                            </code>
                        ),
                    pre: ({ children }) => (
                        <pre className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-zinc-900 p-4 font-mono text-[13px] leading-6 text-white/80">
                            {children}
                        </pre>
                    ),
                    img: ({ src, alt }) => (
                        <img
                            src={typeof src === "string" ? src : undefined}
                            alt={alt ?? ""}
                            loading="lazy"
                            className="my-4 max-w-full rounded-xl border border-white/10"
                        />
                    ),
                    hr: () => <hr className="my-8 border-white/10" />,
                    table: ({ children }) => (
                        <div className="my-4 overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold text-white">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-white/10 px-3 py-2">
                            {children}
                        </td>
                    ),
                }}
            >
                {body}
            </Markdown>
        </div>
    );
}
