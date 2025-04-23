import * as path from 'path';
import * as fs from 'fs';
import { config } from './ApiConfig';

// handles saving AI responses to files
export class FileManager {
    // makes timestamp filename in responses dir
    public static getTimestampedFilename(prefix = 'response', extension = '.txt'): string {
        const now = new Date();
        const timestamp = now.toISOString().replace(/:/g, '-'); // fix invalid chars
        return path.join(config.responsesDir, `${prefix}-${timestamp}${extension}`);
    }

    // saves content to file, returns path
    public static saveToFile(content: string, filePath: string): string {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return filePath;
        } catch (error) {
            console.error(`Error saving to file: ${error}`);
            throw error;
        }
    }

    // quick save with timestamp
    public static saveResponseToFile(content: string, prefix = 'response', extension = '.txt'): string {
        const filePath = this.getTimestampedFilename(prefix, extension);
        return this.saveToFile(content, filePath);
    }
} 