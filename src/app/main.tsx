import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { registerSessionExpiredHandler } from "../core/api/client";
import { useAuthStore } from "../core/auth/auth.store";
import "./index.css";

registerSessionExpiredHandler(() => useAuthStore.getState().clearAuth());

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>,
);
