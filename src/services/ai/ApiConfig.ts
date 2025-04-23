import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// handles env config and OpenAI setup
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

    // finds project root by looking for package.json
    private findProjectRoot(): string {
        let currentDir = __dirname;
        // look upwards until we find package.json
        while (currentDir !== path.parse(currentDir).root) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        
        console.warn('Could not find project root, using a relative path fallback');
        // fallback if no package.json - go up 3 dirs
        return path.resolve(__dirname, '../../..');
    }

    // gets API key from env vars
    private loadApiKey(): string {
        // find root for .env file
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

    // makes sure responses dir exists
    private initializeResponsesDirectory(): string {
        // find root for responses dir
        const projectRoot = this.findProjectRoot();
        const dir = path.join(projectRoot, 'responses');
        console.log(`Setting up responses directory at: ${dir}`);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    // get singleton instance
    public static getInstance(): ApiConfig {
        if (!ApiConfig.instance) {
            ApiConfig.instance = new ApiConfig();
        }
        return ApiConfig.instance;
    }
}

// singleton for export
export const config = ApiConfig.getInstance(); 