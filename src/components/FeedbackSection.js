"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const BulletPoint_1 = __importDefault(require("./BulletPoint"));
const FeedbackSection = ({ title, content }) => {
    return ((0, jsx_runtime_1.jsxs)("details", { style: {
            backgroundColor: "#252526",
            border: "1px solid #444",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "10px",
            transition: "all 0.3s ease-in-out",
            boxShadow: "0px 4px 8px rgba(0, 122, 204, 0.2)"
        }, children: [(0, jsx_runtime_1.jsx)("summary", { style: {
                    fontSize: "18px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    color: "#ffffff",
                    padding: "6px 10px"
                }, children: title }), (0, jsx_runtime_1.jsx)("div", { style: { marginTop: "8px", paddingLeft: "10px" }, children: content.length > 0
                    ? content.map((item, index) => (0, jsx_runtime_1.jsx)(BulletPoint_1.default, { text: item }, index))
                    : (0, jsx_runtime_1.jsx)("p", { style: { color: "gray", fontSize: "14px" }, children: "\u2705 No issues found." }) })] }));
};
exports.default = FeedbackSection;
