// Process the document once it's fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Step 1: Standardize heading formats and add IDs
    // Map section titles to IDs
    const sectionMap = {
        'executive summary': 'executive-summary',
        'code architecture': 'code-architecture',
        'architecture': 'code-architecture',
        'critical issues': 'critical-issues',
        'code quality': 'code-quality',
        'performance': 'performance-analysis',
        'security': 'security-review',
        'maintainability': 'maintainability',
        'refactoring': 'recommended-refactoring',
        'best practices': 'best-practices',
        'learning resources': 'learning-resources'
    };
    
    // Process all h2 elements (main sections)
    const h2Elements = document.querySelectorAll('main h2');
    h2Elements.forEach(heading => {
        // Create slug from heading text
        const headingText = heading.innerText.toLowerCase();
        
        // Remove numbering if present (e.g., "1. Executive Summary")
        const cleanText = headingText.replace(/^\d+\.?\s+/, '');
        
        // Find the matching ID from our mapping
        let id = null;
        for (const [key, value] of Object.entries(sectionMap)) {
            if (cleanText.includes(key)) {
                id = value;
                break;
            }
        }
        
        if (id) {
            heading.id = id;
        }
    });
    
    // Step 2: Extract and standardize scores
    h2Elements.forEach(heading => {
        if (!heading.id || heading.id === 'learning-resources') return;
        
        // First look for "Section Score:" format shown in the screenshot
        let sectionScoreElem = null;
        let sectionScoreValue = null;
        let nextElem = heading.nextElementSibling;
        
        // Check if there's already a score container (from a previous page load)
        if (nextElem && nextElem.classList && nextElem.classList.contains('score-container')) {
            // Skip processing if the visual score is already present
            return;
        }
        
        // Look for standalone section scores with format "Section Score: X/10"
        while (nextElem && !sectionScoreValue) {
            if (nextElem.tagName === 'P' && nextElem.textContent.includes('Section Score:')) {
                const match = nextElem.textContent.match(/Section\s+Score:\s*(\d+)\/10/i);
                if (match) {
                    sectionScoreValue = parseInt(match[1]);
                    sectionScoreElem = nextElem;
                    break;
                }
            }
            nextElem = nextElem.nextElementSibling;
            if (nextElem && nextElem.tagName === 'H2') break; // Stop at next heading
        }
        
        // If specific section score not found, look for any score pattern in the content
        if (!sectionScoreValue) {
            const scoreRegex = /\b([a-z\s]+)score:\s*(\d+)\/10\b/i;
            nextElem = heading.nextElementSibling;
            const maxSearch = 5; // Look through next 5 elements maximum
            
            for (let i = 0; i < maxSearch && nextElem; i++) {
                const textContent = nextElem.textContent;
                const match = textContent.match(scoreRegex);
                
                if (match) {
                    sectionScoreValue = parseInt(match[2]);
                    sectionScoreElem = nextElem;
                    break;
                }
                nextElem = nextElem.nextElementSibling;
                if (nextElem && nextElem.tagName === 'H2') break; // Stop at next heading
            }
        }
        
        // If score found, create standardized score display
        if (sectionScoreValue !== null) {
            // Create score container
            const scoreContainer = document.createElement('div');
            scoreContainer.className = 'score-container';
            
            const scoreLabel = document.createElement('div');
            scoreLabel.className = 'score-label';
            scoreLabel.textContent = 'Section Score:';
            
            const score = document.createElement('div');
            score.className = 'score';
            
            // Add appropriate color class
            if (sectionScoreValue >= 8) {
                score.classList.add('score-good');
            } else if (sectionScoreValue >= 5) {
                score.classList.add('score-medium');
            } else {
                score.classList.add('score-bad');
            }
            
            score.textContent = sectionScoreValue + '/10';
            
            scoreContainer.appendChild(scoreLabel);
            scoreContainer.appendChild(score);
            
            // Insert after heading
            heading.insertAdjacentElement('afterend', scoreContainer);
            
            // Remove the original plaintext score
            if (sectionScoreElem) {
                // If it's a standalone paragraph with just the score/section score, remove it
                if (sectionScoreElem.tagName === 'P' && 
                    (sectionScoreElem.textContent.trim().match(/^section\s+score:\s*\d+\/10$/i) ||
                     sectionScoreElem.textContent.trim().match(/^[a-z\s]+score:\s*\d+\/10$/i))) {
                    sectionScoreElem.remove();
                } else {
                    // Handle the specific pattern from the screenshot: "Overall quality score: 6/10"
                    if (sectionScoreElem.textContent.includes('Overall quality score:')) {
                        sectionScoreElem.innerHTML = sectionScoreElem.innerHTML.replace(/overall\s+quality\s+score:\s*\d+\/10/i, '');
                        if (!sectionScoreElem.textContent.trim()) {
                            sectionScoreElem.remove();
                        }
                    } else {
                        // If within a larger paragraph, try to remove just the score text
                        const scoreText = sectionScoreElem.innerHTML;
                        const newText = scoreText.replace(/([a-z\s]+score:\s*\d+\/10)/i, '');
                        sectionScoreElem.innerHTML = newText;
                        
                        // If paragraph is now empty or just whitespace, remove it
                        if (!sectionScoreElem.textContent.trim()) {
                            sectionScoreElem.remove();
                        }
                    }
                }
            }
            
            // Look for and clean any other score mentions in the following content
            let additionalScoreElem = heading.nextElementSibling.nextElementSibling;
            while (additionalScoreElem && !additionalScoreElem.matches('h2')) {
                if (additionalScoreElem.textContent.match(/\b([a-z\s]+)score:\s*\d+\/10\b/i)) {
                    const originalHTML = additionalScoreElem.innerHTML;
                    const cleanedHTML = originalHTML.replace(/\b([a-z\s]+)score:\s*\d+\/10\b/i, '');
                    additionalScoreElem.innerHTML = cleanedHTML;
                    
                    // If element is now empty, remove it
                    if (!additionalScoreElem.textContent.trim()) {
                        const elemToRemove = additionalScoreElem;
                        additionalScoreElem = additionalScoreElem.nextElementSibling;
                        elemToRemove.remove();
                        continue;
                    }
                }
                additionalScoreElem = additionalScoreElem.nextElementSibling;
            }
        }
    });
    
    // Step 3: Setup code block copy functionality
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-clipboard-target').substring(1);
            const codeElement = document.getElementById(targetId);
            
            if (codeElement) {
                // Get text content without line numbers
                let text = '';
                codeElement.querySelectorAll('.code-line').forEach(line => {
                    text += line.textContent + "\n";
                });
                
                // Use modern clipboard API if available
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(() => {
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                            this.textContent = 'Copy';
                        }, 2000);
                    });
                } else {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    textarea.setAttribute('readonly', '');
                    textarea.style.position = 'absolute';
                    textarea.style.left = '-9999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    
                    this.textContent = 'Copied!';
                    setTimeout(() => {
                        this.textContent = 'Copy';
                    }, 2000);
                }
            }
        });
    });
}); 