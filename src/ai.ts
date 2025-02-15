import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as path from 'path';


// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error("❌ OpenAI API Key is missing! Check your .env file.");
    throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
}

// Initialize OpenAI instance
const openai = new OpenAI({ apiKey });

export async function getAIResponse(prompt: string): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a beginner-friendly AI coding assistant. When analyzing the code, provide feedback in a structured manner:\n1. Explain the issue clearly and simply.\n2. Give a small, easy-to-follow improvement.\n3. (Optional) Provide a brief explanation of why this change is beneficial.\nIf the code is correct, praise the user and suggest best practices for improvement. Keep responses encouraging and educational." },
                { role: "user", content: prompt },
            ],
        });

        const content = completion.choices[0]?.message?.content ?? "No response from AI.";
        return content.trim();
    } catch (error) {
        console.error("Error with OpenAI API:", error);
        return "Sorry, I couldn't process your request.";
    }
}
