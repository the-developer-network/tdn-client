import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { AppInit } from "./AppInit";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HelmetProvider>
            <AppInit />
        </HelmetProvider>
    </React.StrictMode>,
);
