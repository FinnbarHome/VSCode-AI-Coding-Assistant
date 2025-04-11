"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIResponse = getAIResponse;
exports.generateReport = generateReport;
exports.convertMarkdownToHtml = convertMarkdownToHtml;
var openai_1 = require("openai");
var dotenv = require("dotenv");
var path = require("path");
var fs = require("fs");
// ==============================
// Configuration and Environment
// ==============================
/**
 * Manages environment configuration and OpenAI API setup
 */
var ApiConfig = /** @class */ (function () {
    function ApiConfig() {
        this.apiKey = this.loadApiKey();
        this.openai = new openai_1.default({ apiKey: this.apiKey });
        this.responsesDir = this.initializeResponsesDirectory();
    }
    /**
     * Loads API key from environment variables
     */
    ApiConfig.prototype.loadApiKey = function () {
        dotenv.config({ path: path.resolve(__dirname, '../.env') });
        var apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("❌ OpenAI API Key is missing! Check your .env file.");
            throw new Error("OpenAI API Key not found. Make sure you have a valid `.env` file.");
        }
        return apiKey;
    };
    /**
     * Creates and initializes the responses directory
     */
    ApiConfig.prototype.initializeResponsesDirectory = function () {
        var dir = path.resolve(__dirname, '../responses');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    };
    /**
     * Gets the singleton instance of ApiConfig
     */
    ApiConfig.getInstance = function () {
        if (!ApiConfig.instance) {
            ApiConfig.instance = new ApiConfig();
        }
        return ApiConfig.instance;
    };
    return ApiConfig;
}());
// Create a singleton instance of ApiConfig
var config = ApiConfig.getInstance();
// ==============================
// File Management Utilities
// ==============================
/**
 * Manages all file operations for saving AI responses
 */
var FileManager = /** @class */ (function () {
    function FileManager() {
    }
    /**
     * Generates a timestamped filename in the responses directory
     */
    FileManager.getTimestampedFilename = function (prefix, extension) {
        if (prefix === void 0) { prefix = 'response'; }
        if (extension === void 0) { extension = '.txt'; }
        var now = new Date();
        var timestamp = now.toISOString().replace(/:/g, '-'); // Ensures filename is valid
        return path.join(config.responsesDir, "".concat(prefix, "-").concat(timestamp).concat(extension));
    };
    /**
     * Saves content to a file and returns the file path
     */
    FileManager.saveToFile = function (content, filePath) {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return filePath;
        }
        catch (error) {
            console.error("Error saving to file: ".concat(error));
            throw error;
        }
    };
    /**
     * Saves AI response with a timestamp and returns the file path
     */
    FileManager.saveResponseToFile = function (content, prefix, extension) {
        if (prefix === void 0) { prefix = 'response'; }
        if (extension === void 0) { extension = '.txt'; }
        var filePath = this.getTimestampedFilename(prefix, extension);
        return this.saveToFile(content, filePath);
    };
    return FileManager;
}());
// ==============================
// AI Request Utilities
// ==============================
/**
 * Provides templates for AI system prompts
 */
