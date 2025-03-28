import * as React from "react";
import * as ReactDOM from "react-dom/client";
import Header from "./components/Header";
import FeedbackDetail from "./components/FeedbackDetail";
import "./styles/global.css"; 

// Types
interface FeedbackItemType {
    category: string;
    content: string;
    type: 'error' | 'warning' | 'info';
}

interface MessageHandlerProps {
    setFilename: React.Dispatch<React.SetStateAction<string>>;
    setSelectedItem: React.Dispatch<React.SetStateAction<FeedbackItemType | null>>;
    setCategoryItems: React.Dispatch<React.SetStateAction<FeedbackItemType[]>>;
    setAllItems: React.Dispatch<React.SetStateAction<FeedbackItemType[]>>;
    setViewMode: React.Dispatch<React.SetStateAction<'single' | 'category' | 'all'>>;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
    setReportProgress: React.Dispatch<React.SetStateAction<ReportProgressState | null>>;
}

interface ReportProgressState {
    state: 'loading' | 'error' | 'success' | 'idle';
    title?: string;
    message?: string;
}

// Acquire VSCode API
declare const acquireVsCodeApi: () => any;
const vscode = acquireVsCodeApi();

// Component for loading state
const LoadingState: React.FC<{ message: string }> = ({ message }) => {
    return (
        <div className="loading">
            <div className="loading-spinner"></div>
            <p>{message}</p>
        </div>
    );
};

// Component for report progress
const ReportProgressState: React.FC<{ progress: ReportProgressState }> = ({ progress }) => {
    const { state, title, message } = progress;
    
    console.log("Rendering progress state:", state, title, message);
    
    let icon;
    if (state === 'loading') {
        icon = <div className="loading-spinner"></div>;
    } else if (state === 'error') {
        icon = <div className="error-icon">❌</div>;
    } else if (state === 'success') {
        icon = <div className="success-icon">✅</div>;
    }
    
    return (
        <div className={`report-progress ${state}`}>
            {icon}
            <div className="progress-content">
                <h3>{title || 'Processing'}</h3>
                <p>{message || 'Please wait...'}</p>
            </div>
        </div>
    );
};

// Component for empty state
const EmptyState: React.FC<{ onAnalyzeClick: () => void, onReportClick: () => void }> = ({
    onAnalyzeClick,
    onReportClick
}) => {
    return (
        <div className="empty-state">
            <p>Select an item from the Feedback panel to view details</p>
            <div className="empty-state-buttons">
                <button className="vscode-button" onClick={onAnalyzeClick}>
                    Analyze Current File
                </button>
                <button className="vscode-button report-button" onClick={onReportClick}>
                    Generate Comprehensive Report
                </button>
            </div>
        </div>
    );
};

// Component for all feedback items
const AllFeedbackItems: React.FC<{ 
    items: FeedbackItemType[],
    onReportClick: () => void
}> = ({ items, onReportClick }) => {
    // Group items by category
    const groupedItems: Record<string, FeedbackItemType[]> = {};
    
    items.forEach(item => {
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
                <button className="vscode-button report-button" onClick={onReportClick}>
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
};

// Component for category items
const CategoryFeedbackItems: React.FC<{ items: FeedbackItemType[] }> = ({ items }) => {
    if (items.length === 0) return null;
    
    return (
        <div className="feedback-items-container">
            <h3 className="category-title">{items[0].category}</h3>
            {items.map((item, index) => (
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
};

// Set up message handler for VSCode extension communication
function setupMessageHandler(props: MessageHandlerProps) {
    const {
        setFilename,
        setSelectedItem,
        setCategoryItems,
        setAllItems,
        setViewMode,
        setIsLoading,
        setLoadingMessage,
        setReportProgress
    } = props;

    const messageHandler = (event: MessageEvent) => {
        const message = event.data;
        console.log("Received message from extension:", message);
        
        switch(message.command) {
            case "displayFileInfo":
                setFilename(message.filename);
                setIsLoading(false);
                break;
                
            case "showItemDetails":
                setSelectedItem({
                    category: message.category,
                    content: message.content,
                    type: message.type
                });
                setCategoryItems([]);
                setViewMode('single');
                break;
                
            case "showCategoryItems":
                setCategoryItems(message.items);
                setSelectedItem(null);
                setViewMode('category');
                break;
                
            case "showAllFeedbackItems":
                setAllItems(message.items);
                setSelectedItem(null);
                setCategoryItems([]);
                setViewMode('all');
                setFilename(message.filename);
                break;
                
            case "setLoading":
                setIsLoading(message.isLoading);
                if (message.message) {
                    setLoadingMessage(message.message);
                }
                break;
                
            case "reportProgress":
                if (message.state === 'idle') {
                    setReportProgress(null);
                } else {
                    setReportProgress({
                        state: message.state,
                        title: message.title,
                        message: message.message
                    });
                }
                break;
                
            default:
                console.log(`Unknown command: ${message.command}`);
        }
    };

    return messageHandler;
}

// Main webview component
const VSCodeWebview: React.FC = () => {
    const [filename, setFilename] = React.useState<string>("None");
    const [selectedItem, setSelectedItem] = React.useState<FeedbackItemType | null>(null);
    const [categoryItems, setCategoryItems] = React.useState<FeedbackItemType[]>([]);
    const [allItems, setAllItems] = React.useState<FeedbackItemType[]>([]);
    const [viewMode, setViewMode] = React.useState<'single' | 'category' | 'all'>('all');
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = React.useState<string>("Analyzing your code...");
    const [reportProgress, setReportProgress] = React.useState<ReportProgressState | null>(null);
    
    // Listen for messages from the VSCode extension
    React.useEffect(() => {
        const handler = setupMessageHandler({
            setFilename,
            setSelectedItem,
            setCategoryItems,
            setAllItems,
            setViewMode,
            setIsLoading,
            setLoadingMessage,
            setReportProgress
        });

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
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
        console.log("Sending generatePDFReport command to extension");
        // Set loading state to show initial feedback to user
        setReportProgress({
            state: 'loading',
            title: 'Initializing',
            message: 'Starting report generation...'
        });
        vscode.postMessage({ 
            command: "generatePDFReport",
            timestamp: new Date().toISOString() // Add timestamp to ensure uniqueness
        });
    };

    // Render content based on view mode and state
    const renderContent = () => {
        // If there's a report progress, show it
        if (reportProgress) {
            return <ReportProgressState progress={reportProgress} />;
        }
        
        // Otherwise, continue with normal rendering
        if (isLoading) {
            return <LoadingState message={loadingMessage} />;
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
            return <CategoryFeedbackItems items={categoryItems} />;
        }

        if (viewMode === 'all' && allItems.length > 0) {
            return <AllFeedbackItems items={allItems} onReportClick={generateReport} />;
        }

        return (
            <EmptyState 
                onAnalyzeClick={sendRequest}
                onReportClick={generateReport}
            />
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
