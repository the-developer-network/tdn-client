import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useRealtimeSocket } from "../core/realtime/useRealtimeSocket";
import { useInitialUnreadCount } from "../features/notifications/hooks/useInitialUnreadCount";
import { useInitialUnreadMessages } from "../features/messages/hooks/useInitialUnreadMessages";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import { useAuthModalStore } from "../features/auth/store/auth-modal.store";
import { useTheme } from "../shared/hooks/useTheme";
import { ToastContainer } from "../shared/components/ui/ToastContainer";
import { OfflineBanner } from "../shared/components/ui/OfflineBanner";

export function AppInit() {
    useTheme();
    // One connection, carrying notifications and direct messages both — the
    // API is explicit that a client should not open a second.
    useRealtimeSocket();
    useInitialUnreadCount();
    useInitialUnreadMessages();

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
