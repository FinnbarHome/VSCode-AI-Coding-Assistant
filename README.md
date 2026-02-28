# VSCode AI Coding Assistant
### Year 4 Individual Project - Dundee University  
**Author:** Finnbar Home  

## Overview
The **VSCode AI Coding Assistant** is a **VS Code extension** designed to help **beginner programmers** improve their coding skills through **AI-powered feedback**. Instead of generating large amounts of code, this extension provides **structured suggestions** to help users **learn, debug, and optimise** their code effectively.

## Features
- **AI-Powered Code Review** – Offers feedback across **10 structured categories**:
  - **Serious Problems**
  - **Warnings**
  - **Refactoring Suggestions**
  - **Coding Conventions**
  - **Performance Optimization**
  - **Security Issues**
  - **Best Practices**
  - **Readability and Maintainability**
  - **Code Smells**
  - **Educational Tips**


## Tech Stack
This project utilises the following technologies:

### **Backend & AI Processing**
- **OpenAI API** – Uses `GPT-4o-mini` to analyze code and generate feedback.
- **Node.js & TypeScript** – For processing requests and handling API calls.

### **VSCode Extension Development**
- **VSCode Webview API** – For rendering the UI inside VS Code.
- **VSCode API** – To interact with open files and retrieve user code.

### **Frontend & UI**
- **HTML, CSS, JavaScript** – Lightweight, responsive, and styled for **dark mode**.
- **Tailored Webview UI** – Displays feedback in collapsible sections for clarity.

## Supported File Types

The extension supports the following file types:
- JavaScript (.js)
- TypeScript (.ts)
- C++ (.cpp)
- C (.c)
- Java (.java)
- Python (.py)
- C# (.cs)
- JSON (.json)
- HTML (.html)
- CSS (.css)
- Markdown (.md)

## Known Issues

- Large files may be truncated during analysis
- Some complex code patterns might not be properly analysed


