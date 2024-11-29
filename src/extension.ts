import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-ai-coding-assistant" is now active!');

    const disposable = vscode.commands.registerCommand('vscode-ai-coding-assistant.helloWorld', () => {
        // Create and show a new panel
        const panel = vscode.window.createWebviewPanel(
            'helloWorldPanel', // Identifier for the panel
            'Hello World Panel', // Title of the panel
            vscode.ViewColumn.One, // Editor column to show the new panel
            {} // Webview options
        );

        // Set the HTML content for the panel
        panel.webview.html = getWebviewContent();
    });

    context.subscriptions.push(disposable);
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
            <p>Welcome to your new panel.</p>
        </body>
        </html>
    `;
}

export function deactivate() {}
