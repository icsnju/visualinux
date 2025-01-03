import React from "react";
import ReactDOM from "react-dom/client";

import { GlobalStateProvider } from "@app/context/Context";
import Main from "@app/Main";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    // <React.StrictMode>
        <GlobalStateProvider>
            <Main/>
        </GlobalStateProvider>
    // </React.StrictMode>
);

window.onload = async () => {
    if (process.env.VISUALIZER_DEBUG === 'true') {
        try {
            const response = await fetch('/vcmd-debug', {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Failed to trigger debug script');
            }
        } catch (error) {
            console.error('Error triggering debug script:', error);
        }
    }
}
