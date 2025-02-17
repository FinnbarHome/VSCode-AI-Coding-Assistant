import React from "react";
import BulletPoint from "./BulletPoint";

interface FeedbackSectionProps {
    title: string;
    content: string[];
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ title, content }) => {
    return (
        <details style={{
            backgroundColor: "#252526",
            border: "1px solid #444",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "12px", 
            transition: "all 0.3s ease-in-out",
            boxShadow: "0px 4px 8px rgba(0, 122, 204, 0.2)"
        }}>        
            <summary style={{
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
                color: "#ffffff",
                padding: "6px 10px"
            }}>
                {title}
            </summary>
            <div style={{ marginTop: "8px", paddingLeft: "10px" }}>
                {content.length > 0
                    ? content.map((item, index) => <BulletPoint key={index} text={item} />)
                    : <p style={{ color: "gray", fontSize: "14px" }}>✅ No issues found.</p>}
            </div>
        </details>
    );
};

export default FeedbackSection;
