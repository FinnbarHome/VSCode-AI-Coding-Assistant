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
function createReportSystemMessage(): string {
    return `You are a senior code reviewer creating a comprehensive PDF-ready code analysis report. 
Your analysis should be thorough and professional, suitable for formal documentation.

Structure your response with these sections:
1. **Executive Summary** - Brief overview of code quality and key findings
2. **Code Architecture** - Analysis of overall structure and design patterns
3. **Critical Issues** - Security vulnerabilities, bugs, and serious problems
4. **Code Quality Assessment** - Analysis of style, conventions, and maintainability
5. **Performance Analysis** - Efficiency concerns and optimization opportunities
6. **Security Review** - Thorough analysis of security implications
7. **Maintainability Score** - Rating from 1-10 with justification
8. **Recommended Refactoring** - Prioritized action items with code examples
9. **Best Practices Implementation** - Suggestions for improving code quality
10. **Learning Resources** - Relevant documentation, articles or tutorials

For code examples, use markdown code blocks with appropriate language tags.
Be specific, actionable, and educational in your feedback.`;
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
    const maxLength = isReport ? 8192 : 2048;
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
        
        // Create PDF filename from markdown filename
        const pdfPath = markdownPath.replace('.md', '.pdf');
        
        // Add a timeout to prevent hanging
        const timeoutMs = 30000; // 30 seconds timeout
        
        // Create a promise that will resolve when the conversion is complete
        const conversionPromise = new Promise<string>((resolve, reject) => {
            console.log(`Creating markdownpdf conversion for ${markdownPath} to ${pdfPath}`);
            
            const pdf = markdownpdf({
                phantomPath: require('phantomjs-prebuilt').path, // Explicitly set phantomjs path
                timeout: timeoutMs - 5000, // Set internal timeout to be slightly less than our Promise timeout
            });
            
            pdf.from(markdownPath)
               .to(pdfPath, (err: Error | null) => {
                   if (err) {
                       console.error(`PDF conversion error: ${err.message}`);
                       reject(err);
                   } else {
                       console.log(`PDF conversion complete: ${pdfPath}`);
                       resolve(pdfPath);
                   }
               });
        });
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`PDF conversion timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
        });
        
        // Race the conversion against the timeout
        const result = await Promise.race([conversionPromise, timeoutPromise]);
        
        // If we reached here, the conversion was successful
        console.log(`✅ PDF report generated: ${result}`);
        return result as string;
    } catch (error) {
        console.error(`Error converting markdown to PDF: ${error}`);
        
        // Provide a fallback by copying the markdown file as-is
        try {
            const fallbackPath = markdownPath.replace('.md', '-fallback.md');
            fs.copyFileSync(markdownPath, fallbackPath);
            console.log(`Created fallback markdown file: ${fallbackPath}`);
            return fallbackPath;
        } catch (fallbackError) {
            console.error(`Error creating fallback: ${fallbackError}`);
        }
        
        // Return the original markdown path if fallback fails
        return markdownPath;
    }
}
