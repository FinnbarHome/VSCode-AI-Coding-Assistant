import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackSection from "./components/FeedbackSection";
import "./styles/global.css"; 

// Acquire VSCode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

const VSCodeWebview: React.FC = () => {
    const [filename, setFilename] = React.useState<string>("None");
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

        const parsedFeedback: Record<string, string[]> = {
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
        };

        let currentCategory: string | null = null;

        response.split(/\n(?=#### )/).forEach(section => {
            const titleMatch = section.match(/#### (.+)/);
            const title = titleMatch ? titleMatch[1].trim() : null;

            if (title && parsedFeedback.hasOwnProperty(title)) {
                currentCategory = title;
            }

            if (currentCategory) {
                let content = section.replace(/#### .*/, "").trim();
                parsedFeedback[currentCategory] = content.split("\n").filter(item => item.trim().length > 0);
            }
        });

        setFeedback(parsedFeedback);
    };

    return (
        <div className="webview-container">
            <Header />

            <button onClick={sendRequest} className="get-feedback-btn">
                Get Feedback
            </button>

            <div className="info">
                <strong>Currently Targeting:</strong> <span>{filename}</span>
            </div>

            <div id="response">
                {Object.keys(feedback).map(category => (
                    <FeedbackSection key={category} title={category} content={feedback[category]} />
                ))}
            </div>
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
