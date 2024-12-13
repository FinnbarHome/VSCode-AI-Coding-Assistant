import * as vscode from 'vscode';
import { getAIResponse } from './ai';

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
    private _view?: vscode.WebviewView; // Holds a reference to the webview view instance
    private supportedExtensions = ['.js', '.ts', '.cpp', '.c', '.java', '.py', '.cs']; // Add more supported extensions

    constructor(private readonly context: vscode.ExtensionContext) {}

    // Automatically triggered when, for example, a user clicks on the activity bar
    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView; // Save the reference to the webview view

        // Enable scripts within the webview
        webviewView.webview.options = {
            enableScripts: true, // Allows JavaScript execution in the webview
        };

        // Resolve the URI for the external stylesheet
        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'style.css') // Path to the CSS file in the assets folder
        );

        // Set the initial content of the webview
        webviewView.webview.html = this.getHtmlContent(styleUri);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'getAIAnalysis') {
                const activeEditor = vscode.window.activeTextEditor; // Get the active editor
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No active editor found. Open a file to get feedback on your code.');
                    this.postMessage('No file selected', 'Please open a file to analyze.');
                    return;
                }

                const fileName = activeEditor.document.fileName; // Get the file name
                const extension = this.getFileExtension(fileName); // Get the file extension

                // Check if the file extension is supported
                if (!this.supportedExtensions.includes(extension)) {
                    vscode.window.showWarningMessage(`Unsupported file type: ${extension}`);
                    this.postMessage(this.getShortFileName(fileName), `File type (${extension}) is not supported.`);
                    return;
                }

                const fileContent = activeEditor.document.getText(); // Get the content of the active file

                // Limit the file content to 2048 characters (approx. 800 tokens)
                const truncatedContent = fileContent.length > 2048
                    ? fileContent.slice(0, 2048) + '\n\n[Content truncated due to length]'
                    : fileContent;

                // Construct the prompt for OpenAI
                const prompt = `Review the following code and categorize the feedback into: Serious Problems, Warnings, Refactoring Suggestions, Coding Conventions, Performance Optimization, Security Issues, Best Practices, Readability and Maintainability, Code Smells, and Educational Tips.\n\n${truncatedContent}`;

                // Call OpenAI API and get the response
                const response = await getAIResponse(prompt);

                // Post the filename and response back to the webview
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

    // Helper method to get the short file name from a full path
    private getShortFileName(filePath: string): string {
        return filePath.split(/[\\/]/).pop() || 'Unknown File';
    }

    // Helper method to get the file extension
    private getFileExtension(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

    // Method to generate HTML content for the webview
    private getHtmlContent(styleUri: vscode.Uri): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Coding Assistant</title>
                <link rel="stylesheet" href="${styleUri}">
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; text-align: center; }
                    button { margin: 5px; padding: 10px; }
                    .info { margin-top: 20px; text-align: left; white-space: pre-wrap; }
                    .category { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
                    .category h2 { color: #007acc; }
                </style>
            </head>
            <body>
                <h1>AI Coding Assistant</h1>
                <p>Click the button to get feedback on your open file.</p>
                <button onclick="sendRequest()">Get Feedback</button>
                <div class="info">
                    <strong>Currently Targeting:</strong> <span id="filename">None</span>
                </div>
                <div id="response" class="info"></div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function sendRequest() {
                        vscode.postMessage({ command: 'getAIAnalysis' });
                    }

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'displayFileInfo') {
                            document.getElementById('filename').innerText = message.filename;
                            document.getElementById('response').innerHTML = formatResponse(message.response);
                        }
                    });

                    function formatResponse(response) {
                        return response
                            .split(/\\n(?=### )/)
                            .map(section => \`<div class="category">\${section.trim().replace(/### (.*)/, '<h2>$1</h2>')}</div>\`)
                            .join('');
                    }
                </script>
            </body>
            </html>
        `;
    }
}
