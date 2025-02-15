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
    return response
        .split(/\n(?=### )/)
        .map(section => {
            const titleMatch = section.match(/### (.*)/);
            const title = titleMatch ? titleMatch[1] : "Unknown Section";
            let content = section.replace(/### .*/, '').trim();
            content = content.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');

            return `<details class="category"><summary>${title}</summary><div class="content">${content}</div></details>`;
        })
        .join('');
}
