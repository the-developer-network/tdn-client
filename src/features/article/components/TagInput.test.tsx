import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagInput } from "./TagInput";

const setup = (tags: string[] = []) => {
    const onChange = vi.fn();
    render(<TagInput tags={tags} onChange={onChange} />);
    return { onChange, field: screen.getByLabelText("Tags") };
};

describe("TagInput", () => {
    it("adds a tag on Enter", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup();

        await user.type(field, "fastify{Enter}");

        expect(onChange).toHaveBeenCalledWith(["fastify"]);
    });

    it("adds a tag on comma, so a list can be typed straight through", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup();

        await user.type(field, "prisma,");

        expect(onChange).toHaveBeenCalledWith(["prisma"]);
    });

    it("normalises before adding", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup();

        await user.type(field, "Clean Architecture{Enter}");

        expect(onChange).toHaveBeenCalledWith(["clean-architecture"]);
    });

    // The server answers a bare 400 that never names the field, so a tag that
    // cannot survive normalisation must not be sent at all.
    it("drops input that normalises to nothing", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup();

        await user.type(field, "!!!{Enter}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("refuses a duplicate", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup(["fastify"]);

        await user.type(field, "fastify{Enter}");

        expect(onChange).not.toHaveBeenCalled();
    });

    it("tells the writer what their input will become", async () => {
        const user = userEvent.setup();
        const { field } = setup();

        await user.type(field, "Yazılım Mimarisi");

        expect(
            screen.getByText("Will be added as #yazilim-mimarisi"),
        ).toBeInTheDocument();
    });

    it("removes the last tag on backspace in an empty field", async () => {
        const user = userEvent.setup();
        const { onChange, field } = setup(["a", "b"]);

        await user.type(field, "{Backspace}");

        expect(onChange).toHaveBeenCalledWith(["a"]);
    });

    it("removes a tag from its own button", async () => {
        const user = userEvent.setup();
        const { onChange } = setup(["fastify", "prisma"]);

        await user.click(screen.getByLabelText("Remove tag fastify"));

        expect(onChange).toHaveBeenCalledWith(["prisma"]);
    });

    it("closes the field once five tags are in, which is the server's cap", () => {
        // Rendered directly: `setup` reaches for the field, which is the very
        // thing this asserts is gone.
        render(
            <TagInput tags={["a", "b", "c", "d", "e"]} onChange={vi.fn()} />,
        );

        expect(screen.queryByLabelText("Tags")).not.toBeInTheDocument();
        expect(
            screen.getByText("That is the limit of 5 tags."),
        ).toBeInTheDocument();
    });
});
