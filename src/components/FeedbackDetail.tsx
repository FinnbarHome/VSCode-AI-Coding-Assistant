import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import "../styles/feedbackDetail.css";

interface FeedbackDetailProps {
    category: string;
    content: string;
    type: 'error' | 'warning' | 'info';
    showHeader?: boolean;
}

const FeedbackDetail: React.FC<FeedbackDetailProps> = ({ 
    category, 
    content, 
    type,
    showHeader = true
}) => {
    const getIcon = () => {
        switch (type) {
            case "error": return <AlertCircle color="#f87171" size={20} />;
            case "warning": return <AlertTriangle color="#facc15" size={20} />;
            default: return <Info color="#10b981" size={20} />;
        }
    };

    // Format content as bullet points if it contains multiple items
    const formatContent = () => {
        // Check if content is empty or "No issues found"
        if (!content || content.toLowerCase().includes('no issues found')) {
            return (
                <div className="feedback-empty">
                    <span className="feedback-checkmark">✓</span>
                    <span>No issues found in this category</span>
                </div>
            );
        }

        // Split content into bullet points
        const bulletPoints = splitIntoBulletPoints(content);
        
        if (bulletPoints.length > 1) {
            return (
                <ul className="vscode-list">
                    {bulletPoints.map((point, index) => (
                        <li key={index} className="vscode-list-item">
                            <div className="list-item-content">
                                <span className="list-item-icon">{getItemIcon(type)}</span>
                                <span>{point}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            );
        }
        
        // If only one item, display without list
        return (
            <div className="single-item">
                <span className="list-item-icon">{getItemIcon(type)}</span>
                <span>{content}</span>
            </div>
        );
    };
    
    // Helper function to split content into bullet points
    const splitIntoBulletPoints = (text: string): string[] => {
        // If the text already contains bullet points (- or numbers)
        if (text.match(/^[-•*]\s+/m) || text.match(/^\d+\.\s+/m)) {
            return text.split(/\n+/).filter(line => line.trim().length > 0);
        }
        
        // Otherwise split by periods, but be careful with abbreviations and numbers
        const points = text.split(/\.(?=\s|$)/).filter(s => s.trim().length > 0);
        return points.map(p => p.trim() + (p.endsWith('.') ? '' : '.'));
    };
    
    // Get appropriate icon for list items
    const getItemIcon = (itemType: string) => {
        switch (itemType) {
            case 'error': return '⚠️';
            case 'warning': return '⚠';
            default: return '📌';
        }
    };

    return (
        <div className="vscode-panel" data-type={type}>
            {showHeader && (
                <div className="vscode-panel-header">
                    <div className="panel-header-icon">
                        {getIcon()}
                    </div>
                    <div className="panel-header-title">
                        {category}
                    </div>
                </div>
            )}
            <div className="vscode-panel-content">
                {formatContent()}
            </div>
        </div>
    );
};

export default FeedbackDetail; 