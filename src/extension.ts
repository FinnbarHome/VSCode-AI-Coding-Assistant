import * as vscode from 'vscode';
import { getAIResponse } from './ai';
import * as fs from 'fs';
import * as path from 'path';

const MAX_RETRIES = 3; // Avoid infinite loops

// Function called when the extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Coding Assistant is now active!');

    // Create tree data provider
    const feedbackProvider = new FeedbackTreeDataProvider();
    
    // Register tree view
    const treeView = vscode.window.createTreeView('aiCodingTreeView', {
        treeDataProvider: feedbackProvider,
        showCollapseAll: true
    });
    
    // Register webview provider for details panel
    const webviewProvider = new AICodingWebviewViewProvider(context, feedbackProvider);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiCodingDetailsView', webviewProvider)
    );

    // Register command to analyze current file
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodingAssistant.analyzeCurrentFile', async () => {
            await webviewProvider.handleAIAnalysis();
            feedbackProvider.refresh();
        })
    );

    // Update target file when active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && webviewProvider.getView()) {
            webviewProvider.updateTargetFile(editor.document.fileName);
        }
    });
    
    // Handle tree item selection
    treeView.onDidChangeSelection(e => {
        if (e.selection.length > 0) {
            const item = e.selection[0];
            webviewProvider.showItemDetails(item);
        }
    });
    
    context.subscriptions.push(treeView);
}

// For cleanup, called when the extension is deactivated
export function deactivate() {}

// Tree item class for feedback categories and items
class FeedbackItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly category?: string,
        public readonly content?: string,
        public readonly type?: 'error' | 'warning' | 'info'
    ) {
        super(label, collapsibleState);
        
        // Set icon based on type
        if (type) {
            this.iconPath = new vscode.ThemeIcon(
                type === 'error' ? 'error' : 
                type === 'warning' ? 'warning' : 'info'
            );
        }
        
        // Set tooltip
        this.tooltip = content || label;
        
        // Set context value for conditional view actions
        this.contextValue = category ? 'feedbackItem' : 'feedbackCategory';
    }
}

// Tree data provider for feedback
class FeedbackTreeDataProvider implements vscode.TreeDataProvider<FeedbackItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FeedbackItem | undefined | null | void> = new vscode.EventEmitter<FeedbackItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FeedbackItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private feedbackData: Record<string, string[]> = {
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
    
    private currentFile: string = 'No file selected';
    
    constructor() {}
    
    getTreeItem(element: FeedbackItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: FeedbackItem): Thenable<FeedbackItem[]> {
        if (!element) {
            // Root level - return categories
            return Promise.resolve(
                Object.keys(this.feedbackData).map(category => {
                    const itemCount = this.feedbackData[category].length;
                    const label = `${category} (${itemCount})`;
                    const state = itemCount > 0 
                        ? vscode.TreeItemCollapsibleState.Collapsed 
                        : vscode.TreeItemCollapsibleState.None;
                    
                    return new FeedbackItem(label, state);
                })
            );
        } else {
            // Category level - return feedback items
            const categoryName = element.label.split(' (')[0];
            const items = this.feedbackData[categoryName] || [];
            
            return Promise.resolve(
                items.map(item => {
                    // Determine item type based on category
                    let type: 'error' | 'warning' | 'info' = 'info';
                    if (categoryName === 'Serious Problems') type = 'error';
                    else if (categoryName === 'Warnings' || categoryName === 'Security Issues') type = 'warning';
                    
                    return new FeedbackItem(
                        item.length > 50 ? item.substring(0, 50) + '...' : item,
                        vscode.TreeItemCollapsibleState.None,
                        categoryName,
                        item,
                        type
                    );
                })
            );
        }
    }
    
    updateFeedback(data: Record<string, string[]>, filename: string) {
        this.feedbackData = data;
        this.currentFile = filename;
        this.refresh();
    }
    
