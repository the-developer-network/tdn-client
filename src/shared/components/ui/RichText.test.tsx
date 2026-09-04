import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import "@testing-library/jest-dom";
import { RichText } from "./RichText";
import type { Mention } from "../../utils/mentions";

const ada: Mention = { id: "u1", username: "ada" };

function renderText(text: string, mentions?: Mention[]) {
    return render(
        <MemoryRouter>
            <RichText text={text} mentions={mentions} />
        </MemoryRouter>,
    );
}

describe("RichText", () => {
    describe("what it already did", () => {
        it("links a url", () => {
            renderText("see https://example.com/x now");

            expect(
                screen.getByRole("link", { name: "https://example.com/x" }),
            ).toHaveAttribute("href", "https://example.com/x");
        });

        it("bolds **text**", () => {
            const { container } = renderText("a **strong** word");

            expect(container.querySelector("strong")).toHaveTextContent(
                "strong",
            );
        });

        it("renders a #tag", () => {
            renderText("about #typescript today");

            expect(screen.getByText("#typescript")).toBeInTheDocument();
        });
    });

    /*
     * The API returns the body unchanged and says separately which handles
     * name a real account, so pairing the two is this component's job. A
     * handle with no entry stays text — the only version that never sends a
     * reader to a stranger's profile.
     */
    describe("mentions", () => {
        it("links a handle the API resolved", () => {
            renderText("good point @ada", [ada]);

            expect(screen.getByRole("link", { name: "@ada" })).toHaveAttribute(
                "href",
                "/profile/ada",
            );
        });

        it("leaves a handle nobody owns as plain text", () => {
            renderText("good point @nobody", [ada]);

            expect(screen.queryByRole("link")).toBeNull();
            expect(screen.getByText(/@nobody/)).toBeInTheDocument();
        });

        it("leaves every handle as text when the list is absent", () => {
            renderText("good point @ada");

            expect(screen.queryByRole("link")).toBeNull();
        });

        it("matches ignoring case, because @Ada names ada", () => {
            renderText("hi @Ada", [ada]);

            // The text stays as it was typed; only the target is normalised.
            expect(screen.getByRole("link", { name: "@Ada" })).toHaveAttribute(
                "href",
                "/profile/ada",
            );
        });

        /*
         * After a rename the body still says the old handle while `mentions`
         * carries the new one, and nothing ties them together. Linking the
         * typed text to the current profile is the half that is knowable; the
         * text itself is left alone rather than silently rewritten.
         */
        it("leaves a renamed account as text rather than guessing", () => {
            renderText("hi @ada", [{ id: "u1", username: "ada.renamed" }]);

            // "ada" does not match "ada.renamed", so it stays text.
            expect(screen.queryByRole("link")).toBeNull();
        });

        it("keeps a trailing dot out of the link", () => {
            const { container } = renderText("thanks @ada.", [ada]);

            expect(screen.getByRole("link", { name: "@ada" })).toHaveAttribute(
                "href",
                "/profile/ada",
            );
            expect(container.textContent).toBe("thanks @ada.");
        });

        it("does not fire on an email address", () => {
            renderText("write to ada@example.com", [ada]);

            expect(screen.queryByRole("link")).toBeNull();
        });

        it("does not fire on a path", () => {
            renderText("see docs/@ada", [ada]);

            expect(screen.queryByRole("link")).toBeNull();
        });

        it("keeps the character before the handle", () => {
            const { container } = renderText("(@ada)", [ada]);

            expect(screen.getByRole("link", { name: "@ada" })).toBeVisible();
            expect(container.textContent).toBe("(@ada)");
        });

        it("links a handle at the very start of a body", () => {
            renderText("@ada opened it", [ada]);

            expect(screen.getByRole("link", { name: "@ada" })).toBeVisible();
        });

        it("links several, and mixes with tags and urls", () => {
            renderText("@ada and @bob on #ts https://x.dev", [
                ada,
                { id: "u2", username: "bob" },
            ]);

            expect(screen.getByRole("link", { name: "@ada" })).toBeVisible();
            expect(screen.getByRole("link", { name: "@bob" })).toBeVisible();
            expect(screen.getByText("#ts")).toBeInTheDocument();
            expect(
                screen.getByRole("link", { name: "https://x.dev" }),
            ).toBeVisible();
        });

        it("does not lose any of the body", () => {
            const text = "hey @ada, see #ts and https://x.dev — thanks!";
            const { container } = renderText(text, [ada]);

            expect(container.textContent).toBe(text);
        });
    });
});
