import { render, screen } from "@testing-library/react";
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

    // The server reads magic bytes, not the extension, and SVG is refused
    // outright — so a wrong type is worth catching before the writer publishes.
    it("refuses a type the endpoint does not accept", async () => {
        const user = userEvent.setup();
        const { input, onFileChange } = renderPicker();

        await user.upload(input, image("x.svg", "image/svg+xml"));

        expect(onFileChange).not.toHaveBeenCalled();
        expect(useToastStore.getState().toasts).toHaveLength(1);
    });

    it("previews a chosen file and offers the alt field", () => {
        renderPicker({ file: image() });

        expect(screen.getByRole("img")).toHaveAttribute("src", "blob:preview");
        expect(screen.getByLabelText("Cover description")).toBeInTheDocument();
    });

    it("shows a cover the article already has", () => {
        renderPicker({ existingUrl: "https://example.com/cover.png" });

        expect(screen.getByRole("img")).toHaveAttribute(
            "src",
            "https://example.com/cover.png",
        );
    });

    it("drops an existing cover URL whose protocol is not trusted", () => {
        renderPicker({ existingUrl: "javascript:alert(1)" });

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
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
