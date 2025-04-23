// run once page loads
document.addEventListener('DOMContentLoaded', function() {
    // 1: fix headings + add IDs
    // map section names -> ids
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
    
    // process h2 sections
    const h2Elements = document.querySelectorAll('main h2');
    h2Elements.forEach(heading => {
        // make slug from heading
        const headingText = heading.innerText.toLowerCase();
        
        // strip numbering (like "1. Section Name")
        const cleanText = headingText.replace(/^\d+\.?\s+/, '');
        
        // find matching id from our map
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
    
    // 2: extract & format scores
    h2Elements.forEach(heading => {
        if (!heading.id || heading.id === 'learning-resources') return;
        
        // look for "Section Score:" format
        let sectionScoreElem = null;
        let sectionScoreValue = null;
        let nextElem = heading.nextElementSibling;
        
        // already processed?
        if (nextElem && nextElem.classList && nextElem.classList.contains('score-container')) {
            // skip if already done
            return;
        }
        
        // look for "Section Score: X/10" format
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
            if (nextElem && nextElem.tagName === 'H2') break; // stop at next h2
        }
        
        // no specific score? try any score pattern
        if (!sectionScoreValue) {
            const scoreRegex = /\b([a-z\s]+)score:\s*(\d+)\/10\b/i;
            nextElem = heading.nextElementSibling;
            const maxSearch = 5; // only check next 5 elements
            
            for (let i = 0; i < maxSearch && nextElem; i++) {
                const textContent = nextElem.textContent;
                const match = textContent.match(scoreRegex);
                
                if (match) {
                    sectionScoreValue = parseInt(match[2]);
                    sectionScoreElem = nextElem;
                    break;
                }
                nextElem = nextElem.nextElementSibling;
                if (nextElem && nextElem.tagName === 'H2') break; // stop at next h2
            }
        }
        
        // found a score? make it pretty
        if (sectionScoreValue !== null) {
            // create score container
            const scoreContainer = document.createElement('div');
            scoreContainer.className = 'score-container';
            
            const scoreLabel = document.createElement('div');
            scoreLabel.className = 'score-label';
            scoreLabel.textContent = 'Section Score:';
            
            const score = document.createElement('div');
            score.className = 'score';
            
            // add color based on score
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
            
            // put after heading
            heading.insertAdjacentElement('afterend', scoreContainer);
            
            // remove old text score
            if (sectionScoreElem) {
                // if it's just the score by itself, remove whole thing
                if (sectionScoreElem.tagName === 'P' && 
                    (sectionScoreElem.textContent.trim().match(/^section\s+score:\s*\d+\/10$/i) ||
                     sectionScoreElem.textContent.trim().match(/^[a-z\s]+score:\s*\d+\/10$/i))) {
                    sectionScoreElem.remove();
                } else {
                    // special case for "Overall quality score: 6/10"
                    if (sectionScoreElem.textContent.includes('Overall quality score:')) {
                        sectionScoreElem.innerHTML = sectionScoreElem.innerHTML.replace(/overall\s+quality\s+score:\s*\d+\/10/i, '');
                        if (!sectionScoreElem.textContent.trim()) {
                            sectionScoreElem.remove();
                        }
                    } else {
                        // just remove the score part from paragraph
                        const scoreText = sectionScoreElem.innerHTML;
                        const newText = scoreText.replace(/([a-z\s]+score:\s*\d+\/10)/i, '');
                        sectionScoreElem.innerHTML = newText;
                        
                        // clean up empty paragraphs
                        if (!sectionScoreElem.textContent.trim()) {
                            sectionScoreElem.remove();
                        }
                    }
                }
            }
            
            // find and clean any other score mentions
            let additionalScoreElem = heading.nextElementSibling.nextElementSibling;
            while (additionalScoreElem && !additionalScoreElem.matches('h2')) {
                if (additionalScoreElem.textContent.match(/\b([a-z\s]+)score:\s*\d+\/10\b/i)) {
                    const originalHTML = additionalScoreElem.innerHTML;
                    const cleanedHTML = originalHTML.replace(/\b([a-z\s]+)score:\s*\d+\/10\b/i, '');
                    additionalScoreElem.innerHTML = cleanedHTML;
                    
                    // remove if now empty
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
    
    // 3: make code block copy buttons work
    document.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-clipboard-target').substring(1);
            const codeElement = document.getElementById(targetId);
            
            if (codeElement) {
                // get text without line numbers
                let text = '';
                codeElement.querySelectorAll('.code-line').forEach(line => {
                    text += line.textContent + "\n";
                });
                
                // use modern clipboard API if available
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(() => {
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                            this.textContent = 'Copy';
                        }, 2000);
                    });
                } else {
                    // fallback for old browsers
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