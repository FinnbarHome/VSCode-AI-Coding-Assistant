"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIResponse = getAIResponse;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const path = __importStar(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path.resolve(__dirname, '../.env') });
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error("❌ OpenAI API Key is missing! Check your .env file.");
    throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
}
// Initialize OpenAI instance
const openai = new openai_1.default({ apiKey });
function getAIResponse(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const completion = yield openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are a strict AI code reviewer. Your response **must be structured into exactly 10 sections** using the format below:

                    #### Serious Problems
                    (List problems here, or write "No issues found.")

                    #### Warnings
                    (List warnings here, or write "No issues found.")

                    #### Refactoring Suggestions
                    (List suggestions here, or write "No issues found.")

                    #### Coding Conventions
                    (List convention violations here, or write "No issues found.")

                    #### Performance Optimization
                    (List optimizations here, or write "No issues found.")

                    #### Security Issues
                    (List security concerns here, or write "No issues found.")

                    #### Best Practices
                    (List best practices here, or write "No issues found.")

                    #### Readability and Maintainability
                    (List readability concerns here, or write "No issues found.")

                    #### Code Smells
                    (List code smells here, or write "No issues found.")

                    #### Educational Tips
                    (Provide useful coding tips, or write "No issues found.")

                    - ❌ Do **not** add introductions, summaries, or extra text.
                    - ❌ Do **not** create additional sections.
                    - ✅ Format all section headers exactly as shown (**#### Category Name**).`
                    },
                    { role: "user", content: prompt },
                ],
            });
            const content = (_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) !== null && _c !== void 0 ? _c : "No response from AI.";
            return content.trim();
        }
        catch (error) {
            console.error("Error with OpenAI API:", error);
            return "Sorry, I couldn't process your request.";
        }
    });
}