    getCurrentFile(): string {
        return this.currentFile;
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

class AICodingWebviewViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private supportedExtensions = ['.js', '.ts', '.cpp', '.c', '.java', '.py', '.cs', '.json', '.html', '.css', '.md'];

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly treeDataProvider: FeedbackTreeDataProvider
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'getAIAnalysis') {
                await this.handleAIAnalysis();
            }
        });
    }

    async handleAIAnalysis(retryCount = 0) {
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

        // Show progress indicator
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing code...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            // Get the file path where the response is saved
            const responseFilePath = await getAIResponse(prompt);
            if (!responseFilePath) {
                vscode.window.showErrorMessage("Error retrieving AI response.");
                return;
            }
            
            progress.report({ increment: 50 });

            // Convert raw response to JSON and save it
            const jsonFilePath = this.saveParsedResponse(responseFilePath);
            if (!jsonFilePath) {
                vscode.window.showErrorMessage("Error processing AI response.");
                return;
            }
            
            progress.report({ increment: 90 });

            // Read and check JSON data
            let responseJson = "";
            try {
                responseJson = fs.readFileSync(jsonFilePath, 'utf-8');
                const parsedJson = JSON.parse(responseJson);

                // If JSON is blank, retry querying the AI
                if (this.isBlankResponse(parsedJson)) {
                    if (retryCount < MAX_RETRIES) {
                        console.warn(`⚠️ Blank AI response detected. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                        await this.handleAIAnalysis(retryCount + 1);
                        return;
                    } else {
                        vscode.window.showErrorMessage("AI returned an empty response multiple times. Please try again later.");
                    }
                }
                
                // Update tree view with feedback data
                this.treeDataProvider.updateFeedback(parsedJson, this.getShortFileName(fileName));

            } catch (error) {
                vscode.window.showErrorMessage("Error reading JSON response file.");
                console.error("Error reading JSON file:", error);
                return;
            }
            
            progress.report({ increment: 100 });

            // Post AI response to webview
            this.postMessage(this.getShortFileName(fileName), responseJson);
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
    
    showItemDetails(item: FeedbackItem) {
        if (this._view && item.content) {
            this._view.webview.postMessage({ 
                command: 'showItemDetails', 
                category: item.category,
                content: item.content,
                type: item.type || 'info'
            });
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

    /**
     * Saves parsed AI response as JSON
     */
    private saveParsedResponse(responseFilePath: string): string | null {
        const jsonResponsesDir = path.resolve(__dirname, '../jsonresponses');
        if (!fs.existsSync(jsonResponsesDir)) {
            fs.mkdirSync(jsonResponsesDir, { recursive: true });
        }

        try {
            const rawResponse = fs.readFileSync(responseFilePath, 'utf-8');
            const parsedData = this.parseAIResponse(rawResponse);

            // Generate JSON filename
            const jsonFileName = `response-${new Date().toISOString().replace(/:/g, '-')}.json`;
            const jsonFilePath = path.join(jsonResponsesDir, jsonFileName);

            fs.writeFileSync(jsonFilePath, JSON.stringify(parsedData, null, 2), 'utf-8');
            console.log(`✅ Parsed AI response saved to: ${jsonFilePath}`);
            return jsonFilePath;
        } catch (error) {
            console.error("Error parsing and saving AI response:", error);
            return null;
        }
    }

    /**
     * Parses the AI response text into structured JSON
     */
    private parseAIResponse(response: string): Record<string, string[]> {
        const parsedData: Record<string, string[]> = {};
        let currentCategory: string | null = null;
    
        const lines = response.split('\n');
    
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
    
            // Detect new category (#### Category Name)
            if (line.startsWith('#### ')) {
                currentCategory = line.replace('#### ', '').trim();
                parsedData[currentCategory] = [];  // Initialize category as an empty array
                continue;
            }
    
            // Identify bullet points ("- ") OR numbered lists ("1. ")
            if ((line.match(/^\d+\./) || line.startsWith('-')) && currentCategory) {
                let bulletPoint = line.replace(/^\d+\.\s*/, '').replace(/^- /, '').trim(); // Remove number or dash
    
                // Continue collecting full sentences until the next bullet, numbered list, or category
                while (
                    i + 1 < lines.length &&
                    !lines[i + 1].match(/^\d+\./) &&
                    !lines[i + 1].startsWith('-') &&
                    !lines[i + 1].startsWith('#### ')
                ) {
                    i++;
                    bulletPoint += " " + lines[i].trim();
                }
    
                // Ensure we capture complete sentences
                if (!bulletPoint.endsWith('.') && bulletPoint.includes('.')) {
                    const lastPeriodIndex = bulletPoint.lastIndexOf('.');
                    bulletPoint = bulletPoint.substring(0, lastPeriodIndex + 1);
                }
    
                parsedData[currentCategory].push(bulletPoint);
            }
        }
    
        return parsedData;
    }
    
    /**
     * Checks if JSON response is completely empty
     */
    private isBlankResponse(parsedJson: Record<string, string[]>): boolean {
        return Object.values(parsedJson).every(arr => arr.length === 0);
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
