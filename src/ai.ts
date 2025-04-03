import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import markdownpdf from 'markdown-pdf';
import { promisify } from 'util';

// Properly promisify markdown-pdf
const convertToPdf = (inputPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        markdownpdf()
            .from(inputPath)
            .to(outputPath, (err: Error | null) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(outputPath);
                }
            });
    });
};

// ==============================
// Configuration and Setup
// ==============================

/**
 * Initialize environment variables and API client
 */
function initializeEnvironment() {
    // Load environment variables
    dotenv.config({ path: path.resolve(__dirname, '../.env') });

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error("❌ OpenAI API Key is missing! Check your .env file.");
        throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
    }

    return apiKey;
}

const apiKey = initializeEnvironment();

// Initialize OpenAI instance
const openai = new OpenAI({ apiKey });

// Create the responses directory if it doesn't exist
const responsesDir = path.resolve(__dirname, '../responses');
if (!fs.existsSync(responsesDir)) {
    fs.mkdirSync(responsesDir, { recursive: true });
}

// ==============================
// File Management Functions
// ==============================

/**
 * Generate a timestamped filename for response files
 */
function getTimestampedFilename(prefix = 'response', extension = '.txt'): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-'); // Ensures filename is valid
    return path.join(responsesDir, `${prefix}-${timestamp}${extension}`);
}

/**
 * Save content to a file and return the file path
 */
function saveToFile(content: string, filePath: string): string {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    } catch (error) {
        console.error(`Error saving to file: ${error}`);
        throw error;
    }
}

/**
 * Save AI response to a file with timestamp
 */
function saveResponseToFile(content: string): string {
    const filePath = getTimestampedFilename();
    return saveToFile(content, filePath);
}

// ==============================
// AI Request Functions
// ==============================

/**
 * Create the system message for AI code review
 */
function createSystemMessage(): string {
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
 * Create the system message for comprehensive reports
 */
export function createReportSystemMessage(): string {
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
    
    FORMAT ALL CODE EXAMPLES CONSISTENTLY:
    - Always include language identifier in code blocks: \`\`\`javascript, \`\`\`typescript, etc.
    - Use actual code for examples, not pseudocode
    - Make sure "Before" and "After" code examples have the exact same indentation style
    - Keep code examples concise (5-15 lines) and focused on the specific issue
    
    CONTENT REQUIREMENTS:
    - For ALL sections, provide thorough explanations with specific examples from the code
    - Break down complex concepts for educational value
    - Include both positive findings and areas for improvement
    - Justify all scores with detailed reasoning
    
    EXACTLY FOLLOW THIS REPORT STRUCTURE:
    
    ## Executive Summary
    * Brief overview of code quality and key findings
    * Overall quality score: X/10
    * Top 3 strengths
    * Top 3 areas for improvement
    
    ## Code Architecture and Design
    * Analysis of overall architecture
    * Component relationship assessment
    * Design patterns used (or missing)
    * Architectural score: X/10
    
    ## Critical Issues
    * Blocking/high-priority issues
    * Potential crashes or runtime errors
    * Architectural flaws
    * Critical issues score: X/10
    
    ## Code Quality Assessment
    * Readability analysis
    * Consistency evaluation
    * Code complexity measurement
    * Formatting and style issues
    * Quality score: X/10
    
    ## Performance Analysis
    * Potential bottlenecks
    * Optimization opportunities
    * Resource usage concerns
    * Performance score: X/10
    
    ## Security Review
    * Security vulnerabilities
    * Data handling concerns
    * Input validation issues
    * Security score: X/10
    
    ## Maintainability Assessment
    * Code duplication analysis
    * Documentation quality
    * Testing coverage/quality
    * Maintainability score: X/10
    
    ## Recommended Refactoring
    * Prioritized refactoring suggestions
    * Before/after code examples (use consistent formatting)
    * Expected benefits
    * Refactoring impact score: X/10
    
    ## Best Practices Implementation
    * Language-specific best practices assessment
    * Industry standard adherence
    * Framework usage optimization
    * Best practices score: X/10
    
    ## Learning Resources
    * Relevant documentation, articles, or tutorials specific to the issues found
    * Organized by priority/impact
    * Explanation of why each resource is valuable
    
    Remember: DO NOT add ANY text before section 1 or after section 10. Start and end exactly with the defined sections.
    DO NOT add stars, asterisks, or bullet points to the section headers themselves. Format them EXACTLY as "## Section Name".`;
}

/**
 * Truncate content if it exceeds maximum length
 */
function truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
        return content;
    }
    return content.slice(0, maxLength) + '\n\n[Content truncated due to length]';
}

