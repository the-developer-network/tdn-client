import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { useToastStore } from "../../../shared/store/toast.store";
import { CoverPicker } from "./CoverPicker";

const props = {
    existingUrl: null as string | null,
    file: null as File | null,
    alt: "",
    onFileChange: vi.fn(),
    onAltChange: vi.fn(),
    onRemoveExisting: vi.fn(),
};

const renderPicker = (overrides: Partial<typeof props> = {}) => {
    const merged = { ...props, ...overrides };
    const view = render(<CoverPicker {...merged} />);
    return {
        ...view,
        ...merged,
        input: view.container.querySelector(
            'input[type="file"]',
        ) as HTMLInputElement,
    };
};

const image = (name = "cover.png", type = "image/png", size = 10) => {
    const file = new File(["x".repeat(size)], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
};

beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState(useToastStore.getInitialState());
    // jsdom has no object URLs, and the picker revokes what it creates.
    Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: vi.fn(),
    });
});

describe("CoverPicker", () => {
    // A cover is optional and most articles do without one, so the empty state
    // has to read as a choice rather than as something left undone.
    it("says a cover is optional when there is none", () => {
        renderPicker();

        expect(
            screen.getByRole("button", { name: /add a cover image/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                "Optional. Articles read perfectly well without one.",
            ),
        ).toBeInTheDocument();
    });

    it("hands a chosen file up rather than uploading it", async () => {
        const user = userEvent.setup();
        const { input, onFileChange } = renderPicker();

        await user.upload(input, image());

        // Upload is rate limited to five a minute, so it belongs at save
        // time, not at pick time.
        expect(onFileChange).toHaveBeenCalledOnce();
        expect(onFileChange.mock.calls[0][0]).toBeInstanceOf(File);
    });

    it("refuses a file over the 5 MB the endpoint accepts", async () => {
        const user = userEvent.setup();
        const { input, onFileChange } = renderPicker();

        await user.upload(
            input,
            image("big.png", "image/png", 6 * 1024 * 1024),
        );

        expect(onFileChange).not.toHaveBeenCalled();
        expect(useToastStore.getState().toasts[0]).toMatchObject({
            type: "error",
        });
    });

    // The server reads magic bytes, not the extension, and refuses SVG
    // outright — worth catching before the writer reaches publish.
    it("refuses a type the endpoint does not accept", () => {
        const { input, onFileChange } = renderPicker();

        // Driven with a raw change event rather than `userEvent.upload`:
        // userEvent filters the file against the input's `accept` attribute
        // and drops it before the handler runs, even with `applyAccept: false`
        // — which would leave this asserting userEvent's behaviour instead of
        // the component's. A real file dialog can be talked past; this is what
        // that looks like from the component's side.
        fireEvent.change(input, {
            target: { files: [image("x.svg", "image/svg+xml")] },
        });

        expect(onFileChange).not.toHaveBeenCalled();
        expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    // The preview carries alt="" because the writer describes the image in
    // the field beneath it — which makes its ARIA role `presentation`, not
    // `img`, so these query the element rather than the role.
    it("previews a chosen file and offers the alt field", () => {
        const { container } = renderPicker({ file: image() });

        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            "blob:preview",
        );
        expect(screen.getByLabelText("Cover description")).toBeInTheDocument();
    });

    it("shows a cover the article already has", () => {
        const { container } = renderPicker({
            existingUrl: "https://example.com/cover.png",
        });

        expect(container.querySelector("img")).toHaveAttribute(
            "src",
            "https://example.com/cover.png",
        );
    });

    it("drops an existing cover URL whose protocol is not trusted", () => {
        const { container } = renderPicker({
            existingUrl: "javascript:alert(1)",
        });

        expect(container.querySelector("img")).toBeNull();
        // Falls back to the empty state rather than rendering nothing at all.
        expect(
            screen.getByRole("button", { name: /add a cover image/i }),
        ).toBeInTheDocument();
    });

    // Clearing a chosen file and clearing a saved cover are different: one
    // never reached the server, the other has to be erased with an explicit
    // null on the next save.
    it("clears a chosen file without touching the saved cover", async () => {
        const user = userEvent.setup();
        const { onFileChange, onRemoveExisting } = renderPicker({
            file: image(),
        });

        await user.click(screen.getByLabelText("Remove cover image"));

        expect(onFileChange).toHaveBeenCalledWith(null);
        expect(onRemoveExisting).not.toHaveBeenCalled();
    });

    it("asks for the saved cover to be erased when there is no pending file", async () => {
        const user = userEvent.setup();
        const { onRemoveExisting, onFileChange } = renderPicker({
            existingUrl: "https://example.com/cover.png",
        });

        await user.click(screen.getByLabelText("Remove cover image"));

        expect(onRemoveExisting).toHaveBeenCalledOnce();
        expect(onFileChange).not.toHaveBeenCalled();
    });
});
