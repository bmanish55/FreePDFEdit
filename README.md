<div align="center">

# 📄 FreePDFEdit

**A lightning-fast, 100% private in-browser PDF editor with precision font matching and local AI text fitting.**

[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25_Client--Side-10b981?style=flat-square)](#-privacy-first-architecture)
[![License](https://img.shields.io/badge/License-MIT-slate?style=flat-square)](LICENSE)

<br />

> **Zero uploads. No signup. No watermarks. Free forever.**  
> Everything runs strictly inside your web browser — your private documents never touch any server.

<br />

</div>

---

## ✨ Features at a Glance

| Feature | Description |
| :--- | :--- |
| **✍️ Precision In-Place Text Editing** | Click any line to edit text in place. Matches original font weights, metrics, and justified word spacing (`Tw`). |
| **✨ Open-Source AI Smart Fit** | Integrates with local **Ollama** (`llama3.2`, `qwen2.5`) or offline semantic rules to rewrite overflow text into the line budget without reducing font size. |
| **🛡️ Complete Offline Privacy** | Powered entirely by WebAssembly and Canvas. Files stay on your machine at all times. |
| **🖼️ Image Insertion & Resize** | Add PNG or JPEG stamps/signatures, drag to reposition, and resize with aspect-ratio preservation. |
| **🖍️ Whiteout & Highlighter** | Redact sensitive information or highlight key document passages. |
| **🔄 Full Undo History** | Safe editing with multi-step undo (`Ctrl+Z`) and element deletion. |
| **⚡ Instant Export** | Generates standard-compliant PDFs directly in memory with embedded subsets. |

---

## 🔒 Privacy-First Architecture

Most online PDF tools upload your sensitive bank statements, resumes, and legal contracts to remote cloud servers. **FreePDFEdit is different:**

```mermaid
flowchart LR
    A[Your Computer / Browser] -->|Direct Memory Read| B[PDF.js Canvas Renderer]
    B -->|In-Place Edits| C[pdf-lib In-Memory Builder]
    C -->|Local Blob Download| D[Edited PDF File]
    style A fill:#f8fafc,stroke:#3b82f6,stroke-width:2px
    style B fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
    style C fill:#eff6ff,stroke:#3b82f6,stroke-width:2px
    style D fill:#ecfdf5,stroke:#10b981,stroke-width:2px
```

* **No backend server**: There is no Node/Python backend processing your files.
* **No telemetry / trackers**: No document tracking or analytics profiling.
* **Fully functional offline**: You can disconnect your internet and edit documents without interruption.

---

## 🧠 Open-Source AI Text Optimization

When editing dense academic papers or contracts, replacement phrases often exceed the line's available margin. FreePDFEdit solves this with an inline **AI Smart Fit Assistant**:

- **Local Ollama Support**: Connects directly to your local Ollama daemon (`http://localhost:11434`) using open-source models like `llama3.2` or `qwen2.5`.
- **Built-in Offline Engine**: Works out-of-the-box even without Ollama installed via an embedded semantic condenser.
- **Three Modes**:
  1. 🎯 **Smart Fit**: Tightens text length to fit the exact line boundary while preserving meaning.
  2. 🎓 **Academic Polish**: Elevates phrasing to formal scholarly English.
  3. ✂️ **Ultra-Concise**: Condenses paragraphs for compact layouts.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### 1. Clone & Install
```bash
git clone https://github.com/bmanish55/FreePDFEdit.git
cd FreePDFEdit
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 🤖 (Optional) Connect Local AI with Ollama

To enable local LLM paraphrasing for the AI Smart Fit assistant:

1. Install [Ollama](https://ollama.com/).
2. Pull a fast, lightweight open-source model:
   ```bash
   ollama run llama3.2
   ```
3. Open any PDF in FreePDFEdit, click any text line, and click **✨ AI Fit & Polish**. It will auto-detect your local model!

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 18](https://react.dev/) + [Vite 6](https://vitejs.dev/)
* **Language**: [TypeScript 5.7](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **PDF Parsing & Rendering**: [PDF.js (`pdfjs-dist`)](https://mozilla.github.io/pdf.js/)
* **PDF Generation & Binary Assembly**: [pdf-lib](https://pdf-lib.js.org/) + [@pdf-lib/fontkit](https://github.com/Hopding/fontkit)
* **Metric-Compatible Fonts**: Tinos (Times), Arimo (Arial), Carlito (Calibri), Cousine (Courier)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 🌐 Deploy to Web

Deploying FreePDFEdit is effortless since it compiles to 100% static assets:

### Deploy on Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bmanish55/FreePDFEdit)

### Deploy on Cloudflare Pages / Netlify
- **Build command**: `npm run build`
- **Output directory**: `dist`

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
Feel free to use it, self-host it, or contribute!
