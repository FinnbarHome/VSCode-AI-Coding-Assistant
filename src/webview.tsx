import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackDetail from "./components/FeedbackDetail";
import "./styles/global.css"; 

// Feedback item type
interface FeedbackItemType {
    category: string;
    content: string;
    type: 'error' | 'warning' | 'info';
}

// Acquire VSCode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

const VSCodeWebview: React.FC = () => {
    const [filename, setFilename] = React.useState<string>("None");
    const [selectedItem, setSelectedItem] = React.useState<FeedbackItemType | null>(null);
    const [categoryItems, setCategoryItems] = React.useState<FeedbackItemType[]>([]);
    const [allItems, setAllItems] = React.useState<FeedbackItemType[]>([]);
    const [viewMode, setViewMode] = React.useState<'single' | 'category' | 'all'>('all');
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = React.useState<string>("Analyzing your code...");
    const [reportPath, setReportPath] = React.useState<string | null>(null);

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
                setCategoryItems([]);
                setViewMode('single');
            } else if (message.command === "showCategoryItems") {
                setCategoryItems(message.items);
                setSelectedItem(null);
                setViewMode('category');
            } else if (message.command === "showAllFeedbackItems") {
                setAllItems(message.items);
                setSelectedItem(null);
                setCategoryItems([]);
                setViewMode('all');
                setFilename(message.filename);
            } else if (message.command === "setLoading") {
                setIsLoading(message.isLoading);
                if (message.message) {
                    setLoadingMessage(message.message);
                }
            } else if (message.command === "reportGenerated") {
                setReportPath(message.filePath);
            }
        };

        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    // Request AI analysis from VSCode extension
    const sendRequest = () => {
        console.log("Sending request to VSCode extension");
        setIsLoading(true);
        setLoadingMessage("Analyzing your code...");
        setViewMode('all');
        setSelectedItem(null);
        setCategoryItems([]);
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    // Request detailed PDF report generation
    const generateReport = () => {
        console.log("Requesting detailed report generation");
        setIsLoading(true);
        setLoadingMessage("Generating comprehensive report with GPT-4o... This may take a moment.");
        vscode.postMessage({ command: "generatePDFReport" });
    };

    // Render content based on view mode
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>{loadingMessage}</p>
                </div>
            );
        }

        if (viewMode === 'single' && selectedItem) {
            return (
                <FeedbackDetail 
                    category={selectedItem.category} 
                    content={selectedItem.content} 
                    type={selectedItem.type} 
                />
            );
        }

        if (viewMode === 'category' && categoryItems.length > 0) {
            return (
                <div className="feedback-items-container">
                    <h3 className="category-title">{categoryItems[0].category}</h3>
                    {categoryItems.map((item, index) => (
                        <FeedbackDetail 
                            key={index}
                            category={item.category} 
                            content={item.content} 
                            type={item.type} 
                            showHeader={false}
                        />
                    ))}
                </div>
            );
        }

        if (viewMode === 'all' && allItems.length > 0) {
            // Group items by category
            const groupedItems: Record<string, FeedbackItemType[]> = {};
            
            allItems.forEach(item => {
                if (!groupedItems[item.category]) {
                    groupedItems[item.category] = [];
                }
                groupedItems[item.category].push(item);
            });

            // Sort categories in a specific order
            const categoryOrder = [
                "Serious Problems",
                "Warnings",
                "Refactoring Suggestions",
                "Coding Conventions",
                "Performance Optimization",
                "Security Issues",
                "Best Practices",
                "Readability and Maintainability",
                "Code Smells",
                "Educational Tips"
            ];
            
            const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
                const indexA = categoryOrder.indexOf(a);
                const indexB = categoryOrder.indexOf(b);
                return indexA - indexB;
            });

            return (
                <div className="feedback-items-container">
                    <div className="action-bar">
                        <button className="vscode-button report-button" onClick={generateReport}>
                            Generate Comprehensive Report
                        </button>
                    </div>
                    {sortedCategories.map(category => (
                        <div key={category} className="category-section">
                            <h3 className="category-title">{category}</h3>
                            {groupedItems[category].map((item, index) => (
                                <FeedbackDetail 
                                    key={`${category}-${index}`}
                                    category={item.category} 
                                    content={item.content} 
                                    type={item.type} 
                                    showHeader={false}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="empty-state">
                <p>Select an item from the Feedback panel to view details</p>
                <div className="empty-state-buttons">
                    <button className="vscode-button" onClick={sendRequest}>
                        Analyze Current File
                    </button>
                    <button className="vscode-button report-button" onClick={generateReport}>
                        Generate Comprehensive Report
                    </button>
                </div>
                {reportPath && (
                    <p className="report-info">
                        A detailed report has been generated and opened in a new tab.
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="vscode-webview">
            <div className="vscode-info-bar">
                <span className="info-label">File:</span>
                <span className="info-value">{filename}</span>
            </div>

            <div className="vscode-content-container">
                {renderContent()}
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
