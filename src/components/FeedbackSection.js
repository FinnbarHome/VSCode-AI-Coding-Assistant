"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const BulletPoint_1 = __importDefault(require("./BulletPoint"));
const FeedbackSection = ({ title, content }) => {
    return ((0, jsx_runtime_1.jsxs)("details", { className: "category", children: [(0, jsx_runtime_1.jsx)("summary", { children: title }), (0, jsx_runtime_1.jsx)("div", { className: "content", children: (0, jsx_runtime_1.jsx)("ul", { children: content.length > 0
                        ? content.map((item, index) => (0, jsx_runtime_1.jsx)(BulletPoint_1.default, { text: item }, index))
                        : (0, jsx_runtime_1.jsx)("p", { style: { color: "gray" }, children: "\u2705 No issues found." }) }) })] }));
};
exports.default = FeedbackSection;
