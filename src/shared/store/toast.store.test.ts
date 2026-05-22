import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToastStore } from "./toast.store";

beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useToastStore", () => {
    describe("addToast", () => {
        it("adds a toast with a non-empty unique id", () => {
            useToastStore
                .getState()
                .addToast({ type: "success", message: "Saved" });

            const { toasts } = useToastStore.getState();
            expect(toasts).toHaveLength(1);
            expect(toasts[0].message).toBe("Saved");
            expect(toasts[0].type).toBe("success");
            expect(typeof toasts[0].id).toBe("string");
            expect(toasts[0].id.length).toBeGreaterThan(0);
        });

        it("generates distinct ids for separate toasts", () => {
            useToastStore
                .getState()
                .addToast({ type: "success", message: "A" });
            useToastStore.getState().addToast({ type: "error", message: "B" });

            const { toasts } = useToastStore.getState();
            expect(toasts).toHaveLength(2);
            expect(toasts[0].id).not.toBe(toasts[1].id);
        });
    });

    describe("auto-remove after 4 s", () => {
        it("removes the toast when the 4 s timer fires", () => {
            useToastStore
                .getState()
                .addToast({ type: "info", message: "Hello" });
            expect(useToastStore.getState().toasts).toHaveLength(1);

            vi.advanceTimersByTime(4000);

            expect(useToastStore.getState().toasts).toHaveLength(0);
        });

        it("does not remove the toast before 4 s have elapsed", () => {
            useToastStore
                .getState()
                .addToast({ type: "info", message: "Hello" });

            vi.advanceTimersByTime(3999);

            expect(useToastStore.getState().toasts).toHaveLength(1);
        });
    });

    describe("removeToast", () => {
        it("removes only the targeted toast and leaves others intact", () => {
            useToastStore
                .getState()
                .addToast({ type: "success", message: "A" });
            useToastStore.getState().addToast({ type: "error", message: "B" });

            const [first] = useToastStore.getState().toasts;
            useToastStore.getState().removeToast(first.id);

            const { toasts } = useToastStore.getState();
            expect(toasts).toHaveLength(1);
            expect(toasts[0].message).toBe("B");
        });
    });
});
