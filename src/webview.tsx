import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackDetail from "./components/FeedbackDetail";
import "./styles/global.css"; 

// Acquire VSCode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

const VSCodeWebview: React.FC = () => {
    const [filename, setFilename] = React.useState<string>("None");
    const [selectedItem, setSelectedItem] = React.useState<{
        category?: string;
        content?: string;
        type?: 'error' | 'warning' | 'info';
    } | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    // Listen for messages from the VSCode extension
    React.useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            console.log("Received message from extension:", message);
            
            if (message.command === "displayFileInfo") {
                setFilename(message.filename);
                setIsLoading(false);
            } else if (message.command === "showItemDetails") {
                setSelectedItem({
                    category: message.category,
                    content: message.content,
                    type: message.type
                });
            }
        };

        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    // Request AI analysis from VSCode extension
    const sendRequest = () => {
        console.log("Sending request to VSCode extension");
        setIsLoading(true);
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    return (
        <div className="vscode-webview">
            <div className="vscode-info-bar">
                <span className="info-label">File:</span>
                <span className="info-value">{filename}</span>
            </div>

            {isLoading ? (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Analyzing your code...</p>
                </div>
            ) : selectedItem ? (
                <FeedbackDetail 
                    category={selectedItem.category || ''} 
                    content={selectedItem.content || ''} 
                    type={selectedItem.type || 'info'} 
                />
            ) : (
                <div className="empty-state">
                    <p>Select an item from the Feedback panel to view details</p>
                    <button className="vscode-button" onClick={sendRequest}>
                        Analyze Current File
                    </button>
                </div>
            )}
        </div>
    );
};

// Mount the React app to the DOM
const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<VSCodeWebview />);
} else {
    console.error("❌ React root element not found!");
}
