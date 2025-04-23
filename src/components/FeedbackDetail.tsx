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

    // make bullets if multi-item
    const formatContent = () => {
        // empty or "no issues"?
        if (!content || content.toLowerCase().includes('no issues found')) {
            return (
                <div className="feedback-empty">
                    <span className="feedback-checkmark">✓</span>
                    <span>No issues found in this category</span>
                </div>
            );
        }

        // split into bullet points
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
        
        // just one item - no list
        return (
            <div className="single-item">
                <span className="list-item-icon">{getItemIcon(type)}</span>
                <div className="list-item-text">
                    {formatTextWithCode(content)}
                </div>
            </div>
        );
    };

    // handle text w/ code blocks
    const formatTextWithCode = (text: string) => {
        // no code blocks?
        if (!text.includes('```')) {
            // check for nested sections
            if (text.match(/\n#{1,4}\s+/)) {
                return formatNestedSections(text);
            }
            return <span>{text}</span>;
        }

        try {
            // regex for code blocks + lang tags
            const codeBlockRegex = /(```[\w]*[\s\S]*?```)/g;
            const parts = text.split(codeBlockRegex).filter(part => part.trim().length > 0);
            
            return parts.map((part, index) => {
                // nested section?
                if (part.match(/\n#{1,4}\s+/)) {
                    return formatNestedSections(part);
                }
                
                if (part.startsWith('```')) {
                    try {
                        // extract lang and code
                        const match = part.match(/```([\w]*)\n?([\s\S]*?)```/);
                        if (match) {
                            const [, language, code] = match;
                            const displayLanguage = language || 'text';
                            
                            // clean up code
                            const cleanedCode = code.trim()
                                .replace(/^\s+/gm, (m) => m.replace(/\s/g, ' ')) // fix indents
                                .replace(/\n{3,}/g, '\n\n'); // fix extra newlines
                            
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
                        
                        // regex didn't work - try plan B
                        const lines = part.split('\n');
                        const firstLine = lines[0].trim();
                        
                        // get lang from first line
                        const langMatch = firstLine.match(/^```([\w]*)/);
                        const language = langMatch ? langMatch[1] : '';
                        
                        // get code between first/last line
                        let codeContent = '';
                        if (lines.length > 1) {
                            // skip first/last lines
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
                        // parsing failed - just show text
                        console.error("Error parsing code block:", error);
                        return <span key={index}>{part}</span>;
                    }
                }
                return <span key={index}>{part}</span>;
            });
        } catch (error) {
            // regex failed - use plain text
            console.error("Error formatting code:", error);
            return <span>{text}</span>;
        }
    };
    
    // handle nested section headers
    const formatNestedSections = (text: string) => {
        // special case: refactoring w/ before/after sections
        const isRefactoringSuggestion = category === "Refactoring Suggestions" && text.includes("####");
        
        // handle refactoring specially
        if (isRefactoringSuggestion) {
            // get intro content
            const mainContent = text.split(/\n#{1,4}\s+/)[0].trim();
            
            // get all sections
            const nestedSections = text.match(/\n#{1,4}\s+.+(?:\n(?!#{1,4}\s+).+)*/g) || [];
            
            return (
                <div className="nested-sections">
                    {/* main content first */}
                    {mainContent && (
                        <div className="nested-content">
                            {formatTextWithCode(mainContent)}
                        </div>
                    )}
                    
                    {/* then each section */}
                    {nestedSections.map((section, index) => {
                        const headerMatch = section.match(/\n#{1,4}\s+(.+)$/m);
                        const headerText = headerMatch ? headerMatch[1].trim() : `Section ${index + 1}`;
                        const headerLevel = (section.match(/\n(#{1,4})\s+/) || ['', '#'])[1].length;
                        
                        // content after header
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
        
        // for normal sections (not refactoring)
        // split by headers
        const parts = text.split(/\n(#{1,4}\s+.*)/g);
        
        return (
            <div className="nested-sections">
                {parts.map((part, index) => {
                    // section header?
                    if (part.match(/^#{1,4}\s+/)) {
                        const headerLevel = (part.match(/^(#{1,4})\s+/) || ['', '#'])[1].length;
                        const headerText = part.replace(/^#{1,4}\s+/, '');
                        
                        return (
                            <div key={index} className={`nested-header level-${headerLevel}`}>
                                {headerText}
                            </div>
                        );
                    }
                    
                    // has code blocks?
                    if (part.includes('```')) {
                        return <div key={index}>{formatTextWithCode(part)}</div>;
                    }
                    
                    return <div key={index}>{part}</div>;
                })}
            </div>
        );
    };
    
    // split text into bullet points
    const splitIntoBulletPoints = (text: string): string[] => {
        // handle code blocks carefully
        if (text.includes('```')) {
            // already has bullets?
            if (text.match(/^[-•*]\s+/m) || text.match(/^\d+\.\s+/m)) {
                // split by lines but keep code blocks together
                const lines = text.split('\n');
                const bulletPoints: string[] = [];
                let currentPoint = '';
                let inCodeBlock = false;
                
                for (const line of lines) {
                    // toggle code block state
                    if (line.trim().startsWith('```')) {
                        inCodeBlock = !inCodeBlock;
                        currentPoint += line + '\n';
                        continue;
                    }
                    
                    // in code block? add to current point
                    if (inCodeBlock) {
                        currentPoint += line + '\n';
                        continue;
                    }
                    
                    // new bullet?
                    if ((line.trim().match(/^[-•*]\s+/) || line.trim().match(/^\d+\.\s+/)) && currentPoint) {
                        bulletPoints.push(currentPoint.trim());
                        currentPoint = line + '\n';
                    } else {
                        currentPoint += line + '\n';
                    }
                }
                
                // add last point
                if (currentPoint.trim()) {
                    bulletPoints.push(currentPoint.trim());
                }
                
                return bulletPoints;
            }
        }
        
        // already has bullets?
        if (text.match(/^[-•*]\s+/m) || text.match(/^\d+\.\s+/m)) {
            return text.split(/\n+/).filter(line => line.trim().length > 0);
        }
        
        // split by periods (careful with abbrev/nums)
        const points = text.split(/\.(?=\s|$)/).filter(s => s.trim().length > 0);
        return points.map(p => p.trim() + (p.endsWith('.') ? '' : '.'));
    };
    
    // get appropriate item icon
    const getItemIcon = (itemType: string) => {
        switch (itemType) {
            case 'error': return '🔴'; // red for errors
            case 'warning': return '🟠'; // orange for warnings
            default: return '🔵'; // blue for info
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