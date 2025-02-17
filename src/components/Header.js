"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const Header = () => {
    return ((0, jsx_runtime_1.jsxs)("header", { style: {
            textAlign: "center",
            padding: "15px",
            backgroundColor: "#252526",
            borderRadius: "8px",
            boxShadow: "0px 4px 10px rgba(0, 122, 204, 0.3)"
        }, children: [(0, jsx_runtime_1.jsx)("h1", { style: { color: "#61dafb", fontSize: "22px", fontWeight: "bold" }, children: "AI Coding Assistant" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#cccccc" }, children: "Get instant feedback on your code." })] }));
};
exports.default = Header;