/**
 * Create a fallback response for timeout scenarios
 */
function createTimeoutResponse(): string {
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
 * Create a fallback response for report timeout scenarios
 */
function createReportTimeoutResponse(): string {
    return "# Report Generation Timed Out\n\nThe report generation process took too long and timed out. This might be due to high server load or complexity of the code. Please try again later with a smaller code sample.";
}

/**
 * Handle API request timeout
 */
async function handleTimeout(error: any, isReport = false): Promise<string> {
    console.error(`AI response failed: ${error.message}`);
    
    if (error.message && error.message.includes('timed out')) {
        const fallbackContent = isReport 
            ? createReportTimeoutResponse() 
            : createTimeoutResponse();
        
        // Generate appropriate file name for the fallback response
        const prefix = isReport ? 'report-response-timeout' : 'response-timeout';
        const extension = isReport ? '.md' : '.txt';
        const fileName = getTimestampedFilename(prefix, extension);
        
        // Save the fallback response
        saveToFile(fallbackContent, fileName);
        console.log(`⚠️ Request timed out. Fallback response saved to: ${fileName}`);
        
        return fileName;
    }
    
    throw error;
}

/**
 * Send request to OpenAI API with timeout handling
 */
async function requestAICompletion(prompt: string, isReport = false): Promise<string> {
    // Choose model and max length based on the task
    const model = isReport ? "gpt-4o" : "gpt-4o-mini";
    const maxLength = isReport ? 16384 : 8192;
    const timeoutMs = isReport ? 40000 : 25000;
    
    const truncatedPrompt = truncateContent(prompt, maxLength);
    const systemMessage = isReport ? createReportSystemMessage() : createSystemMessage();
    const fullPrompt = isReport 
        ? `Create a comprehensive code review report for the following code:\n\n${truncatedPrompt}`
        : `Review the following code:\n\n${truncatedPrompt}`;
    
    // Add a timeout for the API call
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
    });

    // Create the API completion promise
    const completionPromise = openai.chat.completions.create({
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
        return handleTimeout(error, isReport);
    }
}

// ==============================
// Main Export Functions
// ==============================

/**
 * Main function to get AI response, save it, and return file path
 */
export async function getAIResponse(prompt: string): Promise<string> {
    try {
        // If the content is empty, return empty response
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service');
            return '';
        }
        
        // Get response from AI
        const response = await requestAICompletion(prompt, false);
        
        // If the response is a file path (from timeout handling), return it
        if (response.startsWith(responsesDir)) {
            return response;
        }
        
        // Otherwise, save the response to a file
        const fileName = getTimestampedFilename();
        saveToFile(response.trim(), fileName);
        console.log(`✅ AI response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error with OpenAI API: ${error}`);
        return "";
    }
}

/**
 * Generate a comprehensive report using GPT-4o and save it
 */
export async function generateReport(prompt: string): Promise<string> {
    try {
        // If the content is empty, return empty response
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service for report');
            return '';
        }
        
        // Get report response from AI
        const response = await requestAICompletion(prompt, true);
        
        // If the response is a file path (from timeout handling), return it
        if (response.startsWith(responsesDir)) {
            return response;
        }
        
        // Otherwise, save the response to a report file
        const fileName = getTimestampedFilename('report-response', '.md');
        saveToFile(response.trim(), fileName);
        console.log(`📝 Report response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error generating report: ${error}`);
        return "";
    }
}

