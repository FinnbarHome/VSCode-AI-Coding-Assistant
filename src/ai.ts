import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

// ==============================
// Configuration and Environment
// ==============================

/**
 * Manages environment configuration and OpenAI API setup
 */
class ApiConfig {
    private static instance: ApiConfig;
    public readonly apiKey: string;
    public readonly openai: OpenAI;
    public readonly responsesDir: string;

    private constructor() {
        this.apiKey = this.loadApiKey();
        this.openai = new OpenAI({ apiKey: this.apiKey });
        this.responsesDir = this.initializeResponsesDirectory();
    }

    /**
     * Loads API key from environment variables
     */
    private loadApiKey(): string {
        dotenv.config({ path: path.resolve(__dirname, '../.env') });
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("❌ OpenAI API Key is missing! Check your .env file.");
            throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
        }

        return apiKey;
    }

    /**
     * Creates and initializes the responses directory
     */
    private initializeResponsesDirectory(): string {
        const dir = path.resolve(__dirname, '../responses');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Gets the singleton instance of ApiConfig
     */
    public static getInstance(): ApiConfig {
        if (!ApiConfig.instance) {
            ApiConfig.instance = new ApiConfig();
        }
        return ApiConfig.instance;
    }
}

// Create a singleton instance of ApiConfig
const config = ApiConfig.getInstance();

// ==============================
// File Management Utilities
// ==============================

/**
 * Manages all file operations for saving AI responses
 */
class FileManager {
    /**
     * Generates a timestamped filename in the responses directory
     */
    public static getTimestampedFilename(prefix = 'response', extension = '.txt'): string {
        const now = new Date();
        const timestamp = now.toISOString().replace(/:/g, '-'); // Ensures filename is valid
        return path.join(config.responsesDir, `${prefix}-${timestamp}${extension}`);
    }

    /**
     * Saves content to a file and returns the file path
     */
    public static saveToFile(content: string, filePath: string): string {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return filePath;
        } catch (error) {
            console.error(`Error saving to file: ${error}`);
            throw error;
        }
    }

    /**
     * Saves AI response with a timestamp and returns the file path
     */
    public static saveResponseToFile(content: string, prefix = 'response', extension = '.txt'): string {
        const filePath = this.getTimestampedFilename(prefix, extension);
        return this.saveToFile(content, filePath);
    }
}

// ==============================
// AI Request Utilities
// ==============================

/**
 * Provides templates for AI system prompts
 */
class PromptTemplates {
    /**
     * Creates the system message for standard code review
     */
    public static createCodeReviewPrompt(): string {
        return `You are a strict AI code reviewer. Your response **must be structured into exactly 10 sections** using the format below:

            #### Serious Problems
            (List problems here, or write "No issues found.")

            #### Warnings
            (List warnings here, or write "No issues found.")

            #### Refactoring Suggestions
            (List suggestions here, or write "No issues found.")

            #### Coding Conventions
            (List convention violations here, or write "No issues found.")

            #### Performance Optimization
            (List optimizations here, or write "No issues found.")

            #### Security Issues
            (List security concerns here, or write "No issues found.")

            #### Best Practices
            (List best practices here, or write "No issues found.")

            #### Readability and Maintainability
            (List readability concerns here, or write "No issues found.")

            #### Code Smells
            (List code smells here, or write "No issues found.")

            #### Educational Tips
            (Provide useful coding tips, or write "No issues found.")

            - ❌ Do **not** add introductions, summaries, or extra text.
            - ❌ Do **not** create additional sections.
            - ✅ Format all section headers exactly as shown (**#### Category Name**).
            - ✅ For suggestions that would benefit from code examples, include them in a code block using \`\`\`language
            - ✅ Include code snippets when they would be helpful
            - ✅ Keep code snippets concise and focused on the specific issue
            - ✅ Use appropriate language tags in code blocks (e.g., \`\`\`typescript, \`\`\`javascript, etc.)`;
    }

