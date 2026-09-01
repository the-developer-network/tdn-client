import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useNotificationSocket } from "../features/notifications/hooks/useNotificationSocket";
import { useInitialUnreadCount } from "../features/notifications/hooks/useInitialUnreadCount";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useTheme } from "../shared/hooks/useTheme";
import { ToastContainer } from "../shared/components/ui/ToastContainer";
import { OfflineBanner } from "../shared/components/ui/OfflineBanner";

export function AppInit() {
    useTheme();
    useNotificationSocket();
    useInitialUnreadCount();

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
