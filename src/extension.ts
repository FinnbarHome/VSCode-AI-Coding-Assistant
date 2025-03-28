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

    // Register command to generate PDF report
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodingAssistant.generatePDFReport', async () => {
            // Functionless command - does nothing
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
    
    constructor() {
        // Initialize all categories with empty arrays
        this.feedbackData = {
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
    }
    
    getTreeItem(element: FeedbackItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: FeedbackItem): Thenable<FeedbackItem[]> {
        if (!element) {
            // Root level - return categories
            return Promise.resolve(
                Object.keys(this.feedbackData).map(category => {
                    // Get items for this category
                    const items = this.feedbackData[category] || [];
                    
                    // Filter out "No issues found" messages to get actual issue count
                    const actualIssueCount = items.filter(item => 
                        !item.toLowerCase().includes('no issues') && 
                        !item.toLowerCase().includes('no problems') &&
                        !item.toLowerCase().includes('✅')
                    ).length;
                    
                    const label = `${category} (${actualIssueCount})`;
                    const state = items.length > 0 
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
                    if (categoryName === 'Serious Problems') { type = 'error'; }
                    else if (categoryName === 'Warnings' || categoryName === 'Security Issues') { type = 'warning'; }
                    
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
        // Ensure all categories exist in the data
        const defaultCategories = [
            "Serious Problems",
            "Warnings",
            "Refactoring Suggestions",
            "Coding Conventions",
            "Performance Optimization",
            "Security Issues",
            "Best Practices",
            "Readability and Maintainability",
            "Code Smells",
            "Educational Tips"
        ];
        
        // Create a new object with all categories
        const updatedData: Record<string, string[]> = {};
        
        // Initialize all categories with empty arrays
        defaultCategories.forEach(category => {
            updatedData[category] = [];
        });
        
        // Copy data from the parsed response
        Object.keys(data).forEach(category => {
            if (defaultCategories.includes(category)) {
                updatedData[category] = data[category];
            }
        });
        
        // Update the feedback data
        this.feedbackData = updatedData;
        this.currentFile = filename;
        this.refresh();
        
        // Log the updated data for debugging
        console.log('Updated feedback data:', this.feedbackData);
    }
    
    getCurrentFile(): string {
        return this.currentFile;
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getFeedbackItems(category: string): string[] | undefined {
        return this.feedbackData[category];
    }

    getFeedbackData(): Record<string, string[]> {
        return this.feedbackData;
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
                
                // Show all feedback items in the details view
                this.showAllFeedbackItems();

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

    // Show all feedback items from all categories
    showAllFeedbackItems() {
        if (this._view) {
            const allCategories = Object.keys(this.treeDataProvider.getFeedbackData());
            const allItems: { category: string; content: string; type: 'error' | 'warning' | 'info' }[] = [];
            
            // Collect items from all categories
            allCategories.forEach(category => {
                const items = this.treeDataProvider.getFeedbackItems(category) || [];
                const type = this.getCategoryType(category);
                
                // Skip empty categories or those with only "No issues found"
                const actualItems = items.filter(item => 
                    !item.toLowerCase().includes('no issues') && 
                    !item.toLowerCase().includes('no problems') &&
                    !item.toLowerCase().includes('✅')
                );
                
                if (actualItems.length > 0) {
                    actualItems.forEach(item => {
                        allItems.push({
                            category,
                            content: item,
                            type
                        });
                    });
                }
            });
            
            // Send all items to the webview
            this._view.webview.postMessage({ 
                command: 'showAllFeedbackItems',
                items: allItems,
                filename: this.treeDataProvider.getCurrentFile()
            });
        }
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
        if (this._view) {
            // If this is a category item (not a specific feedback item)
            if (item.contextValue === 'feedbackCategory') {
                const categoryName = item.label.split(' (')[0];
                const items = this.treeDataProvider.getFeedbackItems(categoryName) || [];
                
                // Filter out "No issues found" messages
                const actualItems = items.filter(item => 
                    !item.toLowerCase().includes('no issues') && 
                    !item.toLowerCase().includes('no problems') &&
                    !item.toLowerCase().includes('✅')
                );
                
                if (actualItems.length > 0) {
                    // Show all items in this category
                    const categoryItems = actualItems.map(content => ({
                        category: categoryName,
                        content,
                        type: this.getCategoryType(categoryName)
                    }));
                    
                    this._view.webview.postMessage({ 
                        command: 'showCategoryItems', 
                        category: categoryName,
                        items: categoryItems
                    });
                } else {
                    // Show empty category message
                    this._view.webview.postMessage({ 
                        command: 'showItemDetails', 
                        category: categoryName,
                        content: 'No issues found in this category.',
                        type: 'info'
                    });
                }
            } 
            // If this is a specific feedback item
            else if (item.content) {
                this._view.webview.postMessage({ 
                    command: 'showItemDetails', 
                    category: item.category || '',
                    content: item.content,
                    type: item.type || 'info'
                });
            }
        }
    }

    private getCategoryType(category: string): 'error' | 'warning' | 'info' {
        if (category === 'Serious Problems') {
            return 'error';
        } else if (category === 'Warnings' || category === 'Security Issues') {
            return 'warning';
        }
        return 'info';
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

            // Ensure the parsed data is valid JSON before saving
            try {
                // Test if the data can be stringified and parsed back
                const jsonString = JSON.stringify(parsedData, null, 2);
                JSON.parse(jsonString); // This will throw if invalid
                
                // Write the file if valid
                fs.writeFileSync(jsonFilePath, jsonString, 'utf-8');
                console.log(`✅ Parsed AI response saved to: ${jsonFilePath}`);
                return jsonFilePath;
            } catch (jsonError) {
                console.error("Error creating valid JSON:", jsonError);
                
                // Attempt to fix the data by cleaning it
                const cleanedData = this.cleanParsedData(parsedData);
                const cleanedJson = JSON.stringify(cleanedData, null, 2);
                
                // Save the cleaned data
                fs.writeFileSync(jsonFilePath, cleanedJson, 'utf-8');
                console.log(`⚠️ Saved cleaned JSON response to: ${jsonFilePath}`);
                return jsonFilePath;
            }
        } catch (error) {
            console.error("Error parsing and saving AI response:", error);
            return null;
        }
    }

    /**
     * Cleans parsed data to ensure it's valid JSON
     */
    private cleanParsedData(data: Record<string, string[]>): Record<string, string[]> {
        const cleanedData: Record<string, string[]> = {};
        
        // Initialize all categories
        const categories = [
            "Serious Problems",
            "Warnings",
            "Refactoring Suggestions",
            "Coding Conventions",
            "Performance Optimization",
            "Security Issues",
            "Best Practices",
            "Readability and Maintainability",
            "Code Smells",
            "Educational Tips"
        ];
        
        categories.forEach(category => {
            cleanedData[category] = [];
        });
        
        // Process each category
        Object.keys(data).forEach(category => {
            // Skip if category is not recognized
            if (!categories.includes(category)) {
                return;
            }
            
            // Process each item in the category
            if (Array.isArray(data[category])) {
                data[category].forEach(item => {
                    // Skip if item is not a string
                    if (typeof item !== 'string') {
                        return;
                    }
                    
                    // Skip empty items
                    if (!item.trim()) {
                        return;
                    }
                    
                    // Add the item to the cleaned data
                    cleanedData[category].push(item);
                });
            }
        });
        
        return cleanedData;
    }

    /**
     * Parses the AI response text into structured JSON
     */
    private parseAIResponse(response: string): Record<string, string[]> {
        // Initialize with all required categories
        const parsedData: Record<string, string[]> = {
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
        
        // Check if response is empty or invalid
        if (!response || response.trim().length === 0) {
            console.warn("Empty AI response received");
            return parsedData;
        }
        
        // First, normalize the response by removing excessive whitespace at the beginning of lines
        // and normalizing line endings to \n
        const normalizedResponse = response
            .replace(/\r\n/g, '\n')  // Normalize Windows line endings
            .replace(/^\s+/gm, '')
            .trim();
        
        // Split the response by main section headers
        const sectionRegex = /####\s+([^\n]+)/g;
        let match;
        let lastIndex = 0;
        const sections: { name: string, content: string }[] = [];
        
        while ((match = sectionRegex.exec(normalizedResponse)) !== null) {
            const headerStart = match.index;
            const headerEnd = match.index + match[0].length;
            const sectionName = match[1].trim();
            
            // If this isn't the first match, extract the content of the previous section
            if (lastIndex > 0) {
                const sectionContent = normalizedResponse.substring(lastIndex, headerStart).trim();
                sections.push({ name: sections[sections.length - 1].name, content: sectionContent });
            }
            
            // Add this section header
            sections.push({ name: sectionName, content: '' });
            lastIndex = headerEnd;
        }
        
        // Add the content for the last section
        if (lastIndex > 0 && lastIndex < normalizedResponse.length) {
            const sectionContent = normalizedResponse.substring(lastIndex).trim();
            sections.push({ name: sections[sections.length - 1].name, content: sectionContent });
            // Remove the duplicate empty section
            sections.splice(sections.length - 2, 1);
        }
        
        // Process each section
        for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            if (!section.content.trim()) continue;
            
            // Skip if category is not recognized
            if (!parsedData.hasOwnProperty(section.name)) continue;
            
            // Handle "No issues found" case
            if (section.content.toLowerCase().includes('no issues found') || 
                section.content.toLowerCase().includes('no problems') ||
                section.content.toLowerCase().includes('✅')) {
                continue; // Skip adding these as they're handled by the UI
            }
            
            // Extract bullet points from the content
            const bulletPoints = this.extractBulletPointsWithCodeBlocks(section.content);
            
            // Add bullet points to the category
            if (bulletPoints.length > 0) {
                parsedData[section.name] = bulletPoints;
            }
        }
        
        // Log the parsed data for debugging
        console.log('Parsed AI response:', parsedData);
        
        return parsedData;
    }
    
    /**
     * Checks if JSON response is completely empty
     */
    private isBlankResponse(parsedJson: Record<string, string[]>): boolean {
        return Object.values(parsedJson).every(arr => arr.length === 0);
    }

    /**
     * Extract bullet points from section content, preserving code blocks
     */
    private extractBulletPointsWithCodeBlocks(content: string): string[] {
        const bulletPoints: string[] = [];
        
        // Check if content is empty
        if (!content.trim()) return bulletPoints;
        
        // Split content into lines for processing
        const lines = content.split('\n');
        let currentBullet: string | null = null;
        let inCodeBlock = false;
        let currentCodeBlock = '';
        
        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for code block markers
            if (line.startsWith('```')) {
                inCodeBlock = !inCodeBlock;
                
                // Add the code block marker to the current bullet
                if (currentBullet !== null) {
                    currentBullet += '\n' + line;
                    
                    // If we're closing a code block, add any accumulated code
                    if (!inCodeBlock && currentCodeBlock) {
                        currentCodeBlock = '';
                    }
                }
                continue;
            }
            
            // If we're in a code block, add the line to the current bullet
            if (inCodeBlock) {
                currentCodeBlock += line + '\n';
                if (currentBullet !== null) {
                    currentBullet += '\n' + line;
                }
                continue;
            }
            
            // Check for bullet points (numbered or with symbols)
            const bulletMatch = line.match(/^(\d+\.|[-*•])\s+(.+)$/);
            
            if (bulletMatch) {
                // If we already have a bullet point, add it to the list
                if (currentBullet !== null) {
                    bulletPoints.push(currentBullet);
                }
                
                // Start a new bullet point
                currentBullet = bulletMatch[2];
            } else if (currentBullet !== null && line) {
                // Continue the current bullet point
                currentBullet += '\n' + line;
            }
        }
        
        // Add the last bullet point if there is one
        if (currentBullet !== null) {
            bulletPoints.push(currentBullet);
        }
        
        return bulletPoints;
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
