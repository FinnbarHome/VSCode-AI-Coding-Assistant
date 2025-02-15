import * as vscode from 'vscode';
import { getAIResponse } from './ai';
import * as fs from 'fs';
import * as path from 'path';

// Function called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is now active!');

    // Register the webview view provider for the activity bar view
    const provider = new AICodingWebviewViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'aiCodingView', // ID of view to link provider with (matches id in package.json)
            provider // Create an instance of the provider class
        )
    );

    // Update the webview whenever a new file is selected
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && provider.getView()) {
            provider.updateTargetFile(editor.document.fileName);
        }
    });
}

// For cleanup, called when the extension is deactivated
export function deactivate() {}

class AICodingWebviewViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private supportedExtensions = ['.js', '.ts', '.cpp', '.c', '.java', '.py', '.cs', '.json', '.html', '.css', '.md'];

    constructor(private readonly context: vscode.ExtensionContext) {}

    // Automatically triggered when a user clicks on the activity bar
    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
    
        webviewView.webview.options = {
            enableScripts: true, // Allows JavaScript execution in the webview
        };
    
        // Set the initial content of the webview
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);
    
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
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
                const response = await getAIResponse(prompt);
    
                // Post AI response to webview
                this.postMessage(this.getShortFileName(fileName), response);
            }
        });
    }
    

    // Get the webview instance
    getView() {
        return this._view;
    }

    // Update the targeted file in the webview
    updateTargetFile(filePath: string) {
        const shortName = this.getShortFileName(filePath);
        if (this._view) {
            this.postMessage(shortName, `Target file updated to: ${shortName}`);
        }
    }

    // Helper method to send messages to the webview
    private postMessage(filename: string, response: string) {
        this._view?.webview.postMessage({ command: 'displayFileInfo', filename, response });
    }

    // Helper method to get short file name
    private getShortFileName(filePath: string): string {
        return filePath.split(/[\\/]/).pop() || 'Unknown File';
    }

    // Helper method to get file extension
    private getFileExtension(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

    // Generate HTML content for the webview
    private getHtmlContent(webview: vscode.Webview): string {
        const htmlPath = path.join(this.context.extensionUri.fsPath, 'assets', 'webview.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
        // Dynamically resolve URIs for styles and scripts
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'script.js'));
    
        // Replace placeholders in HTML file
        htmlContent = htmlContent.replace('{{styleUri}}', styleUri.toString());
        htmlContent = htmlContent.replace('{{scriptUri}}', scriptUri.toString());
    
        return htmlContent;
    }
    
}
