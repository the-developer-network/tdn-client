import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../tests/msw-server";

// useTranslation → useAuthStore → Zustand persist; stub localStorage first.
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

// Replace franc-min with a controllable mock. Using a factory bypasses ESM
// resolution entirely, so no deps.inline change is needed in vitest.config.ts.
vi.mock("franc-min", () => ({ franc: vi.fn() }));

import { franc } from "franc-min";
import { useAuthModalStore } from "../../features/auth/store/auth-modal.store";
import { useAuthStore } from "../../core/auth/auth.store";
import { useTranslation } from "./useTranslation";

const BASE = "http://localhost:8080/api/v1";

const mockUser = { id: "user-1", username: "testuser", isEmailVerified: true };

// A string long enough to pass the 10-char guard and trigger franc detection
const FOREIGN_TEXT = "Esto es un texto suficientemente largo para probar";

beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    useAuthModalStore.getState().reset();
    // Default: franc detects Spanish → "es" ≠ "en" (jsdom navigator.language)
    vi.mocked(franc).mockReturnValue("spa");
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("useTranslation", () => {
    it("showTranslate is false when content is shorter than 10 characters", () => {
        const { result } = renderHook(() => useTranslation("Hi"));
        expect(result.current.showTranslate).toBe(false);
    });

    it("showTranslate is false when franc detects the same language as the browser", () => {
        // "eng" → ISO 639-1 "en" == navigator.language.split("-")[0] in jsdom
        vi.mocked(franc).mockReturnValue("eng");
        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));
        expect(result.current.showTranslate).toBe(false);
    });

    it("showTranslate is true when franc detects a language different from the browser", () => {
        // Default beforeEach mock: "spa" → "es" ≠ "en"
        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));
        expect(result.current.showTranslate).toBe(true);
    });

    it("opens the auth modal without translating when the user is not authenticated", async () => {
        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));

        await act(async () => {
            await result.current.handleTranslate();
        });

        expect(useAuthModalStore.getState().isOpen).toBe(true);
        expect(result.current.isTranslating).toBe(false);
        expect(result.current.isTranslated).toBe(false);
    });

    it("updates displayContent with translated text on a successful API call", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });

        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));

        await act(async () => {
            await result.current.handleTranslate();
        });

        expect(result.current.isTranslated).toBe(true);
        // Default MSW handler: POST /translate → { data: { translatedText: "Translated content" } }
        expect(result.current.displayContent).toBe("Translated content");
        expect(result.current.isTranslating).toBe(false);
        expect(result.current.translateError).toBeNull();
    });

    it("handleRevert() restores the original content and clears isTranslated", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });

        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));

        await act(async () => {
            await result.current.handleTranslate();
        });
        expect(result.current.isTranslated).toBe(true);

        act(() => {
            result.current.handleRevert();
        });

        expect(result.current.displayContent).toBe(FOREIGN_TEXT);
        expect(result.current.isTranslated).toBe(false);
        expect(result.current.translateError).toBeNull();
    });

    it("sets translateError and clears isTranslating when the API fails", async () => {
        useAuthStore.setState({
            user: mockUser,
            token: "tok",
            isAuthenticated: true,
        });
        server.use(http.post(`${BASE}/translate`, () => HttpResponse.error()));

        const { result } = renderHook(() => useTranslation(FOREIGN_TEXT));

        await act(async () => {
            await result.current.handleTranslate();
        });

        expect(result.current.translateError).toBeTruthy();
        expect(result.current.isTranslated).toBe(false);
        expect(result.current.isTranslating).toBe(false);
    });
});
