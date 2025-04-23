import * as path from 'path';
import * as fs from 'fs';

// turns markdown reports into pretty HTML
export class MarkdownConverter {
    // finds project root by looking for package.json
    private static findProjectRoot(): string {
        let currentDir = __dirname;
        // go up dirs till we find package.json
        while (currentDir !== path.parse(currentDir).root) {
            if (fs.existsSync(path.join(currentDir, 'package.json'))) {
                return currentDir;
            }
            currentDir = path.dirname(currentDir);
        }
        
        console.warn('Could not find project root, using a relative path fallback');
        // fallback - go up 3 levels if no package.json
        return path.resolve(__dirname, '../../..');
    }

    // removes junk text outside main sections
    public static cleanupExtraText(content: string): string {
        // grab content between first and last headings
        const firstHeadingMatch = content.match(/^#+\s+.*$/m);
        const lastHeadingMatch = content.match(/^#+\s+.*$(?![\s\S]*^#+\s+)/m);
        
        if (firstHeadingMatch && lastHeadingMatch) {
            const firstHeadingIndex = content.indexOf(firstHeadingMatch[0]);
            const lastHeadingContent = lastHeadingMatch[0];
            const lastSectionContent = content.substring(content.indexOf(lastHeadingContent));
            
            // find last section end
            const sections = lastSectionContent.split(/^#+\s+/m);
            if (sections.length > 0) {
                // just get content from first heading to end of last section
                return content.substring(firstHeadingIndex);
            }
        }
        
        return content; // keep original if pattern not found
    }

    // extracts code blocks & uses placeholders
    public static extractCodeBlocks(content: string): { processedContent: string, codeBlocks: {[key: string]: string} } {
        let codeBlocks: {[key: string]: string} = {};
        let codeBlockCounter = 0;
        
        // replace code blocks with placeholders
        const processedContent = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${codeBlockCounter}`;
            
            const language = lang || 'text';
            const lines = code.trim().split('\n');
            let lineNumbers = '';
            let codeContent = '';
            
            // make line nums and code content
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

    // converts md headers to HTML
    public static convertHeaders(content: string): string {
        return content
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h2>$1</h2>') // treat ### as h2 too
            .replace(/^#### (.*$)/gm, '<h3>$1</h3>') // adjust other levels
            .replace(/^##### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^###### (.*$)/gm, '<h5>$1</h5>');
    }

    // converts md format (bold/italic) to HTML
    public static convertFormatting(content: string): string {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/_(.*?)_/g, '<em>$1</em>');
    }

    // converts inline code to HTML
    public static convertInlineCode(content: string): string {
        return content.replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // converts md lists to HTML
    public static convertLists(content: string): string {
        let inList = false;
        let listContent = '';
        let htmlContentArray = [];
        
        content.split('\n').forEach(line => {
            // check if list item (starts with * or -)
            if (line.match(/^\s*[\*\-]\s+(.*)$/)) {
                // found one
                if (!inList) {
                    inList = true;
                    listContent = '<ul>\n';
                }
                
                // grab content (minus bullet)
                const content = line.replace(/^\s*[\*\-]\s+(.*)$/, '$1');
                // no paragraph tags for list items
                listContent += `<li>${content}</li>\n`;
            } else {
                // not a list item
                if (inList) {
                    // end list
                    listContent += '</ul>';
                    htmlContentArray.push(listContent);
                    inList = false;
                }
                htmlContentArray.push(line);
            }
        });
        
        // close any open list
        if (inList) {
            listContent += '</ul>';
            htmlContentArray.push(listContent);
        }
        
        return htmlContentArray.join('\n');
    }

    // wraps regular text in <p> tags
    public static convertParagraphs(content: string): string {
        const paragraphProcessedLines = content.split('\n');
        const processedLines = [];
        
        // go line by line for code blocks
        for (let i = 0; i < paragraphProcessedLines.length; i++) {
            const line = paragraphProcessedLines[i];
            
            // skip code placeholders
            if (line.includes('CODE_BLOCK_PLACEHOLDER')) {
                processedLines.push(line);
                continue;
            }
            
            // skip empty lines
            if (!line.trim()) {
                processedLines.push(line);
                continue;
            }
            
            // skip existing HTML
            if (line.trim().startsWith('<')) {
                processedLines.push(line);
                continue;
            }
            
            // wrap normal lines in paragraph tags
            processedLines.push(`<p>${line}</p>`);
        }
        
        return processedLines.join('\n');
    }

    // formats numbered items outside lists
    public static formatNumberedItems(content: string): string {
        return content.replace(
            /<p>\s*(\d+)\.\s+(.*?)<\/p>/g,
            '<p class="numbered-item"><span class="item-number">$1.</span> $2</p>'
        );
    }

    // puts code blocks back from placeholders
    public static restoreCodeBlocks(content: string, codeBlocks: {[key: string]: string}, codeBlockCounter: number): string {
        let processedContent = content;
        
        // debug log
        console.log(`Starting to restore ${Object.keys(codeBlocks).length} code blocks`);
        
        // check for refactoring sections with code blocks
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

        // try different patterns for each placeholder
        for (let i = 0; i < codeBlockCounter; i++) {
            const placeholder = `CODE_BLOCK_PLACEHOLDER_${i}`;
            
            // patterns we've seen break in the wild
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
            
            // try each pattern
            variations.forEach(pattern => {
                if (processedContent.includes(pattern)) {
                    console.log(`Found and replacing pattern: ${pattern}`);
                    processedContent = processedContent.replace(pattern, codeBlocks[placeholder]);
                }
            });
            
            // last chance - flexible regex
            const flexRegex = new RegExp(`<p>(?:CODE)?(?:<em>)?[_]?(?:</em>)?(?:BLOCK)?(?:<em>)?[_]?(?:</em>)?PLACEHOLDER_${i}(?:\\s*|<em>.*?</em>|.*?)</p>`, 'g');
            processedContent = processedContent.replace(flexRegex, codeBlocks[placeholder]);
        }
        
        return processedContent;
    }

    // gets HTML template, with fallback
    public static getTemplateHtml(): string {
        const projectRoot = this.findProjectRoot();
        const templatePath = path.join(projectRoot, 'src', 'templates', 'reportTemplate.html');
        console.log(`Looking for template at: ${templatePath}`);
        
        try {
            return fs.readFileSync(templatePath, 'utf-8');
        } catch (error) {
            console.error(`Error reading template: ${error}`);
            // inline template fallback if file not found
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

    // sets up assets dir & copies files
    public static prepareAssets(htmlPath: string): { relativeCssPath: string, relativeJsPath: string } {
        const htmlDir = path.dirname(htmlPath);
        const assetsDir = path.join(htmlDir, 'assets');
        
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        // find asset files from project root
        const projectRoot = this.findProjectRoot();
        const cssPath = path.join(projectRoot, 'src', 'styles', 'report.css');
        const scriptPath = path.join(projectRoot, 'src', 'components', 'reportScript.js');
        const outputCssPath = path.join(assetsDir, 'report.css');
        const outputJsPath = path.join(assetsDir, 'report.js');
        
        console.log(`Looking for CSS at: ${cssPath}`);
        console.log(`Looking for JS at: ${scriptPath}`);
        
        try {
            // copy CSS/JS to output dir
            fs.copyFileSync(cssPath, outputCssPath);
            fs.copyFileSync(scriptPath, outputJsPath);
        } catch (error) {
            console.error(`Error copying assets: ${error}`);
            
            // file not found? create with defaults
            if (!fs.existsSync(outputCssPath)) {
                // try one more CSS path
                const fallbackCssPath = path.join(projectRoot, 'src', 'styles', 'report.css');
                if (fs.existsSync(fallbackCssPath)) {
                    fs.writeFileSync(outputCssPath, fs.readFileSync(fallbackCssPath, 'utf-8'));
                } else {
                    console.error(`Could not find CSS at ${fallbackCssPath}`);
                    // minimal CSS
                    fs.writeFileSync(outputCssPath, `body { font-family: Arial, sans-serif; }`);
                }
            }
            
            if (!fs.existsSync(outputJsPath)) {
                // try one more JS path
                const fallbackJsPath = path.join(projectRoot, 'src', 'components', 'reportScript.js');
                if (fs.existsSync(fallbackJsPath)) {
                    fs.writeFileSync(outputJsPath, fs.readFileSync(fallbackJsPath, 'utf-8'));
                } else {
                    console.error(`Could not find JS at ${fallbackJsPath}`);
                    // minimal JS
                    fs.writeFileSync(outputJsPath, `console.log('Report loaded');`);
                }
            }
        }
        
        // make relative paths for HTML file
        const relativeCssPath = path.relative(path.dirname(htmlPath), outputCssPath).replace(/\\/g, '/');
        const relativeJsPath = path.relative(path.dirname(htmlPath), outputJsPath).replace(/\\/g, '/');
        
        return { relativeCssPath, relativeJsPath };
    }
}

// converts md file to HTML
export async function convertMarkdownToHtml(markdownPath: string): Promise<string> {
    try {
        console.log(`Starting HTML conversion for: ${markdownPath}`);
        
        // read markdown
        const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
        
        // make HTML filename
        const htmlPath = markdownPath.replace('.md', '.html');
        
        // process in steps to keep formatting
        
        // 1. cleanup & extract code blocks
        const cleanedContent = MarkdownConverter.cleanupExtraText(markdownContent);
        const { processedContent: contentWithPlaceholders, codeBlocks } = MarkdownConverter.extractCodeBlocks(cleanedContent);
        const codeBlockCounter = Object.keys(codeBlocks).length;
        
        // 2. convert md -> HTML in sequence
        let processedContent = contentWithPlaceholders;
        processedContent = MarkdownConverter.convertHeaders(processedContent);
        processedContent = MarkdownConverter.convertFormatting(processedContent);
        processedContent = MarkdownConverter.convertInlineCode(processedContent);
        processedContent = MarkdownConverter.convertLists(processedContent);
        processedContent = MarkdownConverter.convertParagraphs(processedContent);
        processedContent = MarkdownConverter.formatNumberedItems(processedContent);
        
        // 3. put code blocks back
        processedContent = MarkdownConverter.restoreCodeBlocks(processedContent, codeBlocks, codeBlockCounter);
        
        // 4. get template & assets
        const templateHtml = MarkdownConverter.getTemplateHtml();
        const { relativeCssPath, relativeJsPath } = MarkdownConverter.prepareAssets(htmlPath);
        
        // 5. fill in template
        const fullHtml = templateHtml
            .replace('{{cssPath}}', relativeCssPath)
            .replace('{{scriptPath}}', relativeJsPath)
            .replace('{{generationDate}}', new Date().toLocaleString())
            .replace('{{processedContent}}', processedContent);
        
        // 6. write HTML file
        fs.writeFileSync(htmlPath, fullHtml, 'utf-8');
        console.log(`HTML file created: ${htmlPath}`);
        
        return htmlPath;
        
    } catch (error) {
        console.error(`Error converting markdown to HTML: ${error}`);
        return markdownPath;
    }
} 