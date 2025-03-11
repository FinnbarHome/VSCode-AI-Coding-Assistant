# VSCode AI Coding Assistant
### 🎓 Year 4 Individual Project - Dundee University  
**Author:** Finnbar Home  

## 🛠️ Overview
The **VSCode AI Coding Assistant** is a **VS Code extension** designed to help **beginner programmers** improve their coding skills through **AI-powered feedback**. Instead of generating large amounts of code, this extension provides **structured suggestions** to help users **learn, debug, and optimize** their code effectively.

## 🚀 Features
- 📌 **AI-Powered Code Review** – Offers feedback across **10 structured categories**:
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
  
- ⚡ **Real-Time Feedback** – Reviews the active file and provides structured insights.  
- 🎨 **Dark-Themed UI** – Clean, modern, and easy-to-read interface inside VS Code.  
- 💡 **Beginner-Friendly Guidance** – Focuses on **learning over automation**, explaining fixes in simple terms.  
- **Tree View Integration**: View feedback categories and items in a structured tree view
- **Detailed Analysis**: Get in-depth analysis of your code with categorized feedback
- **Interactive UI**: Select items in the tree view to see detailed information

## 🏗️ Tech Stack
This project utilizes the following technologies:

### **Backend & AI Processing**
- **OpenAI API** – Uses `GPT-4o-mini` to analyze code and generate feedback.
- **Node.js & TypeScript** – For processing requests and handling API calls.

### **VSCode Extension Development**
- **VSCode Webview API** – For rendering the UI inside VS Code.
- **VSCode API** – To interact with open files and retrieve user code.

### **Frontend & UI**
- **HTML, CSS, JavaScript** – Lightweight, responsive, and styled for **dark mode**.
- **Tailored Webview UI** – Displays feedback in collapsible sections for clarity.

## 📥 Installation & Setup
### **1️⃣ Prerequisites**
Ensure you have the following installed:
- **VS Code** (latest version)
- **Node.js** (LTS recommended)
- **NPM** (comes with Node.js)

### **2️⃣ Clone the Repository**
```sh
git clone https://github.com/YOUR_GITHUB_USERNAME/VSCode-AI-Coding-Assistant.git
cd VSCode-AI-Coding-Assistant
```

### **3️⃣ Install Dependencies**
```sh
npm install
```

### **4️⃣ Set Up API Key**
1. Create a `.env` file in the root directory.
2. Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

### **5️⃣ Build & Run the Extension**
```sh
npm run compile
```
- Open VS Code  
- Press `F5` to launch the extension in a new VS Code window.  

## 🛠️ Usage
1️⃣ Open any **JavaScript, TypeScript, Python, Java, or C++ file**.  
2️⃣ Click on the **"AI Coding Assistant"** in the sidebar.  
3️⃣ Press the **"Get Feedback"** button.  
4️⃣ The AI will analyze your code and generate **structured feedback** in collapsible sections.  

## ⚡ Example Output
```md
▶ Serious Problems
   - Function `greetUser()` is missing an argument.

▶ Warnings
   - Variable `i` in loop should be declared using `let`.

▶ Performance Optimization
   ✅ No issues found.

▶ Security Issues
   ✅ No issues found.

etc
```

## 🤝 Contributions
This project is part of **Finnbar Home's** **Year 4 Individual Project** at **Dundee University**.  

🔹 If you have feedback or want to contribute, feel free to open an **Issue** on GitHub.

## 📜 License
This project is for **academic purposes** and is **not intended for commercial use**.

## 📜 Release Notes

### 0.0.1

Initial release of VSCode AI Coding Assistant with tree view integration.

---

## 📜 Development

### 🛠️ Building the Extension

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Press F5 to launch the extension in debug mode

### �� Project Structure

- `src/extension.ts`: Main extension code
- `src/ai.ts`: AI integration code
- `src/webview.tsx`: React webview implementation
- `src/components/`: React components
- `src/styles/`: CSS styles

## 📜 Supported File Types

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

## 📜 Extension Settings

This extension contributes the following settings:

* `aiCodingAssistant.analyzeCurrentFile`: Analyze the currently open file

## 📜 Known Issues

- Large files may be truncated during analysis
- Some complex code patterns might not be properly analyzed