var PromptTemplates = /** @class */ (function () {
    function PromptTemplates() {
    }
    /**
     * Creates the system message for standard code review
     */
    PromptTemplates.createCodeReviewPrompt = function () {
        return "You are a strict AI code reviewer. Your response **must be structured into exactly 10 sections** using the format below:\n\n            #### Serious Problems\n            (List problems here, or write \"No issues found.\")\n\n            #### Warnings\n            (List warnings here, or write \"No issues found.\")\n\n            #### Refactoring Suggestions\n            (List suggestions here, or write \"No issues found.\")\n\n            #### Coding Conventions\n            (List convention violations here, or write \"No issues found.\")\n\n            #### Performance Optimization\n            (List optimizations here, or write \"No issues found.\")\n\n            #### Security Issues\n            (List security concerns here, or write \"No issues found.\")\n\n            #### Best Practices\n            (List best practices here, or write \"No issues found.\")\n\n            #### Readability and Maintainability\n            (List readability concerns here, or write \"No issues found.\")\n\n            #### Code Smells\n            (List code smells here, or write \"No issues found.\")\n\n            #### Educational Tips\n            (Provide useful coding tips, or write \"No issues found.\")\n\n            - \u274C Do **not** add introductions, summaries, or extra text.\n            - \u274C Do **not** create additional sections.\n            - \u2705 Format all section headers exactly as shown (**#### Category Name**).\n            - \u2705 For suggestions that would benefit from code examples, include them in a code block using ```language\n            - \u2705 Include code snippets when they would be helpful\n            - \u2705 Keep code snippets concise and focused on the specific issue\n            - \u2705 Use appropriate language tags in code blocks (e.g., ```typescript, ```javascript, etc.)";
    };
    /**
     * Creates the system message for comprehensive reports
     */
    PromptTemplates.createReportPrompt = function () {
        return "You are a senior code reviewer creating a comprehensive, formal code analysis report.\n    Your analysis should be extremely thorough, professional, and educational - suitable for enterprise documentation.\n    \n    CRITICAL FORMATTING INSTRUCTIONS:\n    1. Make your response as COMPREHENSIVE and DETAILED as possible within model limits\n    2. Provide specific, actionable insights with concrete examples\n    3. Include a numerical score (0-10) for EACH section in the exact format \"SectionName score: X/10\"\n    4. Use a consistent structure EXACTLY matching the template below\n    5. Format all section headers as \"## Section Name\" (h2 level)\n    6. Format all subsection headers as \"### Subsection Name\" (h3 level)\n    7. DO NOT add any introduction, conclusion, or ANY text outside the 10 sections\n    8. DO NOT include phrases like \"Here is my analysis\" or \"This report outlines\"\n    9. DO NOT add horizontal lines (---) or any other separators\n    10. Start IMMEDIATELY with section 1 (Executive Summary)\n    11. End IMMEDIATELY after section 10 (Learning Resources)\n    \n    LIST FORMATTING REQUIREMENTS:\n    - ONLY use bullet points (lines starting with * or -) for actual list items\n    - Main points within each section should be regular paragraphs, NOT bullet points\n    - Use bullet lists only for enumerated findings, benefits, or examples\n    - Within each section, include up to 3-4 bullet points maximum for key items\n    - DO NOT make every line a bullet point\n    \n    CODE EXAMPLES:\n    - Always include language identifier in code blocks: ```javascript, ```typescript, etc.\n    - Use actual code for examples, not pseudocode\n    - Make sure \"Before\" and \"After\" code examples have the exact same indentation style\n    - Keep code examples concise (5-15 lines) and focused on the specific issue\n    - ALWAYS use SEPARATE code blocks for \"Before\" and \"After\" examples, never combine them\n    - Label code examples with separate headings: \"### Before Example\" and \"### After Example\"\n    \n    CONTENT REQUIREMENTS:\n    - Provide thorough explanations in paragraph form for each section\n    - Break down complex concepts for educational value\n    - Include both positive findings and areas for improvement\n    - Justify all scores with detailed reasoning\n    \n    EXACTLY FOLLOW THIS REPORT STRUCTURE:\n    \n    ## Executive Summary\n    A paragraph overview of code quality and key findings.\n    \n    Overall quality score: X/10\n    \n    * Top strength 1\n    * Top strength 2\n    * Top strength 3\n    \n    * Area for improvement 1\n    * Area for improvement 2\n    * Area for improvement 3\n    \n    ## Code Architecture and Design\n    A paragraph analyzing overall architecture.\n    \n    A paragraph on component relationships.\n    \n    Design patterns used or missing, with explanation.\n    \n    Architectural score: X/10\n    \n    ## Critical Issues\n    A paragraph discussing high-priority issues.\n    \n    * Critical issue 1\n    * Critical issue 2\n    * Critical issue 3\n    \n    Critical issues score: X/10\n    \n    ## Code Quality Assessment\n    A paragraph on code readability and consistency.\n    \n    A paragraph on complexity and formatting issues.\n    \n    Quality score: X/10\n    \n    ## Performance Analysis\n    A paragraph describing potential bottlenecks and optimization opportunities.\n    \n    Resource usage concerns.\n    \n    Performance score: X/10\n    \n    ## Security Review\n    A paragraph covering security vulnerabilities.\n    \n    Data handling and input validation issues.\n    \n    Security score: X/10\n    \n    ## Maintainability Assessment\n    A paragraph on code duplication and documentation quality.\n    \n    Testing coverage/quality.\n    \n    Maintainability score: X/10\n    \n    ## Recommended Refactoring\n    A paragraph prioritizing refactoring suggestions.\n    \n    ### Before Example\n    ```language\n    // Before code\n    ```\n    \n    ### After Example\n    ```language\n    // After code\n    ```\n    \n    Expected benefits of refactoring.\n    \n    Refactoring impact score: X/10\n    \n    ## Best Practices Implementation\n    A paragraph discussing language-specific best practices.\n    \n    Industry standard adherence and framework usage optimization.\n    \n    Best practices score: X/10\n    \n    ## Learning Resources\n    A paragraph introducing the resources.\n    \n    * Resource 1: [Description and why it's valuable]\n    * Resource 2: [Description and why it's valuable]\n    * Resource 3: [Description and why it's valuable]\n    \n    Remember: DO NOT add ANY text before section 1 or after section 10. Start and end exactly with the defined sections.\n    DO NOT add stars, asterisks, or bullet points to the section headers themselves. Format them EXACTLY as \"## Section Name\".";
    };
    return PromptTemplates;
}());
/**
 * Handles error and timeout fallback responses
 */
