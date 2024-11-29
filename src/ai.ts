import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly set the path to the .env file
const envPath = path.resolve('C:\\Users\\TheGu\\Documents\\GitHub\\VSCode-AI-Coding-Assistant\\.env');
dotenv.config({ path: envPath });

// Validate the API key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error("The OPENAI_API_KEY environment variable is missing. Please add it to your .env file.");
}

// Initialize the OpenAI client
const openai = new OpenAI({
    apiKey, // Use the API key loaded from .env
});

// Log the loaded API key for debugging
console.log("OpenAI API Key Loaded:", apiKey ? "Yes" : "No");

// Function to get a response from OpenAI
export async function getAIResponse(prompt: string): Promise<string> {
    try {
        // Make the API call
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Specify the model
            messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: prompt },
            ],
        });

        // Extract the response content
        const content = completion.choices[0]?.message?.content ?? "No response from AI.";
        return content.trim(); // Ensure the response is clean
    } catch (error: any) {
        // Log and handle errors
        console.error("Error with OpenAI API:", error.response?.data || error.message || error);
        return "Sorry, I couldn't process your request.";
    }
}
