import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackSection from "./components/FeedbackSection";
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
    const [feedback, setFeedback] = React.useState<Record<string, string[]>>({
        "Serious Problems": [],
        "Warnings": [],
        "Refactoring Suggestions": [],
        "Coding Conventions": [],
        "Performance Optimization": [],
        "Security Issues": [],
        "Best Practices": [],
        "Readability and Maintainability": [],
        "Code Smells": [],
        "Educational Tips": []
    });

    // Listen for messages from the VSCode extension
    React.useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            console.log("Received message from extension:", message);
            
            if (message.command === "displayFileInfo") {
                setFilename(message.filename);
                processAIResponse(message.response);
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
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    // Parse AI response and update state
    const processAIResponse = (response: string) => {
        console.log("Processing AI response:", response);
        if (!response) return;

        try {
            // Parse response as JSON
            const parsedData = JSON.parse(response);

            // Ensure we maintain the expected format
            const updatedFeedback: Record<string, string[]> = {
                "Serious Problems": parsedData["Serious Problems"] || [],
                "Warnings": parsedData["Warnings"] || [],
                "Refactoring Suggestions": parsedData["Refactoring Suggestions"] || [],
                "Coding Conventions": parsedData["Coding Conventions"] || [],
                "Performance Optimization": parsedData["Performance Optimization"] || [],
                "Security Issues": parsedData["Security Issues"] || [],
                "Best Practices": parsedData["Best Practices"] || [],
                "Readability and Maintainability": parsedData["Readability and Maintainability"] || [],
                "Code Smells": parsedData["Code Smells"] || [],
                "Educational Tips": parsedData["Educational Tips"] || []
            };

            setFeedback(updatedFeedback);
        } catch (error) {
            console.error("Error parsing AI response:", error);
            vscode.postMessage({
                command: "error",
                message: "Failed to parse AI response. Please check the response format."
            });
        }
    };

    return (
        <div className="webview-container">
            <Header />

            <div className="info">
                <strong>Currently Analyzing:</strong> <span>{filename}</span>
            </div>

            {selectedItem ? (
                <FeedbackDetail 
                    category={selectedItem.category || ''} 
                    content={selectedItem.content || ''} 
                    type={selectedItem.type || 'info'} 
                />
            ) : (
                <div className="empty-state">
                    <p>Select an item from the Feedback panel to view details</p>
                    <button onClick={sendRequest} className="get-feedback-btn">
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
