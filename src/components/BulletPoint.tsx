import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

interface BulletPointProps {
    text: string;
    type?: "error" | "warning" | "info";
}

const BulletPoint: React.FC<BulletPointProps> = ({ text, type = "info" }) => {
    const iconStyles = { width: 18, height: 18, marginRight: 8 };

    const getIcon = () => {
        switch (type) {
            case "error": return <AlertCircle color="#f87171" style={iconStyles} />;
            case "warning": return <AlertCircle color="#facc15" style={iconStyles} />;
            default: return <CheckCircle color="#10b981" style={iconStyles} />;
        }
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(0, 122, 204, 0.2)",
            borderRadius: "5px",
            padding: "6px 10px",
            margin: "4px 0",
            color: "#ffffff"
        }}>
            {getIcon()}
            {text}
        </div>
    );
};

export default BulletPoint;
