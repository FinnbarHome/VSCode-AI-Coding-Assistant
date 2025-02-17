import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackSection from "./components/FeedbackSection";

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

    React.useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === "displayFileInfo") {
                setFilename(message.filename);
                processAIResponse(message.response);
            }
        };

        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    const sendRequest = () => {
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    const processAIResponse = (response: string) => {
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
        <React.StrictMode>
            <div style={{ padding: "10px", textAlign: "center", background: "#1e1e1e", color: "#ffffff" }}>
                <Header />

                <button onClick={sendRequest} style={{
                    backgroundColor: "#007acc",
                    color: "white",
                    padding: "12px 18px",
                    borderRadius: "6px",
                    fontSize: "16px",
                    marginBottom: "25px", 
                    boxShadow: "0px 2px 5px rgba(0, 122, 204, 0.4)" 
                }}>
                    Get Feedback
                </button>

                <div className="info" style={{
                    marginBottom: "20px", 
                    fontSize: "14px",
                    color: "#bbbbbb"
                }}>
                    <strong>Currently Targeting:</strong> <span>{filename}</span>
                </div>

                <div id="response" className="info">
                    {Object.keys(feedback).map(category => (
                        <FeedbackSection key={category} title={category} content={feedback[category]} />
                    ))}
                </div>
            </div>
        </React.StrictMode>
    );
};

const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<VSCodeWebview />);
}
