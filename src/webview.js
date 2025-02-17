"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ReactDOM = __importStar(require("react-dom/client"));
const Header_1 = __importDefault(require("./components/Header"));
const FeedbackSection_1 = __importDefault(require("./components/FeedbackSection"));
const vscode = acquireVsCodeApi();
const VSCodeWebview = () => {
    const [filename, setFilename] = (0, react_1.useState)("None");
    const [feedback, setFeedback] = (0, react_1.useState)({
        "Serious Problems": [],
        "Warnings": [],
        "Refactoring Suggestions": [],
        "Coding Conventions": [],
        "Performance Optimization": [],
        "Security Issues": [],
        "Best Practices": [],
        "Readability and Maintainability": [],
        "Code Smells": [],
        "Educational Tips": []
    });
    (0, react_1.useEffect)(() => {
        const messageHandler = (event) => {
            const message = event.data;
            if (message.command === "displayFileInfo") {
                setFilename(message.filename);
                processAIResponse(message.response);
            }
        };
        window.addEventListener("message", messageHandler);
        return () => window.removeEventListener("message", messageHandler);
    }, []);
    const sendRequest = () => {
        vscode.postMessage({ command: "getAIAnalysis" });
    };
    const processAIResponse = (response) => {
        const parsedFeedback = {
            "Serious Problems": [],
            "Warnings": [],
            "Refactoring Suggestions": [],
            "Coding Conventions": [],
            "Performance Optimization": [],
            "Security Issues": [],
            "Best Practices": [],
            "Readability and Maintainability": [],
            "Code Smells": [],
            "Educational Tips": []
        };
        let currentCategory = null;
        response.split(/\n(?=#### )/).forEach(section => {
            const titleMatch = section.match(/#### (.+)/);
            const title = titleMatch ? titleMatch[1].trim() : null;
            if (title && parsedFeedback.hasOwnProperty(title)) {
                currentCategory = title;
            }
            if (currentCategory) {
                let content = section.replace(/#### .*/, "").trim();
                parsedFeedback[currentCategory] = content.split("\n").filter(item => item.trim().length > 0);
            }
        });
        setFeedback(parsedFeedback);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: "10px", textAlign: "center", background: "#1e1e1e", color: "#ffffff" }, children: [(0, jsx_runtime_1.jsx)(Header_1.default, {}), (0, jsx_runtime_1.jsx)("button", { onClick: sendRequest, style: {
                    backgroundColor: "#007acc",
                    color: "white",
                    padding: "10px 15px",
                    borderRadius: "5px",
                    fontSize: "16px"
                }, children: "Get Feedback" }), (0, jsx_runtime_1.jsxs)("div", { className: "info", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Currently Targeting:" }), " ", (0, jsx_runtime_1.jsx)("span", { children: filename })] }), (0, jsx_runtime_1.jsx)("div", { id: "response", className: "info", children: Object.keys(feedback).map(category => ((0, jsx_runtime_1.jsx)(FeedbackSection_1.default, { title: category, content: feedback[category] }, category))) })] }));
};
// Render React into WebView
const rootElement = document.getElementById("root");
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render((0, jsx_runtime_1.jsx)(VSCodeWebview, {}));
}
