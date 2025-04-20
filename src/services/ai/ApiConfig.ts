import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Manages environment configuration and OpenAI API setup
 */
export class ApiConfig {
    private static instance: ApiConfig;
    public readonly apiKey: string;
    public readonly openai: OpenAI;
    public readonly responsesDir: string;

    private constructor() {
        this.apiKey = this.loadApiKey();
        this.openai = new OpenAI({ apiKey: this.apiKey });
        this.responsesDir = this.initializeResponsesDirectory();
    }

    /**
     * Finds the project root directory by looking for package.json
     */
    private findProjectRoot(): string {
        let currentDir = __dirname;
        // Navigate up until we find package.json (project root marker)
        while (currentDir !== path.parse(currentDir).root) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        
        console.warn('Could not find project root, using a relative path fallback');
        // Fallback to 3 levels up from the current file if we can't find package.json
        return path.resolve(__dirname, '../../..');
    }

    /**
     * Loads API key from environment variables
     */
    private loadApiKey(): string {
        // Find the project root to locate .env file
        const projectRoot = this.findProjectRoot();
        const envPath = path.join(projectRoot, '.env');
        console.log(`Looking for .env at: ${envPath}`);
        
        dotenv.config({ path: envPath });
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("❌ OpenAI API Key is missing! Check your .env file.");
            console.error(`Could not find .env file at ${envPath}`);
            throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
        }

        return apiKey;
    }

    /**
     * Creates and initializes the responses directory
     */
    private initializeResponsesDirectory(): string {
        // Find the project root to locate the responses directory
        const projectRoot = this.findProjectRoot();
        const dir = path.join(projectRoot, 'responses');
        console.log(`Setting up responses directory at: ${dir}`);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Gets the singleton instance of ApiConfig
     */
    public static getInstance(): ApiConfig {
        if (!ApiConfig.instance) {
            ApiConfig.instance = new ApiConfig();
        }
        return ApiConfig.instance;
    }
}

// Create a singleton instance for export
export const config = ApiConfig.getInstance(); 