import * as vscode from 'vscode';
import { getAIResponse } from './ai';
import * as fs from 'fs';
import * as path from 'path';

// Function called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is now active!');

    const provider = new AICodingWebviewViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiCodingView', provider)
    );

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

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'getAIAnalysis') {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No active editor found.');
                    this.postMessage('No file selected', 'Please open a file to analyze.');
                    return;
                }

                const fileName = activeEditor.document.fileName;
                const extension = this.getFileExtension(fileName);

                if (!this.supportedExtensions.includes(extension)) {
                    vscode.window.showWarningMessage(`Unsupported file type: ${extension}`);
                    this.postMessage(this.getShortFileName(fileName), `File type (${extension}) is not supported.`);
                    return;
                }

                const fileContent = activeEditor.document.getText();
                const truncatedContent = fileContent.length > 2048
                    ? fileContent.slice(0, 2048) + '\n\n[Content truncated due to length]'
                    : fileContent;

                const prompt = `Review the following code:\n\n${truncatedContent}`;

                // Get the file path where the response is saved
                const responseFilePath = await getAIResponse(prompt);

                if (!responseFilePath) {
                    vscode.window.showErrorMessage("Error retrieving AI response.");
                    return;
                }

                // Read AI response from file
                let responseText = "";
                try {
                    responseText = fs.readFileSync(responseFilePath, 'utf-8');
                } catch (error) {
                    vscode.window.showErrorMessage("Error reading AI response file.");
                    console.error("Error reading response file:", error);
                    return;
                }

                // Post AI response to webview
                this.postMessage(this.getShortFileName(fileName), responseText);
            }
        });
    }

    getView() {
        return this._view;
    }

    updateTargetFile(filePath: string) {
        const shortName = this.getShortFileName(filePath);
        if (this._view) {
            this.postMessage(shortName, `Target file updated to: ${shortName}`);
        }
    }

    private postMessage(filename: string, response: string) {
        this._view?.webview.postMessage({ command: 'displayFileInfo', filename, response });
    }

    private getShortFileName(filePath: string): string {
        return filePath.split(/[\\/]/).pop() || 'Unknown File';
    }

    private getFileExtension(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

    private getHtmlContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "out", "webview.js")
        );

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Coding Assistant</title>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
                <style>
                    body { margin: 0; padding: 0; background: #1e1e1e; color: white; font-family: Arial, sans-serif; }
                    #root { display: flex; justify-content: center; align-items: center; height: 100vh; width: 100%; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script src="${scriptUri}" defer></script>
            </body>
            </html>
        `;
    }
}
