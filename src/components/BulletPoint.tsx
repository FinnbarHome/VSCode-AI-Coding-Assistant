import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import "../styles/bulletpoint.css";

interface BulletPointProps {
    text: string;
    type?: "error" | "warning" | "info";
}

const BulletPoint: React.FC<BulletPointProps> = ({ text, type = "info" }) => {
    const getIcon = () => {
        switch (type) {
            case "error": return <AlertCircle color="#f87171" />;
            case "warning": return <AlertCircle color="#facc15" />;
            default: return <CheckCircle color="#10b981" />;
        }
    };

    return (
        <div className="bullet-point">
            {getIcon()} {text}
        </div>
    );
};

export default BulletPoint;
