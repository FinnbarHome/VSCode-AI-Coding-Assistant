"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const BulletPoint = ({ text }) => {
    return (0, jsx_runtime_1.jsx)("li", { style: { padding: "6px", backgroundColor: "rgba(0, 122, 204, 0.2)", borderRadius: "5px", margin: "4px 0" }, children: text });
};
exports.default = BulletPoint;
