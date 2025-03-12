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
export async function getAIResponse(prompt: string): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a strict AI code reviewer. Your response **must be structured into exactly 10 sections** using the format below:

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
                    - ✅ Format all section headers exactly as shown (**#### Category Name**).`
                },
                { role: "user", content: prompt },
            ],
        });

        const content = completion.choices[0]?.message?.content ?? "No response from AI.";

        // Save the AI response to a file
        const filePath = saveResponseToFile(content.trim());
        console.log(`✅ AI response saved to: ${filePath}`);

        return filePath; // Return file path instead of content
    } catch (error) {
        console.error("Error with OpenAI API:", error);
        return "";
    }
}