    /**
     * Creates the system message for comprehensive reports
     */
    public static createReportPrompt(): string {
        return `You are a senior code reviewer creating a comprehensive, formal code analysis report.
    Your analysis should be extremely thorough, professional, and educational - suitable for enterprise documentation.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    1. Make your response as COMPREHENSIVE and DETAILED as possible within model limits
    2. Provide specific, actionable insights with concrete examples
    3. Include a numerical score (0-10) for EACH section in the exact format "SectionName score: X/10"
    4. Use a consistent structure EXACTLY matching the template below
    5. Format all section headers as "## Section Name" (h2 level)
    6. Format all subsection headers as "### Subsection Name" (h3 level)
    7. DO NOT add any introduction, conclusion, or ANY text outside the 10 sections
    8. DO NOT include phrases like "Here is my analysis" or "This report outlines"
    9. DO NOT add horizontal lines (---) or any other separators
    10. Start IMMEDIATELY with section 1 (Executive Summary)
    11. End IMMEDIATELY after section 10 (Learning Resources)
    
    LIST FORMATTING REQUIREMENTS:
    - ONLY use bullet points (lines starting with * or -) for actual list items
    - Main points within each section should be regular paragraphs, NOT bullet points
    - Use bullet lists only for enumerated findings, benefits, or examples
    - Within each section, include up to 3-4 bullet points maximum for key items
    - DO NOT make every line a bullet point
    
    CODE EXAMPLES:
    - Always include language identifier in code blocks: \`\`\`javascript, \`\`\`typescript, etc.
    - Use actual code for examples, not pseudocode
    - Make sure "Before" and "After" code examples have the exact same indentation style
    - Keep code examples concise (5-15 lines) and focused on the specific issue
    - ALWAYS use SEPARATE code blocks for "Before" and "After" examples, never combine them
    - Label code examples with separate headings: "### Before Example" and "### After Example"
    
    CONTENT REQUIREMENTS:
    - Provide thorough explanations in paragraph form for each section
    - Break down complex concepts for educational value
    - Include both positive findings and areas for improvement
    - Justify all scores with detailed reasoning
    
    EXACTLY FOLLOW THIS REPORT STRUCTURE:
    
    ## Executive Summary
    A paragraph overview of code quality and key findings.
    
    Overall quality score: X/10
    
    * Top strength 1
    * Top strength 2
    * Top strength 3
    
    * Area for improvement 1
    * Area for improvement 2
    * Area for improvement 3
    
    ## Code Architecture and Design
    A paragraph analyzing overall architecture.
    
    A paragraph on component relationships.
    
    Design patterns used or missing, with explanation.
    
    Architectural score: X/10
    
    ## Critical Issues
    A paragraph discussing high-priority issues.
    
    * Critical issue 1
    * Critical issue 2
    * Critical issue 3
    
    Critical issues score: X/10
    
    ## Code Quality Assessment
    A paragraph on code readability and consistency.
    
    A paragraph on complexity and formatting issues.
    
    Quality score: X/10
    
    ## Performance Analysis
    A paragraph describing potential bottlenecks and optimization opportunities.
    
    Resource usage concerns.
    
    Performance score: X/10
    
    ## Security Review
    A paragraph covering security vulnerabilities.
    
    Data handling and input validation issues.
    
    Security score: X/10
    
    ## Maintainability Assessment
    A paragraph on code duplication and documentation quality.
    
    Testing coverage/quality.
    
    Maintainability score: X/10
    
    ## Recommended Refactoring
    A paragraph prioritizing refactoring suggestions.
    
    ### Before Example
    \`\`\`language
    // Before code
    \`\`\`
    
    ### After Example
    \`\`\`language
    // After code
    \`\`\`
    
    Expected benefits of refactoring.
    
    Refactoring impact score: X/10
    
    ## Best Practices Implementation
    A paragraph discussing language-specific best practices.
    
    Industry standard adherence and framework usage optimization.
    
    Best practices score: X/10
    
    ## Learning Resources
    A paragraph introducing the resources.
    
    * Resource 1: [Description and why it's valuable]
    * Resource 2: [Description and why it's valuable]
    * Resource 3: [Description and why it's valuable]
    
    Remember: DO NOT add ANY text before section 1 or after section 10. Start and end exactly with the defined sections.
    DO NOT add stars, asterisks, or bullet points to the section headers themselves. Format them EXACTLY as "## Section Name".`;
    }
}

