const fs = require('fs');
const path = require('path');

// Read the test response file
const response = fs.readFileSync('./test-response.txt', 'utf-8');
console.log("Response loaded, length:", response.length);

// Parse the response
const parsedData = parseAIResponse(response);

// Print the parsed data
console.log(JSON.stringify(parsedData, null, 2));

// Specifically check for code snippets
console.log("\n--- Code Snippet Analysis ---");
Object.keys(parsedData).forEach(category => {
    const items = parsedData[category];
    if (items.length > 0) {
        console.log(`\nCategory: ${category}`);
        items.forEach((item, index) => {
            const hasCodeBlock = item.includes('```');
            console.log(`  Item ${index + 1}: ${hasCodeBlock ? 'Contains code block' : 'No code block'}`);
            
            if (hasCodeBlock) {
                // Extract code blocks
                const codeBlocks = extractCodeBlocks(item);
                console.log(`    Found ${codeBlocks.length} code blocks:`);
                codeBlocks.forEach((block, blockIndex) => {
                    console.log(`    Block ${blockIndex + 1}:`);
                    console.log(`      Language: ${block.language || 'none'}`);
                    console.log(`      Code: ${block.code.substring(0, 50)}${block.code.length > 50 ? '...' : ''}`);
                });
            }
        });
    }
});

/**
 * Extract code blocks from text
 */
function extractCodeBlocks(text) {
    const codeBlocks = [];
    const codeBlockRegex = /```([\w]*)\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push({
            language: match[1] || 'text',
            code: match[2].trim()
        });
    }
    
    return codeBlocks;
}

/**
 * Parses the AI response text into structured JSON
 */
function parseAIResponse(response) {
    // Initialize with all required categories
    const parsedData = {
        "Serious Problems": [],
        "Warnings": [],
        "Refactoring Suggestions": [],
        "Coding Conventions": [],
        "Performance Optimization": [],
        "Security Issues": [],
        "Best Practices": [],
        "Readability and Maintainability": [],
        "Code Smells": [],
        "Educational Tips": []
    };
    
    // Check if response is empty or invalid
    if (!response || response.trim().length === 0) {
        console.warn("Empty AI response received");
        return parsedData;
    }
    
    // First, normalize the response by removing excessive whitespace at the beginning of lines
    // and normalizing line endings to \n
    const normalizedResponse = response
        .replace(/\r\n/g, '\n')  // Normalize Windows line endings
        .replace(/^\s+/gm, '')
        .trim();
    
    // Log a sample of the normalized response
    console.log("Normalized response sample:", normalizedResponse.substring(0, 100));
    
    // Split the response by main section headers
    const sectionRegex = /####\s+([^\n]+)/g;
    let match;
    let lastIndex = 0;
    const sections = [];
    
    while ((match = sectionRegex.exec(normalizedResponse)) !== null) {
        const headerStart = match.index;
        const headerEnd = match.index + match[0].length;
        const sectionName = match[1].trim();
        
        // If this isn't the first match, extract the content of the previous section
        if (lastIndex > 0) {
            const sectionContent = normalizedResponse.substring(lastIndex, headerStart).trim();
            sections.push({ name: sections[sections.length - 1].name, content: sectionContent });
        }
        
        // Add this section header
        sections.push({ name: sectionName, content: '' });
        lastIndex = headerEnd;
    }
    
    // Add the content for the last section
    if (lastIndex > 0 && lastIndex < normalizedResponse.length) {
        const sectionContent = normalizedResponse.substring(lastIndex).trim();
        sections.push({ name: sections[sections.length - 1].name, content: sectionContent });
        // Remove the duplicate empty section
        sections.splice(sections.length - 2, 1);
    }
    
    console.log("Number of sections:", sections.length);
    
    // Process each section
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (!section.content.trim()) {
            console.log(`Section "${section.name}" has no content, skipping`);
            continue;
        }
        
        console.log(`Processing section: "${section.name}"`);
        console.log(`Content length: ${section.content.length}`);
        console.log(`Content sample: ${section.content.substring(0, 50)}...`);
        
        // Skip if category is not recognized
        if (!parsedData.hasOwnProperty(section.name)) {
            console.log(`Category "${section.name}" not recognized, skipping`);
            continue;
        }
        
        // Handle "No issues found" case
        if (section.content.toLowerCase().includes('no issues found') || 
            section.content.toLowerCase().includes('no problems') ||
            section.content.toLowerCase().includes('✅')) {
            console.log(`Category "${section.name}" has no issues, skipping`);
            continue; // Skip adding these as they're handled by the UI
        }
        
        // Extract bullet points from the content
        const bulletPoints = extractBulletPointsWithCodeBlocks(section.content);
        console.log(`Extracted ${bulletPoints.length} bullet points from "${section.name}"`);
        
        // Add bullet points to the category
        if (bulletPoints.length > 0) {
            parsedData[section.name] = bulletPoints;
        }
    }
    
    return parsedData;
}

/**
 * Extract bullet points from section content, preserving code blocks
 */
function extractBulletPointsWithCodeBlocks(content) {
    const bulletPoints = [];
    
    // Check if content is empty
    if (!content.trim()) {return bulletPoints;}
    
    // Split content into lines for processing
    const lines = content.split('\n');
    let currentBullet = null;
    let inCodeBlock = false;
    let currentCodeBlock = '';
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for code block markers
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            
            // Add the code block marker to the current bullet
            if (currentBullet !== null) {
                currentBullet += '\n' + line;
                
                // If we're closing a code block, add any accumulated code
                if (!inCodeBlock && currentCodeBlock) {
                    currentCodeBlock = '';
                }
            }
            continue;
        }
        
        // If we're in a code block, add the line to the current bullet
        if (inCodeBlock) {
            currentCodeBlock += line + '\n';
            if (currentBullet !== null) {
                currentBullet += '\n' + line;
            }
            continue;
        }
        
        // Check for bullet points (numbered or with symbols)
        const bulletMatch = line.match(/^(\d+\.|[-*•])\s+(.+)$/);
        
        if (bulletMatch) {
            // If we already have a bullet point, add it to the list
            if (currentBullet !== null) {
                bulletPoints.push(currentBullet);
            }
            
            // Start a new bullet point
            currentBullet = bulletMatch[2];
        } else if (currentBullet !== null && line) {
            // Continue the current bullet point
            currentBullet += '\n' + line;
        }
    }
    
    // Add the last bullet point if there is one
    if (currentBullet !== null) {
        bulletPoints.push(currentBullet);
    }
    
    console.log(`Extracted ${bulletPoints.length} bullet points`);
    return bulletPoints;
} 