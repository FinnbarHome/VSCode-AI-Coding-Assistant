const vscode = acquireVsCodeApi();



function sendRequest() {
    document.getElementById('response').innerHTML = "<p>⏳ Analyzing your code... Please wait.</p>";
    vscode.postMessage({ command: 'getAIAnalysis' });
}

window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'displayFileInfo') {
        document.getElementById('filename').innerText = message.filename;
        document.getElementById('response').innerHTML = formatResponse(message.response);
    }
});

function formatResponse(response) {
    // Define the expected 10 categories
    const categories = [
        "Serious Problems",
        "Warnings",
        "Refactoring Suggestions",
        "Coding Conventions",
        "Performance Optimization",
        "Security Issues",
        "Best Practices",
        "Readability and Maintainability",
        "Code Smells",
        "Educational Tips"
    ];

    // Initialize an object to store feedback per category
    let sections = {};
    let currentCategory = null;

    // Ensure the AI response is split correctly into sections
    response.split(/\n(?=#### )/).forEach(section => {
        const titleMatch = section.match(/#### (.+)/);
        const title = titleMatch ? titleMatch[1].trim() : null;

        if (title && categories.includes(title)) {
            currentCategory = title;
            sections[currentCategory] = ""; // Initialize category
        }

        if (currentCategory) {
            sections[currentCategory] += section.replace(/#### .*/, '').trim() + "\n";
        }
    });

    // Build collapsible sections only for known categories
    return categories.map(category => {
        const content = sections[category] && sections[category].trim().length > 0
            ? sections[category].trim()
            : "✅ No issues found.";
        return `
            <details class="category">
                <summary>${category}</summary>
                <div class="content">${content.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')}</div>
            </details>
        `;
    }).join('');
}
