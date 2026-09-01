import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useI18n` reads the persisted language store, which captures storage as it
// evaluates.
vi.hoisted(() => {
    const _map = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => _map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            _map.set(key, String(value));
        },
        removeItem: (key: string) => {
            _map.delete(key);
        },
        clear: () => {
            _map.clear();
        },
        get length() {
            return _map.size;
        },
        key: (i: number) => [..._map.keys()][i] ?? null,
    });
});

import { useLanguageStore } from "../../store/language.store";
import { SensitiveMedia } from "./SensitiveMedia";

beforeEach(() => {
    useLanguageStore.setState({ locale: "en" });
});

const child = <img src="https://cdn.example.com/a.png" alt="the photo" />;

describe("SensitiveMedia", () => {
    it("renders the media untouched when nothing was flagged", () => {
        render(<SensitiveMedia isSensitive={false}>{child}</SensitiveMedia>);

        expect(screen.getByAltText("the photo")).toBeInTheDocument();
        expect(screen.queryByText("Sensitive content")).not.toBeInTheDocument();
    });

    it("covers flagged media and offers to uncover it", async () => {
        const { container } = render(
            <SensitiveMedia isSensitive>{child}</SensitiveMedia>,
        );

        expect(screen.getByText("Sensitive content")).toBeInTheDocument();
        expect(container.querySelector(".blur-2xl")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button"));

        expect(screen.queryByText("Sensitive content")).not.toBeInTheDocument();
        expect(container.querySelector(".blur-2xl")).not.toBeInTheDocument();
        expect(screen.getByAltText("the photo")).toBeInTheDocument();
    });

    /*
     * The cards this sits inside navigate on click. Without stopping the
     * event, uncovering a photo would open the post instead — and the photo
     * would then be uncovered on a page the reader did not ask to be on.
     */
    it("does not let the uncover click reach the card underneath", async () => {
        const onCardClick = vi.fn();
        render(
            <div onClick={onCardClick}>
                <SensitiveMedia isSensitive>{child}</SensitiveMedia>
            </div>,
        );

        await userEvent.click(screen.getByRole("button"));

        expect(onCardClick).not.toHaveBeenCalled();
    });

    it("keeps the blurred copy out of the accessibility tree", () => {
        render(<SensitiveMedia isSensitive>{child}</SensitiveMedia>);

        /*
         * Asserted by role rather than by alt text, which is the only query
         * that reads the accessibility tree — `*ByAltText` walks the DOM and
         * finds the image whether or not it is `aria-hidden`. What matters is
         * that a screen reader is offered one control and not a photo with a
         * button beside it.
         */
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByRole("button")).toHaveTextContent(
            "Sensitive content",
        );
    });
});