/**
 * Handles error and timeout fallback responses
 */
class FallbackResponses {
    /**
     * Creates a standard fallback response for timeout scenarios
     */
    public static createTimeoutResponse(): string {
        return "#### Serious Problems\nRequest timed out. Please try again with a smaller code sample.\n\n" +
               "#### Warnings\nNo issues found.\n\n" +
               "#### Refactoring Suggestions\nNo issues found.\n\n" +
               "#### Coding Conventions\nNo issues found.\n\n" +
               "#### Performance Optimization\nNo issues found.\n\n" +
               "#### Security Issues\nNo issues found.\n\n" +
               "#### Best Practices\nNo issues found.\n\n" +
               "#### Readability and Maintainability\nNo issues found.\n\n" +
               "#### Code Smells\nNo issues found.\n\n" +
               "#### Educational Tips\nTry submitting smaller code samples for better performance.";
    }

    /**
     * Creates a comprehensive report fallback response for timeout scenarios
     */
    public static createReportTimeoutResponse(): string {
        return "# Report Generation Timed Out\n\nThe report generation process took too long and timed out. This might be due to high server load or complexity of the code. Please try again later with a smaller code sample.";
    }

    /**
     * Handles API request timeout by generating and saving a fallback response
     */
    public static async handleTimeout(error: any, isReport = false): Promise<string> {
        console.error(`AI response failed: ${error.message}`);
        
        if (error.message && error.message.includes('timed out')) {
            const fallbackContent = isReport 
                ? this.createReportTimeoutResponse() 
                : this.createTimeoutResponse();
            
            // Generate appropriate file name for the fallback response
            const prefix = isReport ? 'report-response-timeout' : 'response-timeout';
            const extension = isReport ? '.md' : '.txt';
            const fileName = FileManager.getTimestampedFilename(prefix, extension);
            
            // Save the fallback response
            FileManager.saveToFile(fallbackContent, fileName);
            console.log(`⚠️ Request timed out. Fallback response saved to: ${fileName}`);
            
            return fileName;
        }
        
        throw error;
    }
}

/**
 * Manages requests to the OpenAI API
 */
class OpenAIService {
    /**
     * Truncates content if it exceeds maximum length
     */
    private static truncateContent(content: string, maxLength: number): string {
        if (content.length <= maxLength) {
            return content;
        }
        return content.slice(0, maxLength) + '\n\n[Content truncated due to length]';
    }

    /**
     * Sends a request to OpenAI API with timeout handling
     */
    public static async requestCompletion(prompt: string, isReport = false): Promise<string> {
        // Choose model and parameters based on the task
        const model = isReport ? "gpt-4o" : "gpt-4o-mini";
        const maxLength = isReport ? 16384 : 8192;
        const timeoutMs = isReport ? 40000 : 25000;
        
        const truncatedPrompt = this.truncateContent(prompt, maxLength);
        const systemMessage = isReport 
            ? PromptTemplates.createReportPrompt() 
            : PromptTemplates.createCodeReviewPrompt();
            
        const fullPrompt = isReport 
            ? `Create a comprehensive code review report for the following code:\n\n${truncatedPrompt}`
            : `Review the following code:\n\n${truncatedPrompt}`;
        
        // Add a timeout for the API call
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
        });

        // Create the API completion promise
        const completionPromise = config.openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: fullPrompt },
            ]
        });

        try {
            // Race the promises to handle timeouts
            const completion = await Promise.race([completionPromise, timeoutPromise]);
            
            if (!completion) {
                throw new Error('No response received from AI service');
            }

            return completion.choices?.[0]?.message?.content ?? "No response from AI.";
        } catch (error: any) {
            // Handle timeouts and other errors
            return FallbackResponses.handleTimeout(error, isReport);
        }
    }
}

