import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useNotificationSocket } from "../features/notifications/hooks/useNotificationSocket";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { ToastContainer } from "../shared/components/ui/ToastContainer";
import { OfflineBanner } from "../shared/components/ui/OfflineBanner";

export function AppInit() {
    useNotificationSocket();

    useEffect(() => {
        registerSessionExpiredHandler(() => {
            useAuthStore.getState().clearAuth();
            useAuthModalStore.getState().openModal("identifier");
        });
    }, []);

    return (
        <>
            <OfflineBanner />
            <ToastContainer />
            <RouterProvider router={router} />
        </>
    );
}
