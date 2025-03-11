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
            }
        };

        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);

    // Request AI analysis from VSCode extension
    const sendRequest = () => {
        console.log("Sending request to VSCode extension");
        setIsLoading(true);
        setViewMode('all');
        setSelectedItem(null);
        setCategoryItems([]);
        vscode.postMessage({ command: "getAIAnalysis" });
    };

    // Render content based on view mode
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Analyzing your code...</p>
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

            return (
                <div className="feedback-items-container">
                    {Object.keys(groupedItems).map(category => (
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
                <button className="vscode-button" onClick={sendRequest}>
                    Analyze Current File
                </button>
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