var FallbackResponses = /** @class */ (function () {
    function FallbackResponses() {
    }
    /**
     * Creates a standard fallback response for timeout scenarios
     */
    FallbackResponses.createTimeoutResponse = function () {
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
    };
    /**
     * Creates a comprehensive report fallback response for timeout scenarios
     */
    FallbackResponses.createReportTimeoutResponse = function () {
        return "# Report Generation Timed Out\n\nThe report generation process took too long and timed out. This might be due to high server load or complexity of the code. Please try again later with a smaller code sample.";
    };
    /**
     * Handles API request timeout by generating and saving a fallback response
     */
    FallbackResponses.handleTimeout = function (error_1) {
        return __awaiter(this, arguments, void 0, function (error, isReport) {
            var fallbackContent, prefix, extension, fileName;
            if (isReport === void 0) { isReport = false; }
            return __generator(this, function (_a) {
                console.error("AI response failed: ".concat(error.message));
                if (error.message && error.message.includes('timed out')) {
                    fallbackContent = isReport
                        ? this.createReportTimeoutResponse()
                        : this.createTimeoutResponse();
                    prefix = isReport ? 'report-response-timeout' : 'response-timeout';
                    extension = isReport ? '.md' : '.txt';
                    fileName = FileManager.getTimestampedFilename(prefix, extension);
                    // Save the fallback response
                    FileManager.saveToFile(fallbackContent, fileName);
                    console.log("\u26A0\uFE0F Request timed out. Fallback response saved to: ".concat(fileName));
                    return [2 /*return*/, fileName];
                }
                throw error;
            });
        });
    };
    return FallbackResponses;
}());
/**
 * Manages requests to the OpenAI API
 */
