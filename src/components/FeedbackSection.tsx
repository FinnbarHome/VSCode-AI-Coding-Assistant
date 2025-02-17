import React from "react";
import BulletPoint from "./BulletPoint";

interface FeedbackSectionProps {
    title: string;
    content: string[];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ title, content }) => {
    return (
        <details className="category">
            <summary>{title}</summary>
            <div className="content">
                <ul>
                    {content.length > 0
                        ? content.map((item, index) => <BulletPoint key={index} text={item} />)
                        : <p style={{ color: "gray" }}>✅ No issues found.</p>}
                </ul>
            </div>
        </details>
    );
};

export default FeedbackSection;
