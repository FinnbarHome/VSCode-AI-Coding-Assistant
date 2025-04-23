import { FileManager } from './FileManager';

// handles error & timeout fallbacks
export class FallbackResponses {
    // creates basic timeout response
    public static createTimeoutResponse(): string {
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

    // creates fancier report timeout response
    public static createReportTimeoutResponse(): string {
        return "# Report Generation Timed Out\n\nThe report generation process took too long and timed out. This might be due to high server load or complexity of the code. Please try again later with a smaller code sample.";
    }

    // saves fallback response when API times out
    public static async handleTimeout(error: any, isReport = false): Promise<string> {
        console.error(`AI response failed: ${error.message}`);
        
        if (error.message && error.message.includes('timed out')) {
            const fallbackContent = isReport 
                ? this.createReportTimeoutResponse() 
                : this.createTimeoutResponse();
            
            // pick appropriate filename
            const prefix = isReport ? 'report-response-timeout' : 'response-timeout';
            const extension = isReport ? '.md' : '.txt';
            const fileName = FileManager.getTimestampedFilename(prefix, extension);
            
            // save fallback
            FileManager.saveToFile(fallbackContent, fileName);
            console.log(`⚠️ Request timed out. Fallback response saved to: ${fileName}`);
            
            return fileName;
        }
        
        throw error;
    }
} 