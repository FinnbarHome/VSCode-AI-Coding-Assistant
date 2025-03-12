"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
const BulletPoint = ({ text, type = "info" }) => {
    const iconStyles = { width: 18, height: 18, marginRight: 8 };
    const getIcon = () => {
        switch (type) {
            case "error": return (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { color: "#f87171", style: iconStyles });
            case "warning": return (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { color: "#facc15", style: iconStyles });
            default: return (0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle, { color: "#10b981", style: iconStyles });
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(0, 122, 204, 0.2)",
            borderRadius: "5px",
            padding: "6px 10px",
            margin: "4px 0",
            color: "#ffffff"
        }, children: [getIcon(), text] }));
};
exports.default = BulletPoint;
