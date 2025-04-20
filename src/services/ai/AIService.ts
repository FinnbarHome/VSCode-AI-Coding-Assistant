import { config } from './ApiConfig';
import { FileManager } from './FileManager';
import { OpenAIService } from './OpenAIService';

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