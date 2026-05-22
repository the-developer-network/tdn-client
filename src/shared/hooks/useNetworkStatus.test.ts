import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useNetworkStatus } from "./useNetworkStatus";

// No localStorage stub needed — this hook has no API calls or Zustand stores.
// Each renderHook creates a fresh React component; navigator.onLine starts as
// true in jsdom and event listeners are cleaned up on unmount.

describe("useNetworkStatus", () => {
    it("returns true initially (navigator.onLine defaults to true in jsdom)", () => {
        const { result } = renderHook(() => useNetworkStatus());
        expect(result.current).toBe(true);
    });

    it("returns false when an offline event is dispatched", () => {
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            window.dispatchEvent(new Event("offline"));
        });

        expect(result.current).toBe(false);
    });

    it("returns true when an online event follows an offline event", () => {
        const { result } = renderHook(() => useNetworkStatus());

        act(() => {
            window.dispatchEvent(new Event("offline"));
        });
        act(() => {
            window.dispatchEvent(new Event("online"));
        });

        expect(result.current).toBe(true);
    });
});
