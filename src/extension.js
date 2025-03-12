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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const ai_1 = require("./ai");
// Function called when the extension is activated
function activate(context) {
    console.log('AI Coding Assistant is now active!');
    // Register the webview view provider for the activity bar view
    const provider = new AICodingWebviewViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('aiCodingView', // ID of view to link provider with (matches id in package.json)
    provider // Create an instance of the provider class
    ));
    // Update the webview whenever a new file is selected
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && provider.getView()) {
            provider.updateTargetFile(editor.document.fileName);
        }
    });
}
// For cleanup, called when the extension is deactivated
function deactivate() { }
class AICodingWebviewViewProvider {
    constructor(context) {
        this.context = context;
        this.supportedExtensions = ['.js', '.ts', '.cpp', '.c', '.java', '.py', '.cs', '.json', '.html', '.css', '.md'];
    }
    // Automatically triggered when a user clicks on the activity bar
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true, // Allows JavaScript execution in the webview
        };
        // Set the initial content of the webview
        const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "out", "webview.js"));
        webviewView.webview.html = this.getHtmlContent(scriptUri);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
            if (message.command === 'getAIAnalysis') {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No active editor found. Open a file to get feedback on your code.');
                    this.postMessage('No file selected', 'Please open a file to analyze.');
                    return;
                }
                const fileName = activeEditor.document.fileName;
                const extension = this.getFileExtension(fileName);
                // Check if the file type is supported
                if (!this.supportedExtensions.includes(extension)) {
                    vscode.window.showWarningMessage(`Unsupported file type: ${extension}`);
                    this.postMessage(this.getShortFileName(fileName), `File type (${extension}) is not supported.`);
                    return;
                }
                const fileContent = activeEditor.document.getText();
                // Limit file content to 2048 characters
                const truncatedContent = fileContent.length > 2048
                    ? fileContent.slice(0, 2048) + '\n\n[Content truncated due to length]'
                    : fileContent;
                // Construct AI prompt
                const prompt = `Review the following code and categorize the feedback into: Serious Problems, Warnings, Refactoring Suggestions, Coding Conventions, Performance Optimization, Security Issues, Best Practices, Readability and Maintainability, Code Smells, and Educational Tips.\n\n${truncatedContent}`;
                // Show loading message
                this.postMessage(this.getShortFileName(fileName), "⏳ Analyzing your code... Please wait.");
                // Call OpenAI API
                const response = yield (0, ai_1.getAIResponse)(prompt);
                // Post AI response to webview
                this.postMessage(this.getShortFileName(fileName), response);
            }
        }));
    }
    // Get the webview instance
    getView() {
        return this._view;
    }
    // Update the targeted file in the webview
    updateTargetFile(filePath) {
        const shortName = this.getShortFileName(filePath);
        if (this._view) {
            this.postMessage(shortName, `Target file updated to: ${shortName}`);
        }
    }
    // Helper method to send messages to the webview
    postMessage(filename, response) {
        var _a;
        (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({ command: 'displayFileInfo', filename, response });
    }
    // Helper method to get short file name
    getShortFileName(filePath) {
        return filePath.split(/[\\/]/).pop() || 'Unknown File';
    }
    // Helper method to get file extension
    getFileExtension(filePath) {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }
    // Generate React-based WebView HTML
    getHtmlContent(scriptUri) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Coding Assistant</title>
                <style>
                    body { margin: 0; padding: 0; background: #1e1e1e; color: white; font-family: Arial, sans-serif; }
                    #root { display: flex; justify-content: center; align-items: center; height: 100vh; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}
