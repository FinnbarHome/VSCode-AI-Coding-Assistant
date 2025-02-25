import React from "react";
import BulletPoint from "./BulletPoint";
import "../styles/feedback.css";

interface FeedbackSectionProps {
    title: string;
    content: string[];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ title, content }) => {
    return (
        <details className="category">
            <summary>{title}</summary>
            <div className="content">
                {content.length > 0
                    ? content.map((item, index) => <BulletPoint key={index} text={item} />)
                    : <p style={{ color: "gray", fontSize: "14px" }}>✅ No issues found.</p>}
            </div>
        </details>
    );
};

export default FeedbackSection;
