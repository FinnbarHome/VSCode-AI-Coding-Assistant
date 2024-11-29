import * as vscode from 'vscode';

// Func called when ext is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is now active!');

    // Register the webview view provider for the activity bar view
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'aiCodingView', // ID of the view to associate this provider with (matches the id in package.json)
            new AICodingWebviewViewProvider(context) // Create an instance of the provider class
        )
    );
}

// For cleanup, called when ext deactivated
export function deactivate() {}

class AICodingWebviewViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView; // Holds a reference to the webview view instance

    constructor(private readonly context: vscode.ExtensionContext) {}

    // Automatically triggered when for eg: a User clicks on activity bar
    resolveWebviewView(
        webviewView: vscode.WebviewView, // The webview view instance provided by VSCode
        context: vscode.WebviewViewResolveContext, // Contextual information about the resolution
        _token: vscode.CancellationToken // Token for cancellation, not used here but allows the method to stop processing eg: the user closes the view before it finishes loading
    ) {
        this._view = webviewView; // Save the reference to the webview view

        // Enable scripts within the webview
        webviewView.webview.options = {
            enableScripts: true, // Allows JS execution in the webview
        };

        // Resolve the URI for the external stylesheet
        const styleUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'style.css') // Path to the CSS file in assets folder
        );

        // Set the content of the webview
        webviewView.webview.html = this.getHtmlContent(styleUri); // Pass the resolved style URI to the HTML content generator
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
            </head>
            <body>
                <h1>Welcome to AI Coding Assistant</h1>
                <p>This is your activity view for coding assistance.</p>
            </body>
            </html>
        `;
    }
}
