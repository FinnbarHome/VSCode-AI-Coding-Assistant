import * as path from 'path';
import * as fs from 'fs';
import { config } from './ApiConfig';

/**
 * Manages all file operations for saving AI responses
 */
export class FileManager {
    /**
     * Generates a timestamped filename in the responses directory
     */
    public static getTimestampedFilename(prefix = 'response', extension = '.txt'): string {
        const now = new Date();
        const timestamp = now.toISOString().replace(/:/g, '-'); // Ensures filename is valid
        return path.join(config.responsesDir, `${prefix}-${timestamp}${extension}`);
    }

    /**
     * Saves content to a file and returns the file path
     */
    public static saveToFile(content: string, filePath: string): string {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return filePath;
        } catch (error) {
            console.error(`Error saving to file: ${error}`);
            throw error;
        }
    }

    /**
     * Saves AI response with a timestamp and returns the file path
     */
    public static saveResponseToFile(content: string, prefix = 'response', extension = '.txt'): string {
        const filePath = this.getTimestampedFilename(prefix, extension);
        return this.saveToFile(content, filePath);
    }
} 