// ==============================
// PDF Functions
// ==============================

/**
 * Convert a markdown file to PDF
 */
export async function convertMarkdownToPdf(markdownPath: string): Promise<string> {
    try {
        console.log(`Starting PDF conversion for: ${markdownPath}`);
        
        // Read the markdown content
        const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
        
        // Create HTML filename
        const htmlPath = markdownPath.replace('.md', '.html');
        
        // Process markdown content in a specific order to avoid formatting issues
        
        // 1. First, identify and convert code blocks to prevent them from interfering with other conversions
        let codeBlocks: {[key: string]: string} = {};
        let codeBlockCounter = 0;
        
        // Clean up any introductory or concluding text outside the main sections
        const cleanupExtraText = (content: string): string => {
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
        };

        // Apply the cleanup to remove extra text
        let processedContent = cleanupExtraText(markdownContent);
        
        // Replace code blocks with placeholders to preserve them during conversion
        processedContent = processedContent.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
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
        
        // 2. Convert markdown elements to HTML
        
        // Convert headers - promote heading levels (h3->h2) to match TOC expectations
        processedContent = processedContent
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h2>$1</h2>') // Convert ### to h2 instead of h3
            .replace(/^#### (.*$)/gm, '<h3>$1</h3>') // Adjust remaining header levels
            .replace(/^##### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^###### (.*$)/gm, '<h5>$1</h5>');
            
        // Convert bold and italic
        processedContent = processedContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Convert inline code (do this before lists to avoid conflicts)
        processedContent = processedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
            
        // Convert lists with proper grouping
        let inList = false;
        let listContent = '';
        let htmlContentArray = [];
        
        processedContent.split('\n').forEach(line => {
            // Check if this is a list item (starts with * or -)
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
        
        processedContent = htmlContentArray.join('\n');
            
        // 3. Handle paragraphs - update the regex to exclude code blocks
        // Look for lines that:
        // 1. Don't start with <
        // 2. Don't contain CODE_BLOCK_PLACEHOLDER
        // 3. Aren't empty
        // First, process paragraphs in a way that preserves placeholders
        const paragraphProcessedLines = processedContent.split('\n');
        const processedLines = [];
        
        // Process line by line to better handle code blocks
        let inCodeBlock = false;
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
        
        processedContent = processedLines.join('\n');
            
        // Fix numbered list items outside ordered lists (like "1. Item")
        processedContent = processedContent.replace(
            /<p>\s*(\d+)\.\s+(.*?)<\/p>/g,
            '<p class="numbered-item"><span class="item-number">$1.</span> $2</p>'
        );

        // 4. Restore code blocks - improved to catch all placeholder variants
        console.log(`Starting to restore ${Object.keys(codeBlocks).length} code blocks`);

        // Special debug logging to help diagnose issues
        console.log('Placeholder patterns to look for:');
        Object.keys(codeBlocks).forEach(placeholder => {
            console.log(`- ${placeholder}`);
            
            // Check if this placeholder appears in the processed content
            if (processedContent.includes(placeholder)) {
                console.log(`  Found as plain text`);
            } else if (processedContent.includes(`<p>${placeholder}</p>`)) {
                console.log(`  Found wrapped in paragraph tags`);
            } else if (processedContent.includes(placeholder.replace(/_/g, '<em>_</em>'))) {
                console.log(`  Found with emphasized underscores`);
            } else {
                console.log(`  Not found in standard patterns - searching for variations`);
            }
        });

        // First check for specific patterns from nested headers with code blocks
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

        // Use a direct pattern matching approach
        for (let i = 0; i < codeBlockCounter; i++) {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${i}`;
            // Create variations of the pattern we've seen
            const variations = [
                placeholder,
                `<p>${placeholder}</p>`,
                `<p>  ${placeholder}</p>`,
                `<p>${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                `<p>  ${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                // Match CODE<em>BLOCK</em>PLACEHOLDER pattern
                `<p>CODE<em>BLOCK</em>PLACEHOLDER_${i}</p>`,
                `CODE<em>BLOCK</em>PLACEHOLDER_${i}`,
                `<p>CODE_BLOCK<em>PLACEHOLDER</em>_${i}</p>`,
                `<p>CODE<em>_</em>BLOCK<em>_</em>PLACEHOLDER_${i}</p>`,
            ];
            
            // Try each variation
            variations.forEach(pattern => {
                if (processedContent.includes(pattern)) {
                    console.log(`Found and replacing pattern: ${pattern}`);
                    processedContent = processedContent.replace(pattern, codeBlocks[placeholder]);
                }
            });
            
            // Last resort: use a flexible regex to match any form with the same placeholder number
            const flexRegex = new RegExp(`<p>(?:CODE)?(?:<em>)?[_]?(?:</em>)?(?:BLOCK)?(?:<em>)?[_]?(?:</em>)?PLACEHOLDER_${i}(?:\\s*|<em>.*?</em>|.*?)</p>`, 'g');
            processedContent = processedContent.replace(flexRegex, codeBlocks[placeholder]);
        }

        // Then run the standard placeholder replacement
        Object.keys(codeBlocks).forEach(placeholder => {
            // ... existing replacement code ...
        });

        // Add specific styling for numbered items that aren't in lists and improved code blocks
        const extraStyles = `
        /* Numbered items outside lists */
        .numbered-item {
            position: relative;
            padding-left: 1.5em;
            margin-left: 1em;
        }

        .item-number {
            position: absolute;
            left: 0;
            font-weight: bold;
            color: var(--secondary-color);
        }

        /* Additional list styling */
        ul, ol {
            padding-left: 2em;
            margin: 1em 0;
        }

        ul li, ol li {
            margin-bottom: 0.5em;
            padding-left: 0.5em;
        }

        /* Fix spacing */
        li p {
            margin: 0.25em 0;
        }

        /* Improved code block styling */
        .code-block-wrapper {
            margin: 1.5em 0;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            max-height: 500px;
        }

        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--secondary-color);
            color: white;
            padding: 6px 12px;
            font-size: 0.8em;
        }

        .code-language {
            text-transform: uppercase;
            font-weight: bold;
            letter-spacing: 0.5px;
        }

        .copy-btn {
            cursor: pointer;
            background: rgba(255,255,255,0.1);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }

        .copy-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        pre {
            margin: 0;
            overflow: auto;
            max-height: 450px;
            display: flex;
            background-color: #f5f7f9;
            border-top: none;
        }

        .line-numbers {
            padding: 0.5em;
            text-align: right;
            width: 2.5em;
            user-select: none;
            color: #888;
            background-color: rgba(0,0,0,0.03);
            border-right: 1px solid rgba(0,0,0,0.1);
        }

        .line-number {
            display: block;
            font-size: 0.85em;
            line-height: 1.4;
        }

        code {
            padding: 0.5em;
            width: 100%;
            overflow-x: auto;
            font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
        }

        .code-line {
            display: block;
            white-space: pre;
            line-height: 1.4;
            font-size: 0.9em;
        }

        /* Syntax highlighting */
        .language-javascript .code-line, 
        .language-typescript .code-line,
        .language-css .code-line {
            color: #333;
        }

        /* CSS-specific highlighting */
        .language-css .code-line {
            color: #07a;
        }
        `;
        
        // Wrap in HTML document with styling
        const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Code Analysis Report</title>
            <style>
                :root {
                    --primary-color: #0078d7;
                    --primary-light: #e6f2ff;
                    --secondary-color: #2c3e50;
                    --accent-color: #16a085;
                    --light-gray: #f5f7f9;
                    --dark-gray: #444;
                    --border-color: #ddd;
                    --score-good: #27ae60;
                    --score-medium: #f39c12;
                    --score-bad: #e74c3c;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                    line-height: 1.6;
                    color: var(--dark-gray);
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: white;
                    font-size: 16px;
                }
                
                /* Header styling */
                header {
                    border-bottom: 2px solid var(--primary-color);
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                
                h1 {
                    color: var(--primary-color);
                    font-size: 2.4em;
                    margin-bottom: 10px;
                    font-weight: 700;
                }
                
                h2 {
                    color: var(--primary-color);
                    font-size: 1.8em;
                    margin-top: 2em;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--border-color);
                    position: relative;
                    font-weight: 600;
                    clear: both;
                }
                
                /* Section numbering */
                h2:before {
                    margin-right: 10px;
                    font-weight: bold;
                    color: var(--primary-color);
                }
                
                h2#executive-summary:before { content: "1. "; }
                h2#code-architecture:before { content: "2. "; }
                h2#critical-issues:before { content: "3. "; }
                h2#code-quality:before { content: "4. "; }
                h2#performance-analysis:before { content: "5. "; }
                h2#security-review:before { content: "6. "; }
                h2#maintainability:before { content: "7. "; }
                h2#recommended-refactoring:before { content: "8. "; }
                h2#best-practices:before { content: "9. "; }
                h2#learning-resources:before { content: "10. "; }
                
                h3 {
                    color: var(--secondary-color);
                    font-size: 1.4em;
                    margin-top: 1.5em;
                    font-weight: 600;
                }
                
                h4 {
                    color: var(--secondary-color);
                    font-size: 1.2em;
                    font-weight: 600;
                }
                
                /* Score indicators */
                .score-container {
                    display: flex;
                    align-items: center;
                    margin: 15px 0;
                    padding: 10px 15px;
                    background-color: var(--light-gray);
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .score-label {
                    font-weight: bold;
                    margin-right: 15px;
                }
                
                .score {
                    font-size: 1.2em;
                    font-weight: bold;
                    padding: 5px 12px;
                    border-radius: 16px;
                    color: white;
                    display: inline-block;
                    min-width: 40px;
                    text-align: center;
                }
                
                .score-good {
                    background-color: var(--score-good);
                }
                
                .score-medium {
                    background-color: var(--score-medium);
                }
                
                .score-bad {
                    background-color: var(--score-bad);
                }
                
                /* Lists */
                ul, ol {
                    padding-left: 2em;
                    margin: 1em 0;
                }
                
                li {
                    margin-bottom: 0.8em;
                    line-height: 1.6;
                }
                
                /* Lists within lists should be more compact */
                li li {
                    margin-bottom: 0.4em;
                }
                
                /* Prevent double spacing in lists */
                li p {
                    margin: 0.25em 0;
                }

                ${extraStyles}
                
                /* Code blocks */
                code {
                    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                    background: var(--light-gray);
                    border-radius: 3px;
                    padding: 2px 5px;
                    font-size: 0.9em;
                }
                
                /* Tables */
                table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 1.5em 0;
                }
                
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                
                th {
                    background-color: var(--primary-light);
                    color: var(--secondary-color);
                    font-weight: bold;
                }
                
                tr:nth-child(even) {
                    background-color: var(--light-gray);
                }
                
                /* Other elements */
                p {
                    margin: 1em 0;
                    line-height: 1.8;
                }
                
                a {
                    color: var(--primary-color);
                    text-decoration: none;
                }
                
                a:hover {
                    text-decoration: underline;
                }
                
                strong {
                    color: var(--secondary-color);
                    font-weight: 600;
                }
                
                /* Navigation */
                .toc {
                    background-color: var(--light-gray);
                    padding: 20px 25px;
                    border-radius: 6px;
                    margin-bottom: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .toc h3 {
                    margin-top: 0;
                    margin-bottom: 15px;
                    color: var(--primary-color);
                    font-size: 1.5em;
                }
                
                .toc ul {
                    padding-left: 0;
                    list-style-type: none;
                    counter-reset: toc-counter;
                }
                
                .toc li {
                    margin-bottom: 12px;
                    position: relative;
                    padding-left: 28px;
                }
                
                .toc li:before {
                    content: counter(toc-counter) ".";
                    counter-increment: toc-counter;
                    position: absolute;
                    left: 0;
                    font-weight: bold;
                    color: var(--primary-color);
                }
                
                .toc a {
                    text-decoration: none;
                    color: var(--primary-color);
                    font-size: 1.1em;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }
                
                .toc a:hover {
                    color: var(--accent-color);
                    text-decoration: none;
                    padding-left: 3px;
                }
                
                /* Code block wrapper */
                .code-block-wrapper {
                    margin: 1.5em 0;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                    max-height: 500px;
                }
                
                .code-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--secondary-color);
                    color: white;
                    padding: 8px 15px;
                    font-size: 0.85em;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .code-language {
                    text-transform: uppercase;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
                
                .copy-btn {
                    cursor: pointer;
                    background: rgba(255,255,255,0.1);
                    padding: 3px 8px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .copy-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                
                pre {
                    margin: 0;
                    overflow: auto;
                    max-height: 450px;
                    display: flex;
                    background-color: #f5f7f9;
                    border-top: none;
                }
                
                .line-numbers {
                    padding: 0.5em;
                    text-align: right;
                    width: 2.5em;
                    user-select: none;
                    color: #888;
                    background-color: rgba(0,0,0,0.03);
                    border-right: 1px solid rgba(0,0,0,0.1);
                }
                
                .line-number {
                    display: block;
                    font-size: 0.85em;
                    line-height: 1.4;
                }
                
                code {
                    padding: 0.5em;
                    width: 100%;
                    overflow-x: auto;
                    font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
                }
                
                .code-line {
                    display: block;
                    white-space: pre;
                    line-height: 1.4;
                    font-size: 0.9em;
                }
                
                /* Consistent spacing between sections */
                section {
                    margin-bottom: 2em;
                    padding-bottom: 1em;
                }
                
                /* Make spacing consistent for printing */
                @media print {
                    h2 {
                        page-break-before: always;
                    }
                    
                    h2#executive-summary {
                        page-break-before: avoid;
                    }
                    
                    .code-block-wrapper {
                        break-inside: avoid;
                    }
                    
                    pre {
                        white-space: pre-wrap;
                    }
                }

                /* Responsive design */
                @media (max-width: 768px) {
                    body {
                        padding: 15px;
                        font-size: 15px;
                    }
                    
                    h1 {
                        font-size: 2em;
                    }
                    
                    h2 {
                        font-size: 1.6em;
                    }
                    
                    .toc li {
                        padding-left: 24px;
                    }
                }
            </style>
        </head>
        <body>
            <header>
                <h1>Code Analysis Report</h1>
                <p id="report-date">Generated on ${new Date().toLocaleString()}</p>
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
                ${processedContent}
            </main>
            
            <script>
                // Process the document once it's fully loaded
                document.addEventListener('DOMContentLoaded', function() {
                    // Step 1: Standardize heading formats and add IDs
                    // Map section titles to IDs
                    const sectionMap = {
                        'executive summary': 'executive-summary',
                        'code architecture': 'code-architecture',
                        'architecture': 'code-architecture',
                        'critical issues': 'critical-issues',
                        'code quality': 'code-quality',
                        'performance': 'performance-analysis',
                        'security': 'security-review',
                        'maintainability': 'maintainability',
                        'refactoring': 'recommended-refactoring',
                        'best practices': 'best-practices',
                        'learning resources': 'learning-resources'
                    };
                    
                    // Process all h2 elements (main sections)
                    const h2Elements = document.querySelectorAll('main h2');
                    h2Elements.forEach(heading => {
                        // Create slug from heading text
                        const headingText = heading.innerText.toLowerCase();
                        
                        // Remove numbering if present (e.g., "1. Executive Summary")
                        const cleanText = headingText.replace(/^\d+\.?\s+/, '');
                        
                        // Find the matching ID from our mapping
                        let id = null;
                        for (const [key, value] of Object.entries(sectionMap)) {
                            if (cleanText.includes(key)) {
                                id = value;
                                break;
                            }
                        }
                        
                        if (id) {
                            heading.id = id;
                        }
                    });
                    
                    // Step 2: Extract and standardize scores
                    h2Elements.forEach(heading => {
                        if (!heading.id || heading.id === 'learning-resources') return;
                        
                        // Look for score information in nearby content
                        const scoreRegex = /\b([a-z]+)\s+score:\s*(\d+)\/10\b/i;
                        
                        let scoreValue = null;
                        let nextElem = heading.nextElementSibling;
                        const maxSearch = 5; // Look through next 5 elements maximum
                        
                        for (let i = 0; i < maxSearch && nextElem; i++) {
                            const textContent = nextElem.textContent;
                            const match = textContent.match(scoreRegex);
                            
                            if (match) {
                                scoreValue = parseInt(match[2]);
                                break;
                            }
                            nextElem = nextElem.nextElementSibling;
                        }
                        
                        // If score found, create standardized score display
                        if (scoreValue !== null) {
                            // Create score container
                            const scoreContainer = document.createElement('div');
                            scoreContainer.className = 'score-container';
                            
                            const scoreLabel = document.createElement('div');
                            scoreLabel.className = 'score-label';
                            scoreLabel.textContent = 'Section Score:';
                            
                            const score = document.createElement('div');
                            score.className = 'score';
                            
                            // Add appropriate color class
                            if (scoreValue >= 8) {
                                score.classList.add('score-good');
                            } else if (scoreValue >= 5) {
                                score.classList.add('score-medium');
                            } else {
                                score.classList.add('score-bad');
                            }
                            
                            score.textContent = scoreValue + '/10';
                            
                            scoreContainer.appendChild(scoreLabel);
                            scoreContainer.appendChild(score);
                            
                            // Insert after heading
                            heading.insertAdjacentElement('afterend', scoreContainer);
                        }
                    });
                    
                    // Step 3: Setup code block copy functionality
                    document.querySelectorAll('.copy-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const targetId = this.getAttribute('data-clipboard-target').substring(1);
                            const codeElement = document.getElementById(targetId);
                            
                            if (codeElement) {
                                // Get text content without line numbers
                                let text = '';
                                codeElement.querySelectorAll('.code-line').forEach(line => {
                                    text += line.textContent + "\\n";
                                });
                                
                                // Use modern clipboard API if available
                                if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(text).then(() => {
                                        this.textContent = 'Copied!';
                                        setTimeout(() => {
                                            this.textContent = 'Copy';
                                        }, 2000);
                                    });
                                } else {
                                    // Fallback for older browsers
                                    const textarea = document.createElement('textarea');
                                    textarea.value = text;
                                    textarea.setAttribute('readonly', '');
                                    textarea.style.position = 'absolute';
                                    textarea.style.left = '-9999px';
                                    document.body.appendChild(textarea);
                                    textarea.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(textarea);
                                    
                                    this.textContent = 'Copied!';
                                    setTimeout(() => {
                                        this.textContent = 'Copy';
                                    }, 2000);
                                }
                            }
                        });
                    });
                });
            </script>
        </body>
        </html>
        `;
        
        // Write the HTML file
        fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
        console.log(`HTML file created: ${htmlPath}`);
        
        return htmlPath;
        
    } catch (error) {
        console.error(`Error converting markdown to HTML: ${error}`);
        return markdownPath;
    }
}
