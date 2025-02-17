import * as React from "react";
import { useEffect, useState } from "react";
import * as ReactDOM from "react-dom/client";

// Acquire VSCode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

const VSCodeWebview: React.FC = () => {
    const [filename, setFilename] = useState<string>("None");
    const [response, setResponse] = useState<string | null>(null);

    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === "displayFileInfo") {
                setFilename(message.filename);
                setResponse(message.response);
            }
        };

        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    const sendRequest = () => {
        setResponse("⏳ Analyzing your code... Please wait.");
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    return (
        <div style={{ padding: "10px", textAlign: "center", background: "#1e1e1e", color: "#ffffff" }}>
            <h1 style={{ color: "#007acc" }}>AI Coding Assistant</h1>
            <p>Click the button to get feedback on your open file.</p>

            <button
                onClick={sendRequest}
                style={{
                    backgroundColor: "#007acc",
                    color: "white",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    fontSize: "16px"
                }}>
                Get Feedback
            </button>

            <div className="info">
                <strong>Currently Targeting:</strong> <span>{filename}</span>
            </div>

            <div id="response" className="info">
                {response ? <pre>{response}</pre> : null}
            </div>
        </div>
    );
};

// Render React into WebView
const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<VSCodeWebview />);
}
