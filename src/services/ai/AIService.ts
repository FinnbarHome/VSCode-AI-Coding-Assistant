import { config } from './ApiConfig';
import { FileManager } from './FileManager';
import { OpenAIService } from './OpenAIService';

// gets AI review, saves to file, returns path
export async function getAIResponse(prompt: string): Promise<string> {
    try {
        // empty check
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service');
            return '';
        }
        
        // get AI response
        const response = await OpenAIService.requestCompletion(prompt, false);
        
        // already have file path? use it
        if (response.startsWith(config.responsesDir)) {
            return response;
        }
        
        // save response to file
        const fileName = FileManager.getTimestampedFilename();
        FileManager.saveToFile(response.trim(), fileName);
        console.log(`✅ AI response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error with OpenAI API: ${error}`);
        return "";
    }
}

// makes full report with GPT-4o, saves as markdown
export async function generateReport(prompt: string): Promise<string> {
    try {
        // empty check
        if (!prompt || prompt.trim() === '') {
            console.error('Empty prompt provided to AI service for report');
            return '';
        }
        
        // get report from AI
        const response = await OpenAIService.requestCompletion(prompt, true);
        
        // got file path already? use it
        if (response.startsWith(config.responsesDir)) {
            return response;
        }
        
        // save as md file
        const fileName = FileManager.getTimestampedFilename('report-response', '.md');
        FileManager.saveToFile(response.trim(), fileName);
        console.log(`📝 Report response saved to: ${fileName}`);
        
        return fileName;
    } catch (error) {
        console.error(`Error generating report: ${error}`);
        return "";
    }
} 