// ==============================
// Main Export Functions
// ==============================

/**
 * Gets an AI code review response for the provided code, saves it to file, and returns the file path
 */
export async function getAIResponse(prompt: string): Promise<string> {
    try {
        // If the content is empty, return empty response
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service');
            return '';
        }
        
        // Get response from AI
        const response = await OpenAIService.requestCompletion(prompt, false);
        
        // If the response is a file path (from timeout handling), return it
        if (response.startsWith(config.responsesDir)) {
            return response;
        }
        
        // Otherwise, save the response to a file
        const fileName = FileManager.getTimestampedFilename();
        FileManager.saveToFile(response.trim(), fileName);
        console.log(`✅ AI response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error with OpenAI API: ${error}`);
        return "";
    }
}

/**
 * Generates a comprehensive report using GPT-4o and saves it to a markdown file
 */
export async function generateReport(prompt: string): Promise<string> {
    try {
        // If the content is empty, return empty response
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service for report');
            return '';
        }
        
        // Get report response from AI
        const response = await OpenAIService.requestCompletion(prompt, true);
        
        // If the response is a file path (from timeout handling), return it
        if (response.startsWith(config.responsesDir)) {
            return response;
        }
        
        // Otherwise, save the response to a report file
        const fileName = FileManager.getTimestampedFilename('report-response', '.md');
        FileManager.saveToFile(response.trim(), fileName);
        console.log(`📝 Report response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error generating report: ${error}`);
        return "";
    }
}

// ==============================
// HTML Conversion Functions
// ==============================

/**
 * Handles conversion of markdown reports to formatted HTML
 */
