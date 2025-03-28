import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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
 * Handle API request timeout
 */
async function handleTimeout(error: any): Promise<string> {
    console.error(`AI response failed: ${error.message}`);
    
    if (error.message && error.message.includes('timed out')) {
        const fallbackContent = createTimeoutResponse();
        
        // Generate appropriate file name for the fallback response
        const fileName = getTimestampedFilename('response-timeout');
        
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
async function requestAICompletion(prompt: string): Promise<string> {
    const model = "gpt-4o-mini";
    const maxLength = 2048;
    const truncatedPrompt = truncateContent(prompt, maxLength);
    const systemMessage = createSystemMessage();
    const fullPrompt = `Review the following code:\n\n${truncatedPrompt}`;
    
    // Add a timeout for the API call
    const timeoutMs = 25000;
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
        return handleTimeout(error);
    }
}

// ==============================
// Main Export Function
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
        const response = await requestAICompletion(prompt);
        
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
