import React from "react";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import "../styles/feedbackDetail.css";

interface FeedbackDetailProps {
    category: string;
    content: string;
    type: 'error' | 'warning' | 'info';
}

const FeedbackDetail: React.FC<FeedbackDetailProps> = ({ category, content, type }) => {
    const getIcon = () => {
        switch (type) {
            case "error": return <AlertCircle color="#f87171" size={24} />;
            case "warning": return <AlertCircle color="#facc15" size={24} />;
            default: return <Info color="#10b981" size={24} />;
        }
    };

    const getTypeLabel = () => {
        switch (type) {
            case "error": return "Error";
            case "warning": return "Warning";
            default: return "Info";
        }
    };

    // Format content as bullet points if it contains multiple items
    const formatContent = () => {
        // Check if content contains multiple sentences that could be bullet points
        if (content.includes('. ') || content.includes('.\n')) {
            // Split by period followed by space or newline, but keep the period
            const sentences = content.split(/\.(?=\s|$)/).filter(s => s.trim().length > 0);
            
            if (sentences.length > 1) {
                return (
                    <ul className="feedback-detail-list">
                        {sentences.map((sentence, index) => (
                            <li key={index}>{sentence.trim()}{!sentence.endsWith('.') ? '.' : ''}</li>
                        ))}
                    </ul>
                );
            }
        }
        
        // If not multiple sentences, just return as is
        return <p>{content}</p>;
    };

    return (
        <div className="feedback-detail">
            <div className="feedback-detail-header">
                <div className="feedback-detail-icon">
                    {getIcon()}
                </div>
                <div className="feedback-detail-title">
                    <h2>{category}</h2>
                    <span className={`feedback-detail-type ${type}`}>{getTypeLabel()}</span>
                </div>
            </div>
            <div className="feedback-detail-content">
                {formatContent()}
            </div>
        </div>
    );
};

export default FeedbackDetail; 