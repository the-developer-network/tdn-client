import { api } from "../../../core/api/client";
import type { CreateReportBody, CreateReportResponse } from "./report.types";

export const reportApi = {
    /**
     * Files one report. Authenticated, rate limited to 5/min.
     *
     * There is no read side and no status endpoint, on purpose: serving the
     * queue would publish what an account has been accused of. An operator
     * reads it from the database and closes it by hand.
     */
    create: (body: CreateReportBody): Promise<CreateReportResponse> =>
        api.post<CreateReportResponse>("/reports", body),
};
