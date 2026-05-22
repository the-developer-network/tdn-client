import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthModalStore } from "./auth-modal.store";

beforeEach(() => {
    vi.useFakeTimers();
    useAuthModalStore.getState().reset();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("useAuthModalStore", () => {
    describe("openModal", () => {
        it("sets isOpen to true and applies the given step", () => {
            useAuthModalStore.getState().openModal("login");

            const state = useAuthModalStore.getState();
            expect(state.isOpen).toBe(true);
            expect(state.step).toBe("login");
        });

        it("defaults step to 'initial' when called with no argument", () => {
            useAuthModalStore.getState().openModal();

            expect(useAuthModalStore.getState().step).toBe("initial");
        });
    });

    describe("closeModal", () => {
        it("sets isOpen to false immediately (synchronous)", () => {
            useAuthModalStore.getState().openModal("login");
            useAuthModalStore.getState().closeModal();

            expect(useAuthModalStore.getState().isOpen).toBe(false);
            // step has not reset yet — timer hasn't fired
            expect(useAuthModalStore.getState().step).toBe("login");
        });

        it("resets step to 'initial' after 300 ms", () => {
            useAuthModalStore.getState().openModal("register");
            useAuthModalStore.getState().closeModal();

            vi.advanceTimersByTime(300);

            expect(useAuthModalStore.getState().step).toBe("initial");
            expect(useAuthModalStore.getState().identifier).toBe("");
        });
    });

    describe("openModal during the 300 ms reset window", () => {
        it("cancels the pending reset and preserves the new step", () => {
            useAuthModalStore.getState().openModal("login");
            useAuthModalStore.getState().closeModal();

            // re-open before the 300 ms window expires
            vi.advanceTimersByTime(150);
            useAuthModalStore.getState().openModal("register");

            // advance past the original deadline — reset must NOT fire
            vi.advanceTimersByTime(300);

            const state = useAuthModalStore.getState();
            expect(state.isOpen).toBe(true);
            expect(state.step).toBe("register");
        });
    });
});
