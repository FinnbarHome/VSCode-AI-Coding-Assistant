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

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        // Enable scripts within the webview
        webviewView.webview.options = {
            enableScripts: true,
        };

        // Resolve the URI for the external stylesheet
        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'style.css')
        );

        // Set the initial content of the webview
        webviewView.webview.html = this.getHtmlContent(styleUri);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'getAIAnalysis') {
                const activeEditor = vscode.window.activeTextEditor; // Get the active editor
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No active editor found. Open a file to get feedback on your code.');
                    webviewView.webview.postMessage({
                        command: 'displayFileInfo',
                        filename: 'No file selected',
                        response: 'No active file to analyze.',
                    });
                    return;
                }

                const fileName = activeEditor.document.fileName;
                const extension = this.getFileExtension(fileName);

                // Check if the file extension is supported
                if (!this.supportedExtensions.includes(extension)) {
                    vscode.window.showWarningMessage(
                        `The selected file type (${extension}) is not supported for analysis.`
                    );
                    webviewView.webview.postMessage({
                        command: 'displayFileInfo',
                        filename: this.getShortFileName(fileName),
                        response: `File type (${extension}) is not supported.`,
                    });
                    return;
                }

                const fileContent = activeEditor.document.getText(); // Get the content of the active file

                // Limit the file content to 2048 characters (approx. 800 tokens)
                const truncatedContent =
                    fileContent.length > 2048
                        ? fileContent.slice(0, 2048) + '\n\n[Content truncated due to length]'
                        : fileContent;

                // Construct the prompt for OpenAI
                const prompt = `You are a code reviewer. Provide constructive feedback on the following code without giving the completed solution. Offer guidance and show small snippets as examples to illustrate improvements:

                ${truncatedContent}`;

                // Call OpenAI API and get the response
                const response = await getAIResponse(prompt);

                // Post the filename and response back to the webview
                webviewView.webview.postMessage({
                    command: 'displayFileInfo',
                    filename: this.getShortFileName(fileName),
                    response: response,
                });
            }
        });
    }

    getView() {
        return this._view;
    }

    updateTargetFile(filePath: string) {
        const shortName = this.getShortFileName(filePath);
        const extension = this.getFileExtension(filePath);

        if (this._view) {
            this._view.webview.postMessage({
                command: 'displayFileInfo',
                filename: shortName,
                response: extension
                    ? `Target file updated to: ${shortName}`
                    : `Unsupported file type. Select a valid file for analysis.`,
            });
        }
    }

    private getShortFileName(filePath: string): string {
        return filePath.split(/[\\/]/).pop() || 'Unknown File';
    }

    private getFileExtension(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

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
                </style>
            </head>
            <body>
                <h1>AI Coding Assistant</h1>
                <p>Click the button to get feedback on your open file.</p>
                <button onclick="sendRequest()">Get Feedback</button>
                <div class="info">
                    <strong>Currently Targeting:</strong> <span id="filename">None</span>
                </div>
                <div id="response" style="margin-top: 20px;"></div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function sendRequest() {
                        vscode.postMessage({ command: 'getAIAnalysis' });
                    }

                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'displayFileInfo') {
                            document.getElementById('filename').innerText = message.filename;
                            document.getElementById('response').innerText = message.response;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
