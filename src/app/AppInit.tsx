import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useNotificationSocket } from "../features/notifications/hooks/useNotificationSocket";

export function AppInit() {
    useNotificationSocket();
    return <RouterProvider router={router} />;
}
