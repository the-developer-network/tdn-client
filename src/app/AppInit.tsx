import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useNotificationSocket } from "../features/notifications/hooks/useNotificationSocket";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";

export function AppInit() {
    useNotificationSocket();

    useEffect(() => {
        registerSessionExpiredHandler(() => {
            useAuthStore.getState().clearAuth();
            useAuthModalStore.getState().openModal("identifier");
        });
    }, []);

    return <RouterProvider router={router} />;
}
