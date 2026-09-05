import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../../tests/msw-server";

// The modal reaches `apiClient` through `useReport`; `localStorage` is read on
// every call, so the stub has to exist before imports resolve.
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
import { REPORT_DETAILS_MAX_LENGTH } from "../api/report.types";
import { ReportModal } from "./ReportModal";

const BASE = "http://localhost:8080/api/v1";

function captureBody() {
    const seen: Record<string, unknown>[] = [];
    server.use(
        http.post(`${BASE}/reports`, async ({ request }) => {
            seen.push((await request.json()) as Record<string, unknown>);
            return HttpResponse.json({ data: { received: true } });
        }),
    );
    return seen;
}

const onClose = vi.fn();

function renderModal() {
    return render(
        <ReportModal
            isOpen
            onClose={onClose}
            targetKind="POST"
            targetId="post-1"
        />,
    );
}

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "tok");
    useToastStore.setState({ toasts: [] });
    onClose.mockClear();
});

describe("ReportModal", () => {
    it("offers all nine reasons the API understands", () => {
        renderModal();

        expect(screen.getAllByRole("radio")).toHaveLength(9);
    });

    // A reason is required by the schema, so the button is shut until one is
    // picked rather than sending a request the server will refuse.
    it("cannot be sent until a reason is picked", async () => {
        renderModal();

        const submit = screen.getByRole("button", { name: "Send report" });
        expect(submit).toBeDisabled();

        await userEvent.click(screen.getByLabelText("Spam or a scam"));

        expect(submit).toBeEnabled();
    });

    it("sends the reason and the free text, then closes with a toast", async () => {
        const seen = captureBody();
        renderModal();

        await userEvent.click(screen.getByLabelText("Hate speech"));
        await userEvent.type(
            screen.getByLabelText("Anything to add? (optional)"),
            "slurs in the second paragraph",
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Send report" }),
        );

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(seen[0]).toEqual({
            targetKind: "POST",
            targetId: "post-1",
            reason: "HATE",
            details: "slurs in the second paragraph",
        });
        expect(useToastStore.getState().toasts[0].message).toBe(
            "Your report has been received. Thank you.",
        );
    });

    /*
     * The dialog stays open on a failure, holding what was typed. The
     * alternative — closing and toasting — asks somebody who did nothing wrong
     * to pick the reason and write the sentence a second time.
     */
    it("stays open and states the failure", async () => {
        server.use(
            http.post(`${BASE}/reports`, () =>
                HttpResponse.json(
                    {
                        status: 404,
                        title: "NotFoundError",
                        detail: "Content not found.",
                    },
                    { status: 404 },
                ),
            ),
        );
        renderModal();

        await userEvent.click(screen.getByLabelText("Spam or a scam"));
        await userEvent.click(
            screen.getByRole("button", { name: "Send report" }),
        );

        expect(await screen.findByText("Content not found.")).toBeVisible();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Spam or a scam")).toBeChecked();
    });

    // Mirrored from the schema so the API's 400 stays unreachable, the same
    // way the message composer mirrors its character cap.
    it("stops the free text at the length the API accepts", async () => {
        renderModal();

        const details = screen.getByLabelText("Anything to add? (optional)");
        await userEvent.click(details);
        await userEvent.paste("x".repeat(REPORT_DETAILS_MAX_LENGTH + 50));

        expect(details).toHaveValue("x".repeat(REPORT_DETAILS_MAX_LENGTH));
        expect(
            screen.getByText(
                `${REPORT_DETAILS_MAX_LENGTH}/${REPORT_DETAILS_MAX_LENGTH}`,
            ),
        ).toBeInTheDocument();
    });

    it("names what is being reported", () => {
        render(
            <ReportModal
                isOpen
                onClose={onClose}
                targetKind="COMMENT"
                targetId="comment-1"
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Report this comment" }),
        ).toBeInTheDocument();
    });
});
