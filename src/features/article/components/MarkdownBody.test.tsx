import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownBody } from "./MarkdownBody";

describe("MarkdownBody", () => {
    it("renders headings, emphasis and lists as real elements", () => {
        const { container } = render(
            <MarkdownBody
                body={"# Title\n\nSome **bold** text.\n\n- one\n- two"}
            />,
        );

        expect(
            screen.getByRole("heading", { level: 1, name: "Title" }),
        ).toBeInTheDocument();
        expect(container.querySelector("strong")).toHaveTextContent("bold");
        expect(container.querySelectorAll("li")).toHaveLength(2);
    });

    it("renders fenced code as a scrollable block", () => {
        const { container } = render(
            <MarkdownBody body={"```ts\nconst a = 1;\n```"} />,
        );

        const pre = container.querySelector("pre");
        expect(pre).toBeInTheDocument();
        expect(pre).toHaveClass("overflow-x-auto");
        expect(pre).toHaveTextContent("const a = 1;");
    });

    it("renders GFM tables, which need the remark plugin", () => {
        const { container } = render(
            <MarkdownBody body={"| a | b |\n| - | - |\n| 1 | 2 |"} />,
        );

        expect(container.querySelector("table")).toBeInTheDocument();
        expect(container.querySelectorAll("th")).toHaveLength(2);
    });

    // The API stores article bodies as raw, unsanitised markdown, so anything
    // that reaches the DOM as markup here is stored XSS on a site where anyone
    // can publish. These three are the shapes that would carry it.
    describe("sanitisation", () => {
        it("does not execute embedded script tags", () => {
            const { container } = render(
                <MarkdownBody
                    body={"Hello\n\n<script>window.pwned = true</script>"}
                />,
            );

            expect(container.querySelector("script")).toBeNull();
        });

        it("does not render raw HTML with event handlers", () => {
            const { container } = render(
                <MarkdownBody body={'<img src="x" onerror="alert(1)">'} />,
            );

            expect(container.querySelector("img[onerror]")).toBeNull();
        });

        it("neutralises a javascript: link", () => {
            const { container } = render(
                <MarkdownBody body={"[click](javascript:alert(1))"} />,
            );

            const anchor = container.querySelector("a");
            expect(anchor?.getAttribute("href") ?? "").not.toContain(
                "javascript:",
            );
        });
    });

    it("opens outbound links in a new tab without leaking the opener", () => {
        const { container } = render(
            <MarkdownBody body={"[tdn](https://example.com)"} />,
        );

        const anchor = container.querySelector("a");
        expect(anchor).toHaveAttribute("target", "_blank");
        expect(anchor?.getAttribute("rel")).toContain("noopener");
    });

    it("renders an empty body without crashing", () => {
        const { container } = render(<MarkdownBody body="" />);

        expect(container.firstChild).toBeInTheDocument();
    });
});
