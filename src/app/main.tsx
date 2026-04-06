import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import { AppInit } from "./AppInit";
import "./index.css";

registerSessionExpiredHandler(() => useAuthStore.getState().clearAuth());

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HelmetProvider>
            <AppInit />
        </HelmetProvider>
    </React.StrictMode>,
);
