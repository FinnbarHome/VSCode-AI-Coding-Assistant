import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("❌ OpenAI API Key is missing! Check your .env file.");
    throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
}

// Initialize OpenAI instance
const openai = new OpenAI({ apiKey });

// Create the responses directory if it doesn't exist
const responsesDir = path.resolve(__dirname, '../responses');
if (!fs.existsSync(responsesDir)) {
    fs.mkdirSync(responsesDir, { recursive: true });
}

// Function to generate a timestamped filename
function getTimestampedFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-'); // Ensures filename is valid
    return path.join(responsesDir, `response-${timestamp}.txt`);
}

// Function to save AI response to a file
function saveResponseToFile(content: string): string {
    const filePath = getTimestampedFilename();
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

// Function to get AI response, save it, and return file path
export async function getAIResponse(prompt: string, isDetailedReport = false): Promise<string> {
    try {
        // For detailed reports, use GPT-4o and provide more context
        const model = isDetailedReport ? "gpt-4o" : "gpt-4o-mini";
        
        // Truncate content differently based on report type
        const maxLength = isDetailedReport ? 8192 : 2048;
        
        // Check if content needs to be truncated
        const truncatedPrompt = prompt.length > maxLength
            ? prompt.slice(0, maxLength) + '\n\n[Content truncated due to length]'
            : prompt;
            
        // Create different system messages based on report type
        let systemMessage = "";
        
        if (isDetailedReport) {
            systemMessage = `You are a senior code reviewer creating a comprehensive PDF-ready code analysis report. 
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
        } else {
            systemMessage = `You are a strict AI code reviewer. Your response **must be structured into exactly 10 sections** using the format below:

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

        // Create appropriate prompt
        const fullPrompt = isDetailedReport 
            ? `Create a comprehensive code review report for the following code:\n\n${truncatedPrompt}`
            : `Review the following code:\n\n${truncatedPrompt}`;

        // Add a timeout for the API call (40 seconds for detailed reports, 25 for regular)
        // Reducing timeouts to avoid long waits
        const timeoutMs = isDetailedReport ? 40000 : 25000;
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

        // Race the promises to handle timeouts
        let completion;
        try {
            completion = await Promise.race([completionPromise, timeoutPromise]);
        } catch (error: any) {
            console.error(`AI response failed: ${error.message}`);
            // Create a fallback response for timeout
            if (error.message && error.message.includes('timed out')) {
                const fallbackContent = isDetailedReport 
                    ? "# Report Generation Timed Out\n\nThe report generation process took too long and timed out. This might be due to high server load or complexity of the code. Please try again later with a smaller code sample."
                    : "#### Serious Problems\nRequest timed out. Please try again with a smaller code sample.\n\n#### Warnings\nNo issues found.\n\n#### Refactoring Suggestions\nNo issues found.\n\n#### Coding Conventions\nNo issues found.\n\n#### Performance Optimization\nNo issues found.\n\n#### Security Issues\nNo issues found.\n\n#### Best Practices\nNo issues found.\n\n#### Readability and Maintainability\nNo issues found.\n\n#### Code Smells\nNo issues found.\n\n#### Educational Tips\nTry submitting smaller code samples for better performance.";
                
                // Generate appropriate file name for the fallback response
                const fileExtension = isDetailedReport ? ".md" : ".txt";
                const fileName = isDetailedReport 
                    ? `report-timeout-${new Date().toISOString().replace(/:/g, '-')}${fileExtension}`
                    : `response-timeout-${new Date().toISOString().replace(/:/g, '-')}${fileExtension}`;
                    
                const filePath = path.join(responsesDir, fileName);
                
                // Save the fallback response
                fs.writeFileSync(filePath, fallbackContent, 'utf-8');
                console.log(`⚠️ Request timed out. Fallback response saved to: ${filePath}`);
                
                return filePath;
            }
            throw error;
        }

        if (!completion) {
            throw new Error('No response received from AI service');
        }

        const content = completion.choices?.[0]?.message?.content ?? "No response from AI.";

        // Generate appropriate file name
        const fileExtension = isDetailedReport ? ".md" : ".txt";
        const fileName = isDetailedReport 
            ? `report-${new Date().toISOString().replace(/:/g, '-')}${fileExtension}`
            : `response-${new Date().toISOString().replace(/:/g, '-')}${fileExtension}`;
            
        const filePath = path.join(responsesDir, fileName);

        // Save the AI response to a file
        fs.writeFileSync(filePath, content.trim(), 'utf-8');
        console.log(`✅ ${isDetailedReport ? "Detailed report" : "AI response"} saved to: ${filePath}`);

        return filePath; // Return file path
    } catch (error) {
        console.error(`Error with OpenAI API: ${error}`);
        return "";
    }
}
