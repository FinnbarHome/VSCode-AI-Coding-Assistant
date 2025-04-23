import { config } from './ApiConfig';
import { PromptTemplates } from './PromptTemplates';
import { FallbackResponses } from './FallbackResponses';

// handles OpenAI API calls
export class OpenAIService {
    // cuts content if too long
    private static truncateContent(content: string, maxLength: number): string {
        if (content.length <= maxLength) {
            return content;
        }
        return content.slice(0, maxLength) + '\n\n[Content truncated due to length]';
    }

    // sends req to API with timeout
    public static async requestCompletion(prompt: string, isReport = false): Promise<string> {
        // pick model based on task
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
        
        // add timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs/1000} seconds`)), timeoutMs);
        });

        // create API call
        const completionPromise = config.openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: fullPrompt },
            ]
        });

        try {
            // race promises for timeout
            const completion = await Promise.race([completionPromise, timeoutPromise]);
            
            if (!completion) {
                throw new Error('No response received from AI service');
            }

            return completion.choices?.[0]?.message?.content ?? "No response from AI.";
        } catch (error: any) {
            // handle errors
            return FallbackResponses.handleTimeout(error, isReport);
        }
    }
} 