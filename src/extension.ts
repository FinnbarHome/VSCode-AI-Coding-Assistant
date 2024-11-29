import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-ai-coding-assistant" is now active!');

    // Automatically create and show a new panel
    const panel = vscode.window.createWebviewPanel(
        'helloWorldPanel', // Unique identifier for the panel
        'Hello World Panel', // Title of the panel
        vscode.ViewColumn.One, // Show in the first column
        {} // Webview options
    );

    // Set the HTML content for the panel
    panel.webview.html = getWebviewContent();
}

function getWebviewContent(): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hello World</title>
        </head>
        <body>
            <h1>Hello World!</h1>
            <p>Panel opened automatically!</p>
        </body>
        </html>
    `;
}

export function deactivate() {}