var OpenAIService = /** @class */ (function () {
    function OpenAIService() {
    }
    /**
     * Truncates content if it exceeds maximum length
     */
    OpenAIService.truncateContent = function (content, maxLength) {
        if (content.length <= maxLength) {
            return content;
        }
        return content.slice(0, maxLength) + '\n\n[Content truncated due to length]';
    };
    /**
     * Sends a request to OpenAI API with timeout handling
     */
    OpenAIService.requestCompletion = function (prompt_1) {
        return __awaiter(this, arguments, void 0, function (prompt, isReport) {
            var model, maxLength, timeoutMs, truncatedPrompt, systemMessage, fullPrompt, timeoutPromise, completionPromise, completion, error_1;
            var _a, _b, _c, _d;
            if (isReport === void 0) { isReport = false; }
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        model = isReport ? "gpt-4o" : "gpt-4o-mini";
                        maxLength = isReport ? 16384 : 8192;
                        timeoutMs = isReport ? 40000 : 25000;
                        truncatedPrompt = this.truncateContent(prompt, maxLength);
                        systemMessage = isReport
                            ? PromptTemplates.createReportPrompt()
                            : PromptTemplates.createCodeReviewPrompt();
                        fullPrompt = isReport
                            ? "Create a comprehensive code review report for the following code:\n\n".concat(truncatedPrompt)
                            : "Review the following code:\n\n".concat(truncatedPrompt);
                        timeoutPromise = new Promise(function (_, reject) {
                            setTimeout(function () { return reject(new Error("Request timed out after ".concat(timeoutMs / 1000, " seconds"))); }, timeoutMs);
                        });
                        completionPromise = config.openai.chat.completions.create({
                            model: model,
                            messages: [
                                { role: "system", content: systemMessage },
                                { role: "user", content: fullPrompt },
                            ]
                        });
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.race([completionPromise, timeoutPromise])];
                    case 2:
                        completion = _e.sent();
                        if (!completion) {
                            throw new Error('No response received from AI service');
                        }
                        return [2 /*return*/, (_d = (_c = (_b = (_a = completion.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) !== null && _d !== void 0 ? _d : "No response from AI."];
                    case 3:
                        error_1 = _e.sent();
                        // Handle timeouts and other errors
                        return [2 /*return*/, FallbackResponses.handleTimeout(error_1, isReport)];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return OpenAIService;
}());
// ==============================
// Main Export Functions
// ==============================
/**
 * Gets an AI code review response for the provided code, saves it to file, and returns the file path
 */
function getAIResponse(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var response, fileName, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // If the content is empty, return empty response
                    if (!prompt || prompt.trim() === '') {
                        console.error('Empty prompt provided to AI service');
                        return [2 /*return*/, ''];
                    }
                    return [4 /*yield*/, OpenAIService.requestCompletion(prompt, false)];
                case 1:
                    response = _a.sent();
                    // If the response is a file path (from timeout handling), return it
                    if (response.startsWith(config.responsesDir)) {
                        return [2 /*return*/, response];
                    }
                    fileName = FileManager.getTimestampedFilename();
                    FileManager.saveToFile(response.trim(), fileName);
                    console.log("\u2705 AI response saved to: ".concat(fileName));
                    return [2 /*return*/, fileName];
                case 2:
                    error_2 = _a.sent();
                    console.error("Error with OpenAI API: ".concat(error_2));
                    return [2 /*return*/, ""];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Generates a comprehensive report using GPT-4o and saves it to a markdown file
 */
function generateReport(prompt) {
    return __awaiter(this, void 0, void 0, function () {
        var response, fileName, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // If the content is empty, return empty response
                    if (!prompt || prompt.trim() === '') {
                        console.error('Empty prompt provided to AI service for report');
                        return [2 /*return*/, ''];
                    }
                    return [4 /*yield*/, OpenAIService.requestCompletion(prompt, true)];
                case 1:
                    response = _a.sent();
                    // If the response is a file path (from timeout handling), return it
                    if (response.startsWith(config.responsesDir)) {
                        return [2 /*return*/, response];
                    }
                    fileName = FileManager.getTimestampedFilename('report-response', '.md');
                    FileManager.saveToFile(response.trim(), fileName);
                    console.log("\uD83D\uDCDD Report response saved to: ".concat(fileName));
                    return [2 /*return*/, fileName];
                case 2:
                    error_3 = _a.sent();
                    console.error("Error generating report: ".concat(error_3));
                    return [2 /*return*/, ""];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ==============================
// HTML Conversion Functions
// ==============================
/**
 * Handles conversion of markdown reports to formatted HTML
 */
var MarkdownConverter = /** @class */ (function () {
    function MarkdownConverter() {
    }
    /**
     * Cleans up any text outside the main sections
     */
    MarkdownConverter.cleanupExtraText = function (content) {
        // Extract the content between the first and last heading sections
        var firstHeadingMatch = content.match(/^#+\s+.*$/m);
        var lastHeadingMatch = content.match(/^#+\s+.*$(?![\s\S]*^#+\s+)/m);
        if (firstHeadingMatch && lastHeadingMatch) {
            var firstHeadingIndex = content.indexOf(firstHeadingMatch[0]);
            var lastHeadingContent = lastHeadingMatch[0];
            var lastSectionContent = content.substring(content.indexOf(lastHeadingContent));
            // Find the end of the last section
            var sections = lastSectionContent.split(/^#+\s+/m);
            if (sections.length > 0) {
                // Return just the content from first heading to the end of the last section
                return content.substring(firstHeadingIndex);
            }
        }
        return content; // Return original if we couldn't find the pattern
    };
    /**
     * Extracts code blocks and replaces them with placeholders
     */
    MarkdownConverter.extractCodeBlocks = function (content) {
        var codeBlocks = {};
        var codeBlockCounter = 0;
        // Replace code blocks with placeholders to preserve them during conversion
        var processedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, function (_match, lang, code) {
            var placeholder = "CODE_BLOCK_PLACEHOLDER_".concat(codeBlockCounter);
            var language = lang || 'text';
            var lines = code.trim().split('\n');
            var lineNumbers = '';
            var codeContent = '';
            // Generate line numbers and code content
            lines.forEach(function (line, index) {
                var lineNum = index + 1;
                lineNumbers += "<span class=\"line-number\">".concat(lineNum, "</span>\n");
                codeContent += "<span class=\"code-line\">".concat(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'), "</span>\n");
            });
            var codeBlockHtml = "\n<div class=\"code-block-wrapper\">\n    <div class=\"code-header\">\n        <span class=\"code-language\">".concat(language.toUpperCase() || 'TEXT', "</span>\n        <span class=\"copy-btn\" data-clipboard-target=\"#code-").concat(Date.now(), "-").concat(Math.floor(Math.random() * 1000), "\">Copy</span>\n    </div>\n    <pre class=\"language-").concat(language, "\"><div class=\"line-numbers\">").concat(lineNumbers, "</div><code id=\"code-").concat(Date.now(), "-").concat(Math.floor(Math.random() * 1000), "\">").concat(codeContent, "</code></pre>\n</div>");
            codeBlocks[placeholder] = codeBlockHtml;
            codeBlockCounter++;
            return placeholder;
        });
        console.log("Extracted ".concat(codeBlockCounter, " code blocks from markdown"));
        return { processedContent: processedContent, codeBlocks: codeBlocks };
    };
    /**
     * Converts markdown headers to HTML
     */
    MarkdownConverter.convertHeaders = function (content) {
        return content
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h2>$1</h2>') // Convert ### to h2 instead of h3
            .replace(/^#### (.*$)/gm, '<h3>$1</h3>') // Adjust remaining header levels
            .replace(/^##### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^###### (.*$)/gm, '<h5>$1</h5>');
    };
    /**
     * Converts markdown formatting (bold, italic) to HTML
     */
    MarkdownConverter.convertFormatting = function (content) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    };
    /**
     * Converts markdown inline code to HTML
     */
    MarkdownConverter.convertInlineCode = function (content) {
        return content.replace(/`([^`]+)`/g, '<code>$1</code>');
    };
    /**
     * Converts markdown lists to HTML
     */
    MarkdownConverter.convertLists = function (content) {
        var inList = false;
        var listContent = '';
        var htmlContentArray = [];
        content.split('\n').forEach(function (line) {
            // Check if this is an actual list item (starts with * or -)
            if (line.match(/^\s*[\*\-]\s+(.*)$/)) {
                // List item found
                if (!inList) {
                    inList = true;
                    listContent = '<ul>\n';
                }
                // Extract the content part (removing the bullet)
                var content_1 = line.replace(/^\s*[\*\-]\s+(.*)$/, '$1');
                // Don't wrap list content in paragraph tags
                listContent += "<li>".concat(content_1, "</li>\n");
            }
            else {
                // Not a list item
                if (inList) {
                    // End the current list
                    listContent += '</ul>';
                    htmlContentArray.push(listContent);
                    inList = false;
                }
                htmlContentArray.push(line);
            }
        });
        // Close any open list
        if (inList) {
            listContent += '</ul>';
            htmlContentArray.push(listContent);
        }
        return htmlContentArray.join('\n');
    };
    /**
     * Wraps non-HTML, non-placeholder text in paragraph tags
     */
    MarkdownConverter.convertParagraphs = function (content) {
        var paragraphProcessedLines = content.split('\n');
        var processedLines = [];
        // Process line by line to better handle code blocks
        for (var i = 0; i < paragraphProcessedLines.length; i++) {
            var line = paragraphProcessedLines[i];
            // Check if this line contains a code block placeholder
            if (line.includes('CODE_BLOCK_PLACEHOLDER')) {
                processedLines.push(line);
                continue;
            }
            // Skip empty lines
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            // Skip lines that already start with HTML
            if (line.trim().startsWith('<')) {
                processedLines.push(line);
                continue;
            }
            // Wrap non-HTML, non-placeholder lines in paragraph tags
            processedLines.push("<p>".concat(line, "</p>"));
        }
        return processedLines.join('\n');
    };
    /**
     * Formats numbered list items that are outside ordered lists
     */
    MarkdownConverter.formatNumberedItems = function (content) {
        return content.replace(/<p>\s*(\d+)\.\s+(.*?)<\/p>/g, '<p class="numbered-item"><span class="item-number">$1.</span> $2</p>');
    };
    /**
     * Restores code blocks from their placeholders
     */
    MarkdownConverter.restoreCodeBlocks = function (content, codeBlocks, codeBlockCounter) {
        var processedContent = content;
        // Debug logging to help diagnose placeholder issues
        console.log("Starting to restore ".concat(Object.keys(codeBlocks).length, " code blocks"));
        // First check for specific patterns in sections with code blocks
        var h2BeforeRefactoringRegex = /<h2>.*?Before Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2BeforeRefactoringRegex, function (match, placeholderNum) {
            var placeholder = "CODE_BLOCK_PLACEHOLDER_".concat(placeholderNum);
            if (codeBlocks[placeholder]) {
                console.log("Replaced \"Before Refactoring\" pattern for placeholder ".concat(placeholderNum));
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });
        var h2AfterRefactoringRegex = /<h2>.*?After Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2AfterRefactoringRegex, function (match, placeholderNum) {
            var placeholder = "CODE_BLOCK_PLACEHOLDER_".concat(placeholderNum);
            if (codeBlocks[placeholder]) {
                console.log("Replaced \"After Refactoring\" pattern for placeholder ".concat(placeholderNum));
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });
        var _loop_1 = function (i) {
            var placeholder = "CODE_BLOCK_PLACEHOLDER_".concat(i);
            // Create variations of the pattern we've seen in the wild
            var variations = [
                placeholder,
                "<p>".concat(placeholder, "</p>"),
                "<p>  ".concat(placeholder, "</p>"),
                "<p>".concat(placeholder.replace(/_/g, '<em>_</em>'), "</p>"),
                "<p>  ".concat(placeholder.replace(/_/g, '<em>_</em>'), "</p>"),
                "<p>CODE<em>BLOCK</em>PLACEHOLDER_".concat(i, "</p>"),
                "CODE<em>BLOCK</em>PLACEHOLDER_".concat(i),
                "<p>CODE_BLOCK<em>PLACEHOLDER</em>_".concat(i, "</p>"),
                "<p>CODE<em>_</em>BLOCK<em>_</em>PLACEHOLDER_".concat(i, "</p>"),
            ];
            // Try each variation for the placeholder
            variations.forEach(function (pattern) {
                if (processedContent.includes(pattern)) {
                    console.log("Found and replacing pattern: ".concat(pattern));
                    processedContent = processedContent.replace(pattern, codeBlocks[placeholder]);
                }
            });
            // Last resort: flexible regex to match any form with the same placeholder number
            var flexRegex = new RegExp("<p>(?:CODE)?(?:<em>)?[_]?(?:</em>)?(?:BLOCK)?(?:<em>)?[_]?(?:</em>)?PLACEHOLDER_".concat(i, "(?:\\s*|<em>.*?</em>|.*?)</p>"), 'g');
            processedContent = processedContent.replace(flexRegex, codeBlocks[placeholder]);
        };
        // Use a pattern matching approach with variations for each placeholder
        for (var i = 0; i < codeBlockCounter; i++) {
            _loop_1(i);
        }
        return processedContent;
    };
    /**
     * Reads and prepares template HTML, handling fallback if not found
     */
    MarkdownConverter.getTemplateHtml = function () {
        var templatePath = path.resolve(__dirname, '../src/templates/reportTemplate.html');
        try {
            return fs.readFileSync(templatePath, 'utf-8');
        }
        catch (error) {
            console.error("Error reading template: ".concat(error));
            // Fallback to inline template if the file doesn't exist
            return "\n            <!DOCTYPE html>\n            <html lang=\"en\">\n            <head>\n                <meta charset=\"UTF-8\">\n                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n                <title>Code Analysis Report</title>\n                <link rel=\"stylesheet\" href=\"{{cssPath}}\">\n            </head>\n            <body>\n                <header>\n                    <h1>Code Analysis Report</h1>\n                    <p id=\"report-date\">Generated on {{generationDate}}</p>\n                </header>\n                \n                <div class=\"toc\">\n                    <h3>Table of Contents</h3>\n                    <ul>\n                        <li><a href=\"#executive-summary\">Executive Summary</a></li>\n                        <li><a href=\"#code-architecture\">Code Architecture and Design</a></li>\n                        <li><a href=\"#critical-issues\">Critical Issues</a></li>\n                        <li><a href=\"#code-quality\">Code Quality Assessment</a></li>\n                        <li><a href=\"#performance-analysis\">Performance Analysis</a></li>\n                        <li><a href=\"#security-review\">Security Review</a></li>\n                        <li><a href=\"#maintainability\">Maintainability Assessment</a></li>\n                        <li><a href=\"#recommended-refactoring\">Recommended Refactoring</a></li>\n                        <li><a href=\"#best-practices\">Best Practices Implementation</a></li>\n                        <li><a href=\"#learning-resources\">Learning Resources</a></li>\n                    </ul>\n                </div>\n                \n                <main>\n                    {{processedContent}}\n                </main>\n                \n                <script src=\"{{scriptPath}}\"></script>\n            </body>\n            </html>";
        }
    };
    /**
     * Prepares assets directory and copies necessary files
     */
    MarkdownConverter.prepareAssets = function (htmlPath) {
        var htmlDir = path.dirname(htmlPath);
        var assetsDir = path.join(htmlDir, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        // Define paths for assets
        var cssPath = path.resolve(__dirname, '../src/styles/report.css');
        var scriptPath = path.resolve(__dirname, '../src/components/reportScript.js');
        var outputCssPath = path.join(assetsDir, 'report.css');
        var outputJsPath = path.join(assetsDir, 'report.js');
        try {
            // Copy the CSS and JS files to the output directory
            fs.copyFileSync(cssPath, outputCssPath);
            fs.copyFileSync(scriptPath, outputJsPath);
        }
        catch (error) {
            console.error("Error copying assets: ".concat(error));
            // If files don't exist, create them with the content from our code
            if (!fs.existsSync(outputCssPath)) {
                // Create CSS file with default styles
                fs.writeFileSync(outputCssPath, fs.readFileSync(path.resolve(__dirname, '../src/styles/report.css'), 'utf-8'));
            }
            if (!fs.existsSync(outputJsPath)) {
                // Create JS file with default script
                fs.writeFileSync(outputJsPath, fs.readFileSync(path.resolve(__dirname, '../src/components/reportScript.js'), 'utf-8'));
            }
        }
        // Calculate relative paths for the HTML file
        var relativeCssPath = path.relative(path.dirname(htmlPath), outputCssPath).replace(/\\/g, '/');
        var relativeJsPath = path.relative(path.dirname(htmlPath), outputJsPath).replace(/\\/g, '/');
        return { relativeCssPath: relativeCssPath, relativeJsPath: relativeJsPath };
    };
    return MarkdownConverter;
}());
/**
 * Converts a markdown file to HTML
 */
function convertMarkdownToHtml(markdownPath) {
    return __awaiter(this, void 0, void 0, function () {
        var markdownContent, htmlPath, cleanedContent, _a, contentWithPlaceholders, codeBlocks, codeBlockCounter, processedContent, templateHtml, _b, relativeCssPath, relativeJsPath, fullHtml;
        return __generator(this, function (_c) {
            try {
                console.log("Starting HTML conversion for: ".concat(markdownPath));
                markdownContent = fs.readFileSync(markdownPath, 'utf-8');
                htmlPath = markdownPath.replace('.md', '.html');
                cleanedContent = MarkdownConverter.cleanupExtraText(markdownContent);
                _a = MarkdownConverter.extractCodeBlocks(cleanedContent), contentWithPlaceholders = _a.processedContent, codeBlocks = _a.codeBlocks;
                codeBlockCounter = Object.keys(codeBlocks).length;
                processedContent = contentWithPlaceholders;
                processedContent = MarkdownConverter.convertHeaders(processedContent);
                processedContent = MarkdownConverter.convertFormatting(processedContent);
                processedContent = MarkdownConverter.convertInlineCode(processedContent);
                processedContent = MarkdownConverter.convertLists(processedContent);
                processedContent = MarkdownConverter.convertParagraphs(processedContent);
                processedContent = MarkdownConverter.formatNumberedItems(processedContent);
                // 3. Restore code blocks
                processedContent = MarkdownConverter.restoreCodeBlocks(processedContent, codeBlocks, codeBlockCounter);
                templateHtml = MarkdownConverter.getTemplateHtml();
                _b = MarkdownConverter.prepareAssets(htmlPath), relativeCssPath = _b.relativeCssPath, relativeJsPath = _b.relativeJsPath;
                fullHtml = templateHtml
                    .replace('{{cssPath}}', relativeCssPath)
                    .replace('{{scriptPath}}', relativeJsPath)
                    .replace('{{generationDate}}', new Date().toLocaleString())
                    .replace('{{processedContent}}', processedContent);
                // 6. Write the HTML file
                fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
                console.log("HTML file created: ".concat(htmlPath));
                return [2 /*return*/, htmlPath];
            }
            catch (error) {
                console.error("Error converting markdown to HTML: ".concat(error));
                return [2 /*return*/, markdownPath];
            }
            return [2 /*return*/];
        });
    });
}
