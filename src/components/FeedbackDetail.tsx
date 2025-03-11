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
                <p>{content}</p>
            </div>
        </div>
    );
};

export default FeedbackDetail; 