import OpenAI from 'openai';

// Manually set the API key for now
const openai = new OpenAI({
    apiKey: '', // Replace with your actual API key
});

export async function getAIResponse(prompt: string): Promise<string> {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an AI code reviewer. Analyze the provided code and categorize the feedback into the following sections: Serious Problems, Warnings, Refactoring Suggestions, Coding Conventions, Performance Optimization, Security Issues, Best Practices, Readability and Maintainability, Code Smells, and Educational Tips. Provide concise and actionable feedback under each category where applicable." },
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
