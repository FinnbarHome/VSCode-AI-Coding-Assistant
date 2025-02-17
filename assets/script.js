const vscode = acquireVsCodeApi();

function sendRequest() {
    const responseElement = document.getElementById('response');

    // Keep only the "Loading..." message while AI processes
    responseElement.innerHTML = `
        <p style="color: #61dafb;">⏳ Analyzing your code... Please wait.</p>
    `;

    vscode.postMessage({ command: 'getAIAnalysis' });
}

window.addEventListener('message', (event) => {
    const message = event.data;

    if (message.command === 'displayFileInfo') {
        document.getElementById('filename').innerText = message.filename;

        // Wait until AI response is fully processed before updating UI
        if (message.response && message.response.trim().length > 0) {
            processAIResponse(message.response);
        }
    }
});

function processAIResponse(response) {
    const responseElement = document.getElementById('response');

    // Ensure loading message is kept until response is fully processed
    setTimeout(() => {
        responseElement.innerHTML = formatResponse(response);
    }, 100); // Small delay to ensure smooth transition
}

function formatResponse(response) {
    if (!response || response.trim().length === 0) {
        return ""; // Keep "Loading..." until we get a valid response
    }

    // Define the expected 10 categories
    const categories = {
        "Serious Problems": "",
        "Warnings": "",
        "Refactoring Suggestions": "",
        "Coding Conventions": "",
        "Performance Optimization": "",
        "Security Issues": "",
        "Best Practices": "",
        "Readability and Maintainability": "",
        "Code Smells": "",
        "Educational Tips": ""
    };

    let currentCategory = null;

    // Process AI response properly
    response.split(/\n(?=#### )/).forEach(section => {
        const titleMatch = section.match(/#### (.+)/);
        const title = titleMatch ? titleMatch[1].trim() : null;

        if (title && categories.hasOwnProperty(title)) {
            currentCategory = title;
        }

        if (currentCategory) {
            // Append content under the correct category
            let content = section.replace(/#### .*/, '').trim();

            // Ensure all bullet points use `-` (force consistency)
            content = content.replace(/\n\d+\./g, "\n-"); // Convert numbered lists (1., 2.) to `-`
            content = content.replace(/\n\*/g, "\n-"); // Convert `*` bullets to `-`

            // Format bullet points for better readability
            content = content.replace(/-\s/g, '<li>') + '</li>';
            content = `<ul>${content}</ul>`;

            categories[currentCategory] += content;
        }
    });

    console.log("Parsed Sections:", categories); // Debugging

    // Generate collapsible sections with improved styling
    return Object.keys(categories)
        .map(category => {
            const content = categories[category].trim();

            return content.length > 0
                ? `
                <details class="category">
                    <summary>${category}</summary>
                    <div class="content">
                        ${content}
                    </div>
                </details>
                ` : "";
        })
        .join('');
}
