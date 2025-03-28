import * as vscode from 'vscode';
import { getAIResponse, generateReport, convertMarkdownToPdf } from './ai';
import * as fs from 'fs';
import * as path from 'path';

const MAX_RETRIES = 3; // Avoid infinite loops

// Constants
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.cpp', '.c', '.java', '.py', '.cs', '.json', '.html', '.css', '.md'];
const DEFAULT_CATEGORIES = [
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
        
// Helper functions
function getShortFileName(filePath: string): string {
    return filePath.split(/[\\/]/).pop() || 'Unknown File';
}

function getFileExtension(filePath: string): string {
    return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
}

function getCategoryType(category: string): 'error' | 'warning' | 'info' {
        if (category === 'Serious Problems') {
            return 'error';
        } else if (category === 'Warnings' || category === 'Security Issues') {
            return 'warning';
        }
        return 'info';
    }

function extractBulletPointsWithCodeBlocks(content: string): string[] {
        const bulletPoints: string[] = [];
        
        // Check if content is empty
        if (!content.trim()) {return bulletPoints;}
        
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

function parseAIResponse(response: string): Record<string, string[]> {
    // Initialize with all required categories
    const parsedData: Record<string, string[]> = {};
    DEFAULT_CATEGORIES.forEach(category => {
        parsedData[category] = [];
    });
    
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
        if (!section.content.trim()) {continue;}
        
        // Skip if category is not recognized
        if (!parsedData.hasOwnProperty(section.name)) {continue;}
        
        // Handle "No issues found" case
        if (section.content.toLowerCase().includes('no issues found') || 
            section.content.toLowerCase().includes('no problems') ||
            section.content.toLowerCase().includes('✅')) {
            continue; // Skip adding these as they're handled by the UI
        }
        
        // Extract bullet points from the content
        const bulletPoints = extractBulletPointsWithCodeBlocks(section.content);
        
        // Add bullet points to the category
        if (bulletPoints.length > 0) {
            parsedData[section.name] = bulletPoints;
        }
    }
    
    // Log the parsed data for debugging
    console.log('Parsed AI response:', parsedData);
    
    return parsedData;
}

function saveParsedResponse(responseFilePath: string): string | null {
    const jsonResponsesDir = path.resolve(__dirname, '../jsonresponses');
    if (!fs.existsSync(jsonResponsesDir)) {
        fs.mkdirSync(jsonResponsesDir, { recursive: true });
    }

    try {
        const rawResponse = fs.readFileSync(responseFilePath, 'utf-8');
        const parsedData = parseAIResponse(rawResponse);

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
            const cleanedData = cleanParsedData(parsedData);
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

function cleanParsedData(data: Record<string, string[]>): Record<string, string[]> {
    const cleanedData: Record<string, string[]> = {};
    
    // Initialize all categories
    DEFAULT_CATEGORIES.forEach(category => {
        cleanedData[category] = [];
    });
    
    // Process each category
    Object.keys(data).forEach(category => {
        // Skip if category is not recognized
        if (!DEFAULT_CATEGORIES.includes(category)) {
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

function isBlankResponse(parsedJson: Record<string, string[]>): boolean {
    return Object.values(parsedJson).every(arr => arr.length === 0);
}

function getWebviewHtml(context: vscode.ExtensionContext, webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "out", "webview.js")
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
    
    private feedbackData: Record<string, string[]> = {};
    private currentFile: string = 'No file selected';
    
    constructor() {
        // Initialize all categories with empty arrays
        this.resetFeedbackData();
    }
    
    private resetFeedbackData() {
        this.feedbackData = {};
        DEFAULT_CATEGORIES.forEach(category => {
            this.feedbackData[category] = [];
        });
    }
    
    getTreeItem(element: FeedbackItem): vscode.TreeItem {
        return element;
    }
    
    getChildren(element?: FeedbackItem): Thenable<FeedbackItem[]> {
        if (!element) {
            // Root level - return categories
            return Promise.resolve(this.getCategoryItems());
        } else {
            // Category level - return feedback items
            return Promise.resolve(this.getFeedbackItemsForCategory(element));
        }
    }
    
    private getCategoryItems(): FeedbackItem[] {
        return Object.keys(this.feedbackData).map(category => {
            // Get items for this category
            const items = this.feedbackData[category] || [];
            
            // Filter out "No issues found" messages to get actual issue count
            const actualIssueCount = this.getActualIssueCount(items);
            
            const label = `${category} (${actualIssueCount})`;
            const state = items.length > 0 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None;
            
            return new FeedbackItem(label, state);
        });
    }
    
    private getFeedbackItemsForCategory(element: FeedbackItem): FeedbackItem[] {
        const categoryName = element.label.split(' (')[0];
        const items = this.feedbackData[categoryName] || [];
        
        return items.map(item => {
            // Determine item type based on category
            const type = getCategoryType(categoryName);
            
            return new FeedbackItem(
                item.length > 50 ? item.substring(0, 50) + '...' : item,
                vscode.TreeItemCollapsibleState.None,
                categoryName,
                item,
                type
            );
        });
    }
    
    private getActualIssueCount(items: string[]): number {
        return items.filter(item => 
            !item.toLowerCase().includes('no issues') && 
            !item.toLowerCase().includes('no problems') &&
            !item.toLowerCase().includes('✅')
        ).length;
    }
    
    updateFeedback(data: Record<string, string[]>, filename: string) {
        // Create a new object with all categories
        const updatedData: Record<string, string[]> = {};
        
        // Initialize all categories with empty arrays
        DEFAULT_CATEGORIES.forEach(category => {
            updatedData[category] = [];
        });
        
        // Copy data from the parsed response
        Object.keys(data).forEach(category => {
            if (DEFAULT_CATEGORIES.includes(category)) {
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
    private readonly supportedExtensions = SUPPORTED_EXTENSIONS;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly treeDataProvider: FeedbackTreeDataProvider
    ) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = getWebviewHtml(this.context, webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log("Received message from webview:", message);
            
            if (message.command === 'getAIAnalysis') {
                await this.handleAIAnalysis();
            } else if (message.command === 'generatePDFReport') {
                console.log("generatePDFReport command received from webview");
                await this.handlePDFReport();
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
        const extension = getFileExtension(fileName);

        if (!SUPPORTED_EXTENSIONS.includes(extension)) {
            vscode.window.showWarningMessage(`Unsupported file type: ${extension}`);
            this.postMessage(getShortFileName(fileName), `File type (${extension}) is not supported.`);
            return;
        }

        await this.analyzeFileContent(activeEditor, fileName, retryCount);
    }

    private async analyzeFileContent(editor: vscode.TextEditor, fileName: string, retryCount: number) {
        const fileContent = editor.document.getText();
        const truncatedContent = this.truncateContent(fileContent);
        const prompt = `Review the following code:\n\n${truncatedContent}`;

        // Show progress indicator
        await vscode.window.withProgress({
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
            const jsonFilePath = saveParsedResponse(responseFilePath);
            if (!jsonFilePath) {
                vscode.window.showErrorMessage("Error processing AI response.");
                return;
            }
            
            progress.report({ increment: 90 });
            
            // Process the JSON response
            await this.processJsonResponse(jsonFilePath, fileName, retryCount);
            
            progress.report({ increment: 100 });
        });
    }

    private truncateContent(content: string): string {
        const maxLength = 2048;
        if (content.length > maxLength) {
            return content.slice(0, maxLength) + '\n\n[Content truncated due to length]';
        }
        return content;
    }

    private async processJsonResponse(jsonFilePath: string, fileName: string, retryCount: number) {
        try {
            const responseJson = fs.readFileSync(jsonFilePath, 'utf-8');
            const parsedJson = JSON.parse(responseJson);

            // If JSON is blank, retry querying the AI
            if (isBlankResponse(parsedJson)) {
                if (retryCount < MAX_RETRIES) {
                    console.warn(`⚠️ Blank AI response detected. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                    await this.handleAIAnalysis(retryCount + 1);
                    return;
                } else {
                    vscode.window.showErrorMessage("AI returned an empty response multiple times. Please try again later.");
                }
            }
            
            // Update tree view with feedback data
            this.treeDataProvider.updateFeedback(parsedJson, getShortFileName(fileName));
            
            // Show all feedback items in the details view
            this.showAllFeedbackItems();
            
            // Post AI response to webview
            this.postMessage(getShortFileName(fileName), responseJson);
            
        } catch (error) {
            vscode.window.showErrorMessage("Error reading JSON response file.");
            console.error("Error reading JSON file:", error);
        }
    }

    // Show all feedback items from all categories
    showAllFeedbackItems() {
        if (!this._view) {return;}
        
        const allCategories = Object.keys(this.treeDataProvider.getFeedbackData());
        const allItems: { category: string; content: string; type: 'error' | 'warning' | 'info' }[] = [];
        
        // Collect items from all categories
        this.collectFeedbackItems(allCategories, allItems);
        
        // Send all items to the webview
        this._view.webview.postMessage({ 
            command: 'showAllFeedbackItems',
            items: allItems,
            filename: this.treeDataProvider.getCurrentFile()
        });
    }

    private collectFeedbackItems(
        categories: string[], 
        result: { category: string; content: string; type: 'error' | 'warning' | 'info' }[]
    ) {
        categories.forEach(category => {
            const items = this.treeDataProvider.getFeedbackItems(category) || [];
            const type = getCategoryType(category);
            
            // Skip empty categories or those with only "No issues found"
            const actualItems = items.filter(item => 
                !item.toLowerCase().includes('no issues') && 
                !item.toLowerCase().includes('no problems') &&
                !item.toLowerCase().includes('✅')
            );
            
            if (actualItems.length > 0) {
                actualItems.forEach(item => {
                    result.push({
                        category,
                        content: item,
                        type
                    });
                });
            }
        });
    }

    getView() {
        return this._view;
    }

    updateTargetFile(filePath: string) {
        const shortName = getShortFileName(filePath);
        if (this._view) {
            this.postMessage(shortName, `Target file updated to: ${shortName}`);
        }
    }
    
    showItemDetails(item: FeedbackItem) {
        if (!this._view) {return;}
        
        // If this is a category item (not a specific feedback item)
        if (item.contextValue === 'feedbackCategory') {
            this.showCategoryItems(item);
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

    private showCategoryItems(item: FeedbackItem) {
        if (!this._view) {return;}
        
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
                type: getCategoryType(categoryName)
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

    private postMessage(filename: string, response: string) {
        this._view?.webview.postMessage({ command: 'displayFileInfo', filename, response });
    }

    async handlePDFReport() {
        console.log("handlePDFReport called");
        
        // Check view state
        if (!this._view) {
            console.error("View is not available");
            vscode.window.showErrorMessage("Unable to display report progress. Please try again.");
            return;
        }
        
        // Check if there's an active editor
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            console.log("No active editor found");
            vscode.window.showErrorMessage('No active editor found.');
            this.postProgressMessage('error', 'No file selected', 'Please open a file to analyze.');
            return;
        }

        const fileName = activeEditor.document.fileName;
        const extension = getFileExtension(fileName);

        // Check if file extension is supported
        if (!this.supportedExtensions.includes(extension)) {
            console.log(`Unsupported file type: ${extension}`);
            vscode.window.showWarningMessage(`Unsupported file type: ${extension}`);
            this.postProgressMessage('error', `File type (${extension}) not supported`, 'Please open a supported file type.');
            return;
        }

        const fileContent = activeEditor.document.getText();
        const shortFileName = getShortFileName(fileName);
        console.log(`Processing file: ${shortFileName}`);

        // Show progress indicator with multiple steps
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating report for ${shortFileName}`,
            cancellable: false
        }, async (progress) => {
            // Step 1: Initialize
            progress.report({ 
                increment: 0, 
                message: "Starting report generation..." 
            });
            
            // Update webview with initial progress
            this.postProgressMessage('loading', 'Initializing', 'Preparing to generate report...');
            await this.delay(500); // Brief delay for UI update
            
            // Step 2: Generate AI content
            progress.report({ 
                increment: 10, 
                message: "Analyzing code with GPT-4o..." 
            });
            
            this.postProgressMessage('loading', 'AI Analysis', 'Analyzing code with GPT-4o...');
            
            // Get the markdown response
            const markdownFilePath = await generateReport(fileContent);
            
            if (!markdownFilePath) {
                vscode.window.showErrorMessage("Error generating AI report content.");
                this.postProgressMessage('error', 'AI Analysis Failed', 'Could not generate report content.');
                await this.delay(3000); // Show error for 3 seconds
                this.postProgressMessage('idle');
                return;
            }
            
            // Step 3: Convert to PDF
            progress.report({ 
                increment: 60, 
                message: "Converting to PDF format..." 
            });
            
            this.postProgressMessage('loading', 'PDF Conversion', 'Converting markdown to PDF (this may take a moment)...');
            
            try {
                // Convert markdown to PDF
                console.log(`Attempting to convert ${markdownFilePath} to HTML`);
                const convertedFilePath = await convertMarkdownToPdf(markdownFilePath);
                
                // Step 4: Finalize
                progress.report({ 
                    increment: 30, 
                    message: "Finalizing report..." 
                });
                
                // Check if the file exists
                if (!fs.existsSync(convertedFilePath)) {
                    throw new Error('Failed to create report file');
                }
                
                // Check what type of file was created
                const isHtml = convertedFilePath.toLowerCase().endsWith('.html');
                const isPdf = convertedFilePath.toLowerCase().endsWith('.pdf');
                const isMd = convertedFilePath.toLowerCase().endsWith('.md');
                
                // Open the appropriate file
                const fileUri = vscode.Uri.file(convertedFilePath);
                await vscode.commands.executeCommand('vscode.open', fileUri);
                
                if (isHtml) {
                    // HTML report created
                    vscode.window.showInformationMessage(`HTML report for ${shortFileName} generated successfully.`);
                    this.postProgressMessage(
                        'success', 
                        'Report Complete', 
                        `HTML report generated and opened in a new tab.`
                    );
                } else if (isPdf) {
                    // PDF report created
                    vscode.window.showInformationMessage(`PDF report for ${shortFileName} generated successfully.`);
                    this.postProgressMessage(
                        'success', 
                        'Report Complete', 
                        `PDF report generated and opened in a new tab.`
                    );
                } else {
                    // Markdown fallback
                    vscode.window.showWarningMessage(`Enhanced report creation used markdown fallback for ${shortFileName}.`);
                    this.postProgressMessage(
                        'success', 
                        'Report Created (Markdown)', 
                        `Enhanced report was created in markdown format and opened.`
                    );
                }
                
                // Show message for a few seconds, then return to default view
                await this.delay(3000);
                this.postProgressMessage('idle');
            } catch (error) {
                console.error("PDF conversion error:", error);
                vscode.window.showErrorMessage(`Error creating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.postProgressMessage('error', 'PDF Creation Failed', 'Could not convert to PDF format.');
                await this.delay(3000); // Show error for 3 seconds
                this.postProgressMessage('idle');
            }
        });
    }
    
    /**
     * Post a progress message to the webview
     */
    private postProgressMessage(
        state: 'loading' | 'error' | 'success' | 'idle',
        title?: string,
        message?: string
    ) {
        if (!this._view) {return;}
        
        this._view.webview.postMessage({
            command: 'reportProgress',
            state,
            title,
            message
        });
    }
    
    /**
     * Helper function to create a delay
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

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

    // Register command for PDF report
    context.subscriptions.push(
        vscode.commands.registerCommand('aiCodingAssistant.generatePDFReport', async () => {
            console.log("PDF report command triggered");
            if (!webviewProvider) {
                console.error("Webview provider not initialized");
                vscode.window.showErrorMessage("AI Assistant not properly initialized");
                return;
            }
            await webviewProvider.handlePDFReport();
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
