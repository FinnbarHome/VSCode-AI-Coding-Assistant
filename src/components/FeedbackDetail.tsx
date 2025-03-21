import React from "react";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import "../styles/feedbackDetail.css";

interface FeedbackDetailProps {
    category: string;
    content: string;
    type: 'error' | 'warning' | 'info';
    showHeader?: boolean;
}

const FeedbackDetail: React.FC<FeedbackDetailProps> = ({ 
    category, 
    content, 
    type,
    showHeader = true
}) => {
    const getIcon = () => {
        switch (type) {
            case "error": return <AlertCircle color="#f87171" size={20} />;
            case "warning": return <AlertTriangle color="#facc15" size={20} />;
            default: return <Info color="#10b981" size={20} />;
        }
    };

    // Format content as bullet points if it contains multiple items
    const formatContent = () => {
        // Check if content is empty or "No issues found"
        if (!content || content.toLowerCase().includes('no issues found')) {
            return (
                <div className="feedback-empty">
                    <span className="feedback-checkmark">✓</span>
                    <span>No issues found in this category</span>
                </div>
            );
        }

        // Split content into bullet points
        const bulletPoints = splitIntoBulletPoints(content);
        
        if (bulletPoints.length > 1) {
            return (
                <ul className="vscode-list">
                    {bulletPoints.map((point, index) => (
                        <li key={index} className="vscode-list-item">
                            <div className="list-item-content">
                                <span className="list-item-icon">{getItemIcon(type)}</span>
                                <div className="list-item-text">
                                    {formatTextWithCode(point)}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            );
        }
        
        // If only one item, display without list
        return (
            <div className="single-item">
                <span className="list-item-icon">{getItemIcon(type)}</span>
                <div className="list-item-text">
                    {formatTextWithCode(content)}
                </div>
            </div>
        );
    };

    // Format text that may contain code blocks
    const formatTextWithCode = (text: string) => {
        // Check if the text contains code blocks
        if (!text.includes('```')) {
            // Check if the text contains nested section headers
            if (text.match(/\n#{1,4}\s+/)) {
                return formatNestedSections(text);
            }
            return <span>{text}</span>;
        }

        try {
            // Improved regex to better match code blocks with language tags
            // This handles both inline and multi-line code blocks
            const codeBlockRegex = /(```[\w]*[\s\S]*?```)/g;
            const parts = text.split(codeBlockRegex).filter(part => part.trim().length > 0);
            
            return parts.map((part, index) => {
                // Check if this part contains a nested section header
                if (part.match(/\n#{1,4}\s+/)) {
                    return formatNestedSections(part);
                }
                
                if (part.startsWith('```')) {
                    try {
                        // Extract language and code with improved regex
                        const match = part.match(/```([\w]*)\n?([\s\S]*?)```/);
                        if (match) {
                            const [, language, code] = match;
                            const displayLanguage = language || 'text';
                            
                            // Clean up the code by removing extra whitespace
                            const cleanedCode = code.trim()
                                .replace(/^\s+/gm, (m) => m.replace(/\s/g, ' ')) // Replace leading tabs/spaces with single spaces
                                .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newlines
                            
                            return (
                                <div key={index} className="code-snippet">
                                    <div className="code-language">{displayLanguage}</div>
                                    <pre>
                                        <code className={language ? `language-${language}` : ''}>
                                            {cleanedCode}
                                        </code>
                                    </pre>
                                </div>
                            );
                        }
                        
                        // If regex didn't match but it starts with ```, try a simpler approach
                        const lines = part.split('\n');
                        const firstLine = lines[0].trim();
                        
                        // Extract language from first line
                        const langMatch = firstLine.match(/^```([\w]*)/);
                        const language = langMatch ? langMatch[1] : '';
                        
                        // Extract code (everything between first and last line)
                        let codeContent = '';
                        if (lines.length > 1) {
                            // Remove first line (```language) and last line (```)
                            const lastLineIndex = lines[lines.length - 1].trim() === '```' ? lines.length - 1 : lines.length;
                            codeContent = lines.slice(1, lastLineIndex).join('\n');
                        }
                        
                        return (
                            <div key={index} className="code-snippet">
                                <div className="code-language">{language || 'text'}</div>
                                <pre>
                                    <code className={language ? `language-${language}` : ''}>
                                        {codeContent.trim()}
                                    </code>
                                </pre>
                            </div>
                        );
                    } catch (error) {
                        // If there's an error parsing the code block, just display it as text
                        console.error("Error parsing code block:", error);
                        return <span key={index}>{part}</span>;
                    }
                }
                return <span key={index}>{part}</span>;
            });
        } catch (error) {
            // If there's an error with the regex or splitting, just return the original text
            console.error("Error formatting code:", error);
            return <span>{text}</span>;
        }
    };
    
    // Format text with nested section headers
    const formatNestedSections = (text: string) => {
        // First, check if this is a Refactoring Suggestions section with nested content
        const isRefactoringSuggestion = category === "Refactoring Suggestions" && text.includes("####");
        
        // If it's a Refactoring Suggestion with nested content, handle it specially
        if (isRefactoringSuggestion) {
            // Extract the main bullet points before any nested sections
            const mainContent = text.split(/\n#{1,4}\s+/)[0].trim();
            
            // Extract all nested sections
            const nestedSections = text.match(/\n#{1,4}\s+.+(?:\n(?!#{1,4}\s+).+)*/g) || [];
            
            return (
                <div className="nested-sections">
                    {/* Render the main content first if it exists */}
                    {mainContent && (
                        <div className="nested-content">
                            {formatTextWithCode(mainContent)}
                        </div>
                    )}
                    
                    {/* Render each nested section */}
                    {nestedSections.map((section, index) => {
                        const headerMatch = section.match(/\n#{1,4}\s+(.+)$/m);
                        const headerText = headerMatch ? headerMatch[1].trim() : `Section ${index + 1}`;
                        const headerLevel = (section.match(/\n(#{1,4})\s+/) || ['', '#'])[1].length;
                        
                        // Get the content after the header
                        const sectionContent = section.replace(/\n#{1,4}\s+.+\n/m, '').trim();
                        
                        return (
                            <div key={index} className="nested-section">
                                <div className={`nested-header level-${headerLevel}`}>
                                    {headerText}
                                </div>
                                <div className="nested-content">
                                    {formatTextWithCode(sectionContent)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }
        
        // For regular nested sections (not Refactoring Suggestions)
        // Split the text by section headers
        const parts = text.split(/\n(#{1,4}\s+.*)/g);
        
        return (
            <div className="nested-sections">
                {parts.map((part, index) => {
                    // Check if this part is a section header
                    if (part.match(/^#{1,4}\s+/)) {
                        const headerLevel = (part.match(/^(#{1,4})\s+/) || ['', '#'])[1].length;
                        const headerText = part.replace(/^#{1,4}\s+/, '');
                        
                        return (
                            <div key={index} className={`nested-header level-${headerLevel}`}>
                                {headerText}
                            </div>
                        );
                    }
                    
                    // Check if this part contains code blocks
                    if (part.includes('```')) {
                        return <div key={index}>{formatTextWithCode(part)}</div>;
                    }
                    
                    return <div key={index}>{part}</div>;
                })}
            </div>
        );
    };
    
    // Helper function to split content into bullet points
    const splitIntoBulletPoints = (text: string): string[] => {
        // If the text contains code blocks, we need to handle them carefully
        if (text.includes('```')) {
            // First, check if the text already contains bullet points
            if (text.match(/^[-•*]\s+/m) || text.match(/^\d+\.\s+/m)) {
                // Split by newlines but preserve code blocks
                const lines = text.split('\n');
                const bulletPoints: string[] = [];
                let currentPoint = '';
                let inCodeBlock = false;
                
                for (const line of lines) {
                    // Toggle code block state
                    if (line.trim().startsWith('```')) {
                        inCodeBlock = !inCodeBlock;
                        currentPoint += line + '\n';
                        continue;
                    }
                    
                    // If in code block, add to current point
                    if (inCodeBlock) {
                        currentPoint += line + '\n';
                        continue;
                    }
                    
                    // Check if this is a new bullet point
                    if ((line.trim().match(/^[-•*]\s+/) || line.trim().match(/^\d+\.\s+/)) && currentPoint) {
                        bulletPoints.push(currentPoint.trim());
                        currentPoint = line + '\n';
                    } else {
                        currentPoint += line + '\n';
                    }
                }
                
                // Add the last point if any
                if (currentPoint.trim()) {
                    bulletPoints.push(currentPoint.trim());
                }
                
                return bulletPoints;
            }
        }
        
        // If the text already contains bullet points (- or numbers)
        if (text.match(/^[-•*]\s+/m) || text.match(/^\d+\.\s+/m)) {
            return text.split(/\n+/).filter(line => line.trim().length > 0);
        }
        
        // Otherwise split by periods, but be careful with abbreviations and numbers
        const points = text.split(/\.(?=\s|$)/).filter(s => s.trim().length > 0);
        return points.map(p => p.trim() + (p.endsWith('.') ? '' : '.'));
    };
    
    // Get appropriate icon for list items
    const getItemIcon = (itemType: string) => {
        switch (itemType) {
            case 'error': return '🔴'; // Red circle for errors
            case 'warning': return '🟠'; // Orange circle for warnings
            default: return '🔵'; // Blue circle for info
        }
    };

    return (
        <div className="vscode-panel" data-type={type}>
            {showHeader && (
                <div className="vscode-panel-header">
                    <div className="panel-header-icon">
                        {getIcon()}
                    </div>
                    <div className="panel-header-title">
                        {category}
                    </div>
                </div>
            )}
            <div className="vscode-panel-content">
                {formatContent()}
            </div>
        </div>
    );
};

export default FeedbackDetail; 