class MarkdownConverter {
    /**
     * Cleans up any text outside the main sections
     */
    public static cleanupExtraText(content: string): string {
        // Extract the content between the first and last heading sections
        const firstHeadingMatch = content.match(/^#+\s+.*$/m);
        const lastHeadingMatch = content.match(/^#+\s+.*$(?![\s\S]*^#+\s+)/m);
        
        if (firstHeadingMatch && lastHeadingMatch) {
            const firstHeadingIndex = content.indexOf(firstHeadingMatch[0]);
            const lastHeadingContent = lastHeadingMatch[0];
            const lastSectionContent = content.substring(content.indexOf(lastHeadingContent));
            
            // Find the end of the last section
            const sections = lastSectionContent.split(/^#+\s+/m);
            if (sections.length > 0) {
                // Return just the content from first heading to the end of the last section
                return content.substring(firstHeadingIndex);
            }
        }
        
        return content; // Return original if we couldn't find the pattern
    }

    /**
     * Extracts code blocks and replaces them with placeholders
     */
    public static extractCodeBlocks(content: string): { processedContent: string, codeBlocks: {[key: string]: string} } {
        let codeBlocks: {[key: string]: string} = {};
        let codeBlockCounter = 0;
        
        // Replace code blocks with placeholders to preserve them during conversion
        const processedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${codeBlockCounter}`;
            
            const language = lang || 'text';
            const lines = code.trim().split('\n');
            let lineNumbers = '';
            let codeContent = '';
            
            // Generate line numbers and code content
            lines.forEach((line: string, index: number) => {
                const lineNum = index + 1;
                lineNumbers += `<span class="line-number">${lineNum}</span>\n`;
                codeContent += `<span class="code-line">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>\n`;
            });
            
            const codeBlockHtml = `
<div class="code-block-wrapper">
    <div class="code-header">
        <span class="code-language">${language.toUpperCase() || 'TEXT'}</span>
        <span class="copy-btn" data-clipboard-target="#code-${Date.now()}-${Math.floor(Math.random() * 1000)}">Copy</span>
    </div>
    <pre class="language-${language}"><div class="line-numbers">${lineNumbers}</div><code id="code-${Date.now()}-${Math.floor(Math.random() * 1000)}">${codeContent}</code></pre>
</div>`;
            
            codeBlocks[placeholder] = codeBlockHtml;
            codeBlockCounter++;
            return placeholder;
        });
        
        console.log(`Extracted ${codeBlockCounter} code blocks from markdown`);
        
        return { processedContent, codeBlocks };
    }

    /**
     * Converts markdown headers to HTML
     */
    public static convertHeaders(content: string): string {
        return content
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h2>$1</h2>') // Convert ### to h2 instead of h3
            .replace(/^#### (.*$)/gm, '<h3>$1</h3>') // Adjust remaining header levels
            .replace(/^##### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^###### (.*$)/gm, '<h5>$1</h5>');
    }

    /**
     * Converts markdown formatting (bold, italic) to HTML
     */
    public static convertFormatting(content: string): string {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    }

    /**
     * Converts markdown inline code to HTML
     */
    public static convertInlineCode(content: string): string {
        return content.replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    /**
     * Converts markdown lists to HTML
     */
    public static convertLists(content: string): string {
        let inList = false;
        let listContent = '';
        let htmlContentArray = [];
        
        content.split('\n').forEach(line => {
            // Check if this is an actual list item (starts with * or -)
            if (line.match(/^\s*[\*\-]\s+(.*)$/)) {
                // List item found
                if (!inList) {
                    inList = true;
                    listContent = '<ul>\n';
                }
                
                // Extract the content part (removing the bullet)
                const content = line.replace(/^\s*[\*\-]\s+(.*)$/, '$1');
                // Don't wrap list content in paragraph tags
                listContent += `<li>${content}</li>\n`;
            } else {
                // Not a list item
                if (inList) {
                    // End the current list
                    listContent += '</ul>';
                    htmlContentArray.push(listContent);
                    inList = false;
                }
                htmlContentArray.push(line);
            }
        });
        
        // Close any open list
        if (inList) {
            listContent += '</ul>';
            htmlContentArray.push(listContent);
        }
        
        return htmlContentArray.join('\n');
    }

    /**
     * Wraps non-HTML, non-placeholder text in paragraph tags
     */
    public static convertParagraphs(content: string): string {
        const paragraphProcessedLines = content.split('\n');
        const processedLines = [];
        
        // Process line by line to better handle code blocks
        for (let i = 0; i < paragraphProcessedLines.length; i++) {
            const line = paragraphProcessedLines[i];
            
            // Check if this line contains a code block placeholder
            if (line.includes('CODE_BLOCK_PLACEHOLDER')) {
                processedLines.push(line);
                continue;
            }
            
            // Skip empty lines
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            
            // Skip lines that already start with HTML
            if (line.trim().startsWith('<')) {
                processedLines.push(line);
                continue;
            }
            
            // Wrap non-HTML, non-placeholder lines in paragraph tags
            processedLines.push(`<p>${line}</p>`);
        }
        
        return processedLines.join('\n');
    }

    /**
     * Formats numbered list items that are outside ordered lists
     */
    public static formatNumberedItems(content: string): string {
        return content.replace(
            /<p>\s*(\d+)\.\s+(.*?)<\/p>/g,
            '<p class="numbered-item"><span class="item-number">$1.</span> $2</p>'
        );
    }

    /**
     * Restores code blocks from their placeholders
     */
    public static restoreCodeBlocks(content: string, codeBlocks: {[key: string]: string}, codeBlockCounter: number): string {
        let processedContent = content;
        
        // Debug logging to help diagnose placeholder issues
        console.log(`Starting to restore ${Object.keys(codeBlocks).length} code blocks`);
        
        // First check for specific patterns in sections with code blocks
        const h2BeforeRefactoringRegex = /<h2>.*?Before Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2BeforeRefactoringRegex, (match, placeholderNum) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${placeholderNum}`;
            if (codeBlocks[placeholder]) {
                console.log(`Replaced "Before Refactoring" pattern for placeholder ${placeholderNum}`);
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });

        const h2AfterRefactoringRegex = /<h2>.*?After Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2AfterRefactoringRegex, (match, placeholderNum) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${placeholderNum}`;
            if (codeBlocks[placeholder]) {
                console.log(`Replaced "After Refactoring" pattern for placeholder ${placeholderNum}`);
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });

        // Use a pattern matching approach with variations for each placeholder
        for (let i = 0; i < codeBlockCounter; i++) {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${i}`;
            
            // Create variations of the pattern we've seen in the wild
            const variations = [
                placeholder,
                `<p>${placeholder}</p>`,
                `<p>  ${placeholder}</p>`,
                `<p>${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                `<p>  ${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                `<p>CODE<em>BLOCK</em>PLACEHOLDER_${i}</p>`,
                `CODE<em>BLOCK</em>PLACEHOLDER_${i}`,
                `<p>CODE_BLOCK<em>PLACEHOLDER</em>_${i}</p>`,
                `<p>CODE<em>_</em>BLOCK<em>_</em>PLACEHOLDER_${i}</p>`,
            ];
            
            // Try each variation for the placeholder
            variations.forEach(pattern => {
                if (processedContent.includes(pattern)) {
                    console.log(`Found and replacing pattern: ${pattern}`);
                    processedContent = processedContent.replace(pattern, codeBlocks[placeholder]);
                }
            });
            
            // Last resort: flexible regex to match any form with the same placeholder number
            const flexRegex = new RegExp(`<p>(?:CODE)?(?:<em>)?[_]?(?:</em>)?(?:BLOCK)?(?:<em>)?[_]?(?:</em>)?PLACEHOLDER_${i}(?:\\s*|<em>.*?</em>|.*?)</p>`, 'g');
            processedContent = processedContent.replace(flexRegex, codeBlocks[placeholder]);
        }
        
        return processedContent;
    }

    /**
     * Reads and prepares template HTML, handling fallback if not found
     */
    public static getTemplateHtml(): string {
        const templatePath = path.resolve(__dirname, '../src/templates/reportTemplate.html');
        
        try {
            return fs.readFileSync(templatePath, 'utf-8');
        } catch (error) {
            console.error(`Error reading template: ${error}`);
            // Fallback to inline template if the file doesn't exist
            return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code Analysis Report</title>
                <link rel="stylesheet" href="{{cssPath}}">
            </head>
            <body>
                <header>
                    <h1>Code Analysis Report</h1>
                    <p id="report-date">Generated on {{generationDate}}</p>
                </header>
                
                <div class="toc">
                    <h3>Table of Contents</h3>
                    <ul>
                        <li><a href="#executive-summary">Executive Summary</a></li>
                        <li><a href="#code-architecture">Code Architecture and Design</a></li>
                        <li><a href="#critical-issues">Critical Issues</a></li>
                        <li><a href="#code-quality">Code Quality Assessment</a></li>
                        <li><a href="#performance-analysis">Performance Analysis</a></li>
                        <li><a href="#security-review">Security Review</a></li>
                        <li><a href="#maintainability">Maintainability Assessment</a></li>
                        <li><a href="#recommended-refactoring">Recommended Refactoring</a></li>
                        <li><a href="#best-practices">Best Practices Implementation</a></li>
                        <li><a href="#learning-resources">Learning Resources</a></li>
                    </ul>
                </div>
                
                <main>
                    {{processedContent}}
                </main>
                
                <script src="{{scriptPath}}"></script>
            </body>
            </html>`;
        }
    }

    /**
     * Prepares assets directory and copies necessary files
     */
    public static prepareAssets(htmlPath: string): { relativeCssPath: string, relativeJsPath: string } {
        const htmlDir = path.dirname(htmlPath);
        const assetsDir = path.join(htmlDir, 'assets');
        
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        // Define paths for assets
        const cssPath = path.resolve(__dirname, '../src/styles/report.css');
        const scriptPath = path.resolve(__dirname, '../src/components/reportScript.js');
        const outputCssPath = path.join(assetsDir, 'report.css');
        const outputJsPath = path.join(assetsDir, 'report.js');
        
        try {
            // Copy the CSS and JS files to the output directory
            fs.copyFileSync(cssPath, outputCssPath);
            fs.copyFileSync(scriptPath, outputJsPath);
        } catch (error) {
            console.error(`Error copying assets: ${error}`);
            
            // If files don't exist, create them with the content from our code
            if (!fs.existsSync(outputCssPath)) {
                // Create CSS file with default styles
                fs.writeFileSync(outputCssPath, fs.readFileSync(path.resolve(__dirname, '../src/styles/report.css'), 'utf-8'));
            }
            
            if (!fs.existsSync(outputJsPath)) {
                // Create JS file with default script
                fs.writeFileSync(outputJsPath, fs.readFileSync(path.resolve(__dirname, '../src/components/reportScript.js'), 'utf-8'));
            }
        }
        
        // Calculate relative paths for the HTML file
        const relativeCssPath = path.relative(path.dirname(htmlPath), outputCssPath).replace(/\\/g, '/');
        const relativeJsPath = path.relative(path.dirname(htmlPath), outputJsPath).replace(/\\/g, '/');
        
        return { relativeCssPath, relativeJsPath };
    }
}

/**
 * Converts a markdown file to HTML
 */
export async function convertMarkdownToHtml(markdownPath: string): Promise<string> {
    try {
        console.log(`Starting HTML conversion for: ${markdownPath}`);
        
        // Read the markdown content
        const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
        
        // Create HTML filename
        const htmlPath = markdownPath.replace('.md', '.html');
        
        // Process markdown in steps to maintain formatting integrity
        
        // 1. Clean up and extract code blocks
        const cleanedContent = MarkdownConverter.cleanupExtraText(markdownContent);
        const { processedContent: contentWithPlaceholders, codeBlocks } = MarkdownConverter.extractCodeBlocks(cleanedContent);
        const codeBlockCounter = Object.keys(codeBlocks).length;
        
        // 2. Convert markdown to HTML in sequence
        let processedContent = contentWithPlaceholders;
        processedContent = MarkdownConverter.convertHeaders(processedContent);
        processedContent = MarkdownConverter.convertFormatting(processedContent);
        processedContent = MarkdownConverter.convertInlineCode(processedContent);
        processedContent = MarkdownConverter.convertLists(processedContent);
        processedContent = MarkdownConverter.convertParagraphs(processedContent);
        processedContent = MarkdownConverter.formatNumberedItems(processedContent);
        
        // 3. Restore code blocks
        processedContent = MarkdownConverter.restoreCodeBlocks(processedContent, codeBlocks, codeBlockCounter);
        
        // 4. Get HTML template and prepare assets
        const templateHtml = MarkdownConverter.getTemplateHtml();
        const { relativeCssPath, relativeJsPath } = MarkdownConverter.prepareAssets(htmlPath);
        
        // 5. Replace template placeholders
        const fullHtml = templateHtml
            .replace('{{cssPath}}', relativeCssPath)
            .replace('{{scriptPath}}', relativeJsPath)
            .replace('{{generationDate}}', new Date().toLocaleString())
            .replace('{{processedContent}}', processedContent);
        
        // 6. Write the HTML file
        fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
        console.log(`HTML file created: ${htmlPath}`);
        
        return htmlPath;
        
    } catch (error) {
        console.error(`Error converting markdown to HTML: ${error}`);
        return markdownPath;
    }
}
