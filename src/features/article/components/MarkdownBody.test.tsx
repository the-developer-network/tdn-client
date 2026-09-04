import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

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

    // `max-w-full` alone leaves a tall image free to run past the viewport,
    // so one portrait screenshot fills the screen and pushes the paragraph it
    // belongs to out of sight.
    it("bounds a body image on both axes", () => {
        const { container } = render(
            <MarkdownBody body={"![a diagram](https://example.com/a.png)"} />,
        );

        const image = container.querySelector("img")!;
        expect(image.className).toMatch(/max-w-full/);
        expect(image.className).toMatch(/max-h-/);
    });

    it("keeps the author's illustration whole rather than cropping it", () => {
        const { container } = render(
            <MarkdownBody body={"![a diagram](https://example.com/a.png)"} />,
        );

        // Cropping a diagram loses part of what it was drawn to show, so the
        // image scales down entire rather than being covered to a box.
        expect(container.querySelector("img")!.className).not.toContain(
            "object-cover",
        );
    });

    it("renders an empty body without crashing", () => {
        const { container } = render(<MarkdownBody body="" />);

        expect(container.firstChild).toBeInTheDocument();
    });

    /*
     * An article body is markdown, so this runs as a remark plugin over the
     * tree rather than as a pass over rendered text: after rendering, an
     * `@handle` in a code span looks exactly like one in a sentence, and the
     * tree already knows which is which.
     *
     * Only the mention cases need a router — a mention link is internal and
     * renders through `Link`, while everything above stays a plain anchor.
     */
    describe("mentions", () => {
        const ada = { id: "u1", username: "ada" };

        const renderBody = (body: string, mentions?: (typeof ada)[]) =>
            render(
                <MemoryRouter>
                    <MarkdownBody body={body} mentions={mentions} />
                </MemoryRouter>,
            );

        it("links a resolved handle to the profile", () => {
            renderBody("Thanks @ada for the review.", [ada]);

            expect(screen.getByRole("link", { name: "@ada" })).toHaveAttribute(
                "href",
                "/profile/ada",
            );
        });

        // Internal, so it stays in the app rather than opening a new tab with
        // `nofollow` the way an author's own link does.
        it("keeps a mention link inside the app", () => {
            renderBody("Thanks @ada.", [ada]);

            const link = screen.getByRole("link", { name: "@ada" });
            expect(link).not.toHaveAttribute("target");
            expect(link).not.toHaveAttribute("rel");
        });

        it("leaves a handle nobody owns as text", () => {
            renderBody("Thanks @nobody.", [ada]);

            expect(screen.queryByRole("link")).toBeNull();
            expect(screen.getByText(/@nobody/)).toBeInTheDocument();
        });

        it("does nothing without a resolved list", () => {
            renderBody("Thanks @ada.", []);

            expect(screen.queryByRole("link")).toBeNull();
        });

        /*
         * An `@` in a snippet belongs to the snippet — a decorator, an npm
         * scope, an email in an example. Linking it would edit someone's code.
         */
        it("does not touch inline code", () => {
            renderBody("Use `@ada` as the flag.", [ada]);

            expect(screen.queryByRole("link")).toBeNull();
        });

        it("does not touch a fenced block", () => {
            const fenced = ["```", "const x = @ada;", "```"].join("\n");
            renderBody(fenced, [ada]);

            expect(screen.queryByRole("link")).toBeNull();
        });

        // A link inside a link is invalid HTML and renders unpredictably.
        it("does not rewrite the label of an existing link", () => {
            renderBody("[ask @ada](https://example.com)", [ada]);

            const links = screen.getAllByRole("link");
            expect(links).toHaveLength(1);
            expect(links[0]).toHaveAttribute("href", "https://example.com");
        });

        it("links several and keeps the prose between them", () => {
            const { container } = renderBody("@ada and @bob shipped it.", [
                ada,
                { id: "u2", username: "bob" },
            ]);

            expect(screen.getByRole("link", { name: "@ada" })).toBeVisible();
            expect(screen.getByRole("link", { name: "@bob" })).toBeVisible();
            expect(container.textContent).toContain("and");
            expect(container.textContent).toContain("shipped it.");
        });

        /*
         * Two guards at once. `remark-gfm` autolinks a bare email, so by the
         * time this plugin runs `ada@example.com` is already a `link` node and
         * is skipped as opaque — and the grammar would refuse the glued `@`
         * anyway. What matters is that no profile link comes out of it.
         */
        it("does not turn an email address into a mention", () => {
            renderBody("Write to ada@example.com instead.", [ada]);

            const links = screen.queryAllByRole("link");
            expect(
                links.some((l) =>
                    l.getAttribute("href")?.startsWith("/profile/"),
                ),
            ).toBe(false);
        });
    });
});
