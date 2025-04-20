import * as path from 'path';
import * as fs from 'fs';

/**
 * Handles conversion of markdown reports to formatted HTML
 */
export class MarkdownConverter {
    /**
     * Finds the project root directory by looking for package.json
     */
    private static findProjectRoot(): string {
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
     * Cleans up any text outside the main sections
     */
    public static cleanupExtraText(content: string): string {
        // Extract the content between the first and last heading sections
        const firstHeadingMatch = content.match(/^#+\s+.*$/m);
        const lastHeadingMatch = content.match(/^#+\s+.*$(?![\s\S]*^#+\s+)/m);
        
        if (firstHeadingMatch && lastHeadingMatch) {
            const firstHeadingIndex = content.indexOf(firstHeadingMatch[0]);
            const lastHeadingContent = lastHeadingMatch[0];
            const lastSectionContent = content.substring(content.indexOf(lastHeadingContent));
            
            // Find the end of the last section
            const sections = lastSectionContent.split(/^#+\s+/m);
            if (sections.length > 0) {
                // Return just the content from first heading to the end of the last section
                return content.substring(firstHeadingIndex);
            }
        }
        
        return content; // Return original if we couldn't find the pattern
    }

    /**
     * Extracts code blocks and replaces them with placeholders
     */
    public static extractCodeBlocks(content: string): { processedContent: string, codeBlocks: {[key: string]: string} } {
        let codeBlocks: {[key: string]: string} = {};
        let codeBlockCounter = 0;
        
        // Replace code blocks with placeholders to preserve them during conversion
        const processedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${codeBlockCounter}`;
            
            const language = lang || 'text';
            const lines = code.trim().split('\n');
            let lineNumbers = '';
            let codeContent = '';
            
            // Generate line numbers and code content
            lines.forEach((line: string, index: number) => {
                const lineNum = index + 1;
                lineNumbers += `<span class="line-number">${lineNum}</span>\n`;
                codeContent += `<span class="code-line">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>\n`;
            });
            
            const codeBlockHtml = `
<div class="code-block-wrapper">
    <div class="code-header">
        <span class="code-language">${language.toUpperCase() || 'TEXT'}</span>
        <span class="copy-btn" data-clipboard-target="#code-${Date.now()}-${Math.floor(Math.random() * 1000)}">Copy</span>
    </div>
    <pre class="language-${language}"><div class="line-numbers">${lineNumbers}</div><code id="code-${Date.now()}-${Math.floor(Math.random() * 1000)}">${codeContent}</code></pre>
</div>`;
            
            codeBlocks[placeholder] = codeBlockHtml;
            codeBlockCounter++;
            return placeholder;
        });
        
        console.log(`Extracted ${codeBlockCounter} code blocks from markdown`);
        
        return { processedContent, codeBlocks };
    }

    /**
     * Converts markdown headers to HTML
     */
    public static convertHeaders(content: string): string {
        return content
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h2>$1</h2>') // Convert ### to h2 instead of h3
            .replace(/^#### (.*$)/gm, '<h3>$1</h3>') // Adjust remaining header levels
            .replace(/^##### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^###### (.*$)/gm, '<h5>$1</h5>');
    }

    /**
     * Converts markdown formatting (bold, italic) to HTML
     */
    public static convertFormatting(content: string): string {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    }

    /**
     * Converts markdown inline code to HTML
     */
    public static convertInlineCode(content: string): string {
        return content.replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    /**
     * Converts markdown lists to HTML
     */
    public static convertLists(content: string): string {
        let inList = false;
        let listContent = '';
        let htmlContentArray = [];
        
        content.split('\n').forEach(line => {
            // Check if this is an actual list item (starts with * or -)
            if (line.match(/^\s*[\*\-]\s+(.*)$/)) {
                // List item found
                if (!inList) {
                    inList = true;
                    listContent = '<ul>\n';
                }
                
                // Extract the content part (removing the bullet)
                const content = line.replace(/^\s*[\*\-]\s+(.*)$/, '$1');
                // Don't wrap list content in paragraph tags
                listContent += `<li>${content}</li>\n`;
            } else {
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
    }

    /**
     * Wraps non-HTML, non-placeholder text in paragraph tags
     */
    public static convertParagraphs(content: string): string {
        const paragraphProcessedLines = content.split('\n');
        const processedLines = [];
        
        // Process line by line to better handle code blocks
        for (let i = 0; i < paragraphProcessedLines.length; i++) {
            const line = paragraphProcessedLines[i];
            
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
            processedLines.push(`<p>${line}</p>`);
        }
        
        return processedLines.join('\n');
    }

    /**
     * Formats numbered list items that are outside ordered lists
     */
    public static formatNumberedItems(content: string): string {
        return content.replace(
            /<p>\s*(\d+)\.\s+(.*?)<\/p>/g,
            '<p class="numbered-item"><span class="item-number">$1.</span> $2</p>'
        );
    }

    /**
     * Restores code blocks from their placeholders
     */
    public static restoreCodeBlocks(content: string, codeBlocks: {[key: string]: string}, codeBlockCounter: number): string {
        let processedContent = content;
        
        // Debug logging to help diagnose placeholder issues
        console.log(`Starting to restore ${Object.keys(codeBlocks).length} code blocks`);
        
        // First check for specific patterns in sections with code blocks
        const h2BeforeRefactoringRegex = /<h2>.*?Before Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2BeforeRefactoringRegex, (match, placeholderNum) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${placeholderNum}`;
            if (codeBlocks[placeholder]) {
                console.log(`Replaced "Before Refactoring" pattern for placeholder ${placeholderNum}`);
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });

        const h2AfterRefactoringRegex = /<h2>.*?After Refactoring.*?<\/h2>\s*<p>CODE[_<].*?PLACEHOLDER_(\d+).*?<\/p>/g;
        processedContent = processedContent.replace(h2AfterRefactoringRegex, (match, placeholderNum) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${placeholderNum}`;
            if (codeBlocks[placeholder]) {
                console.log(`Replaced "After Refactoring" pattern for placeholder ${placeholderNum}`);
                return match.replace(/<p>CODE[_<].*?PLACEHOLDER_\d+.*?<\/p>/, codeBlocks[placeholder]);
            }
            return match;
        });

        // Use a pattern matching approach with variations for each placeholder
        for (let i = 0; i < codeBlockCounter; i++) {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${i}`;
            
            // Create variations of the pattern we've seen in the wild
            const variations = [
                placeholder,
                `<p>${placeholder}</p>`,
                `<p>  ${placeholder}</p>`,
                `<p>${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                `<p>  ${placeholder.replace(/_/g, '<em>_</em>')}</p>`,
                `<p>CODE<em>BLOCK</em>PLACEHOLDER_${i}</p>`,
                `CODE<em>BLOCK</em>PLACEHOLDER_${i}`,
                `<p>CODE_BLOCK<em>PLACEHOLDER</em>_${i}</p>`,
                `<p>CODE<em>_</em>BLOCK<em>_</em>PLACEHOLDER_${i}</p>`,
            ];
            
            // Try each variation for the placeholder
            variations.forEach(pattern => {
                if (processedContent.includes(pattern)) {
                    console.log(`Found and replacing pattern: ${pattern}`);
                    processedContent = processedContent.replace(pattern, codeBlocks[placeholder]);
                }
            });
            
            // Last resort: flexible regex to match any form with the same placeholder number
            const flexRegex = new RegExp(`<p>(?:CODE)?(?:<em>)?[_]?(?:</em>)?(?:BLOCK)?(?:<em>)?[_]?(?:</em>)?PLACEHOLDER_${i}(?:\\s*|<em>.*?</em>|.*?)</p>`, 'g');
            processedContent = processedContent.replace(flexRegex, codeBlocks[placeholder]);
        }
        
        return processedContent;
    }

    /**
     * Reads and prepares template HTML, handling fallback if not found
     */
    public static getTemplateHtml(): string {
        const projectRoot = this.findProjectRoot();
        const templatePath = path.join(projectRoot, 'src', 'templates', 'reportTemplate.html');
        console.log(`Looking for template at: ${templatePath}`);
        
        try {
            return fs.readFileSync(templatePath, 'utf-8');
        } catch (error) {
            console.error(`Error reading template: ${error}`);
            // Fallback to inline template if the file doesn't exist
            return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code Analysis Report</title>
                <link rel="stylesheet" href="{{cssPath}}">
            </head>
            <body>
                <header>
                    <h1>Code Analysis Report</h1>
                    <p id="report-date">Generated on {{generationDate}}</p>
                </header>
                
                <div class="toc">
                    <h3>Table of Contents</h3>
                    <ul>
                        <li><a href="#executive-summary">Executive Summary</a></li>
                        <li><a href="#code-architecture">Code Architecture and Design</a></li>
                        <li><a href="#critical-issues">Critical Issues</a></li>
                        <li><a href="#code-quality">Code Quality Assessment</a></li>
                        <li><a href="#performance-analysis">Performance Analysis</a></li>
                        <li><a href="#security-review">Security Review</a></li>
                        <li><a href="#maintainability">Maintainability Assessment</a></li>
                        <li><a href="#recommended-refactoring">Recommended Refactoring</a></li>
                        <li><a href="#best-practices">Best Practices Implementation</a></li>
                        <li><a href="#learning-resources">Learning Resources</a></li>
                    </ul>
                </div>
                
                <main>
                    {{processedContent}}
                </main>
                
                <script src="{{scriptPath}}"></script>
            </body>
            </html>`;
        }
    }

    /**
     * Prepares assets directory and copies necessary files
     */
    public static prepareAssets(htmlPath: string): { relativeCssPath: string, relativeJsPath: string } {
        const htmlDir = path.dirname(htmlPath);
        const assetsDir = path.join(htmlDir, 'assets');
        
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        // Use project root to find asset files
        const projectRoot = this.findProjectRoot();
        const cssPath = path.join(projectRoot, 'src', 'styles', 'report.css');
        const scriptPath = path.join(projectRoot, 'src', 'components', 'reportScript.js');
        const outputCssPath = path.join(assetsDir, 'report.css');
        const outputJsPath = path.join(assetsDir, 'report.js');
        
        console.log(`Looking for CSS at: ${cssPath}`);
        console.log(`Looking for JS at: ${scriptPath}`);
        
        try {
            // Copy the CSS and JS files to the output directory
            fs.copyFileSync(cssPath, outputCssPath);
            fs.copyFileSync(scriptPath, outputJsPath);
        } catch (error) {
            console.error(`Error copying assets: ${error}`);
            
            // If files don't exist, create them with the content from our code
            if (!fs.existsSync(outputCssPath)) {
                // Create CSS file with default styles
                const fallbackCssPath = path.join(projectRoot, 'src', 'styles', 'report.css');
                if (fs.existsSync(fallbackCssPath)) {
                    fs.writeFileSync(outputCssPath, fs.readFileSync(fallbackCssPath, 'utf-8'));
                } else {
                    console.error(`Could not find CSS at ${fallbackCssPath}`);
                    // Create a minimal CSS file
                    fs.writeFileSync(outputCssPath, `body { font-family: Arial, sans-serif; }`);
                }
            }
            
            if (!fs.existsSync(outputJsPath)) {
                // Create JS file with default script
                const fallbackJsPath = path.join(projectRoot, 'src', 'components', 'reportScript.js');
                if (fs.existsSync(fallbackJsPath)) {
                    fs.writeFileSync(outputJsPath, fs.readFileSync(fallbackJsPath, 'utf-8'));
                } else {
                    console.error(`Could not find JS at ${fallbackJsPath}`);
                    // Create a minimal JS file
                    fs.writeFileSync(outputJsPath, `console.log('Report loaded');`);
                }
            }
        }
        
        // Calculate relative paths for the HTML file
        const relativeCssPath = path.relative(path.dirname(htmlPath), outputCssPath).replace(/\\/g, '/');
        const relativeJsPath = path.relative(path.dirname(htmlPath), outputJsPath).replace(/\\/g, '/');
        
        return { relativeCssPath, relativeJsPath };
    }
}

/**
 * Converts a markdown file to HTML using the MarkdownConverter
 */
export async function convertMarkdownToHtml(markdownPath: string): Promise<string> {
    try {
        console.log(`Starting HTML conversion for: ${markdownPath}`);
        
        // Read the markdown content
        const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
        
        // Create HTML filename
        const htmlPath = markdownPath.replace('.md', '.html');
        
        // Process markdown in steps to maintain formatting integrity
        
        // 1. Clean up and extract code blocks
        const cleanedContent = MarkdownConverter.cleanupExtraText(markdownContent);
        const { processedContent: contentWithPlaceholders, codeBlocks } = MarkdownConverter.extractCodeBlocks(cleanedContent);
        const codeBlockCounter = Object.keys(codeBlocks).length;
        
        // 2. Convert markdown to HTML in sequence
        let processedContent = contentWithPlaceholders;
        processedContent = MarkdownConverter.convertHeaders(processedContent);
        processedContent = MarkdownConverter.convertFormatting(processedContent);
        processedContent = MarkdownConverter.convertInlineCode(processedContent);
        processedContent = MarkdownConverter.convertLists(processedContent);
        processedContent = MarkdownConverter.convertParagraphs(processedContent);
        processedContent = MarkdownConverter.formatNumberedItems(processedContent);
        
        // 3. Restore code blocks
        processedContent = MarkdownConverter.restoreCodeBlocks(processedContent, codeBlocks, codeBlockCounter);
        
        // 4. Get HTML template and prepare assets
        const templateHtml = MarkdownConverter.getTemplateHtml();
        const { relativeCssPath, relativeJsPath } = MarkdownConverter.prepareAssets(htmlPath);
        
        // 5. Replace template placeholders
        const fullHtml = templateHtml
            .replace('{{cssPath}}', relativeCssPath)
            .replace('{{scriptPath}}', relativeJsPath)
            .replace('{{generationDate}}', new Date().toLocaleString())
            .replace('{{processedContent}}', processedContent);
        
        // 6. Write the HTML file
        fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
        console.log(`HTML file created: ${htmlPath}`);
        
        return htmlPath;
        
    } catch (error) {
        console.error(`Error converting markdown to HTML: ${error}`);
        return markdownPath;
    }
} 