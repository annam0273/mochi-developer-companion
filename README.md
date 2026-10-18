<div align="center">
  <img src="docs/assets/banner.jpg" alt="Nick The Developer Companion Banner" />

  # 🦊 Nick - The Developer Companion

  <p align="center">
    <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-8-purple?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Chrome-Manifest_V3-green?style=for-the-badge&logo=googlechrome" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/WebAssembly-Offline_Compression-orange?style=for-the-badge&logo=webassembly" alt="WASM" />
    <img src="https://img.shields.io/badge/Web_Speech_API-Voice_Control-red?style=for-the-badge&logo=googlechrome" alt="Web Speech" />
  </p>
  
  <p><b>A beautifully animated, fully autonomous 2D SVG companion built as a Chrome Extension (Manifest V3) specifically for web developers.</b></p>
  <p>Nick hangs out in the corner of your screen, peeks out while you work, falls asleep when you're inactive, reminds you to hydrate and rest your eyes, and comes packed with powerful offline web development tools.</p>
</div>

---

## 📸 Screenshots

<p align="center">
  <img width="1917" height="1011" alt="Nick Companion Overview" src="https://github.com/user-attachments/assets/fcbf5c0e-0aff-4daa-aa05-d85db2e08ef5" />
</p>

<p align="center">
 <img width="1917" height="1016" alt="Developer Tools Menu" src="https://github.com/user-attachments/assets/abe52382-3090-45e1-85a4-307a3dada85b" />
</p>

<p align="center">
  <img width="1917" height="1015" alt="Forager Tech Stack and Colors" src="https://github.com/user-attachments/assets/e429de17-98c6-4b17-8c67-27d476c1f22a" />
</p>

<p align="center">
  <img width="1917" height="1015" alt="Scout SEO Inspector" src="https://github.com/user-attachments/assets/a6349a3b-2f52-41a3-b53b-38aaea6962b6" />
</p>

<p align="center">
  <img width="1917" height="1015" alt="Scribe Notepad and Tables" src="https://github.com/user-attachments/assets/9d985f9b-9d5e-4cae-9c42-1054db05bc50" />
</p>

---

## ✨ Features

### 🦊 Autonomous Animation & Companionship
- **Autonomous State Machine**: Nick wanders, glances at your cursor with real-time eye tracking, peeks from screen edges, and falls asleep when you're inactive for 15 seconds.
- **Global Cross-Tab Health Reminders**: Tracks continuous browser usage across all tabs:
  - **20-20-20 Eye Rest Rule**: Reminds you every 20 minutes to look at something 20 feet away for 20 seconds.
  - **Hydration Breaks**: Reminds you every 45 minutes to drink water.
  - **Smart Session Sync**: Runs only on the active, focused tab without duplicate alerts, and auto-resets when returning from long breaks (>90 mins).
- **Synchronized Sleep Mode**: Put Nick to sleep across all tabs with `Alt + S` or wake him up anytime with a click.

### 🎙️ Voice Command System & Command Guide
- **Dual Voice Activation**:
  - **Tap-To-Toggle**: Click the microphone icon in Nick's tool board or tap `Alt + V` (< 450ms).
  - **Push-To-Talk**: Hold down `Alt + V` (> 450ms) to speak and release to trigger.
- **Natural Voice Intents**: Hands-free control for opening developer tools, capturing screens, toggling sleep, or inspecting designs.
- **Interactive Command Guide**: A built-in retro cheat sheet displaying all shortcuts and voice phrases with live **"Try"** buttons to test actions immediately.
- **Friendly Permission Onboarding**: Helpful guidance card for granting microphone access on new sites without intrusive errors.

### 🛠️ Developer Toolkit
- **🔍 The Forager**: Automatically sniffs and extracts color swatches, front-end frameworks & bundlers (React, Vue, Next.js, Vite, etc.), and cleanly extracts sanitized SVGs and media from any webpage.
- **🧭 The Scout**: Complete SEO and meta auditor inspecting Open Graph tags, heading hierarchy, performance indicators, and structured data with side-docking capability.
- **🎨 The Designer**:
  - **Typographer**: Live font hierarchy inspector and font family analyzer.
  - **X-Ray Mode**: Interactive DOM inspection overlay highlighting element bounds on hover.
  - **Wireframe Mode**: Instantly transforms any live website into a clean blueprint wireframe.
  - **Live Edit Mode**: Directly edit text on any webpage.
- **📸 The Sketcher**: Capture full-screen snapshots of your active tab and sketch, highlight, or annotate directly on canvas.
- **🗜️ The Compressor**: Ultra-fast, offline AVIF image compressor running locally via WebAssembly (`@jsquash/avif`) in a dedicated offscreen document.
- **📝 The Scribe**: Persistent scratchpad with markdown notes and dynamic data tables (custom columns, types, row counts, preview cards) synchronized across all tabs.

---

## ⌨️ Shortcuts & Voice Commands

### Keyboard Shortcuts
| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>V</kbd> | **Voice Command** | Tap to toggle listening, or hold down to talk (push-to-talk). |
| <kbd>Alt</kbd> + <kbd>S</kbd> | **Toggle Sleep** | Put Nick into quiet sleep or wake him up across all tabs. |
| <kbd>Alt</kbd> + <kbd>C</kbd> / <kbd>Alt</kbd> + <kbd>B</kbd> | **Call Home** | Call Nick back to his comfortable corner den immediately. |

### Sayable Voice Commands
| Category | Voice Phrases | Action |
| :--- | :--- | :--- |
| **Tools** | `"open scribe"`, `"notes"`, `"notepad"` | Opens the Scribe scratchpad and tables |
| | `"scout"`, `"inspect"`, `"audit"` | Opens the Scout SEO and meta auditor |
| | `"sketcher"`, `"take screenshot"`, `"draw"` | Captures screen and opens sketch canvas |
| | `"compressor"`, `"compress image"`, `"avif"` | Opens offline AVIF image squasher |
| **Design & Inspection** | `"colors"`, `"palette"`, `"swatches"` | Sniffs page colors and copies hex codes |
| | `"tech stack"`, `"frameworks"` | Detects page libraries, bundlers, and stack |
| | `"assets"`, `"svgs"`, `"extract images"` | Extracts and downloads page media and SVGs |
| | `"x-ray"`, `"illusionist"` | Toggles interactive layout inspection |
| | `"wireframe"`, `"blueprint"` | Converts site layout into blueprint wireframes |
| **Companion Control** | `"go to sleep"`, `"rest"`, `"nap"` | Puts Nick into sleep mode |
| | `"wake up"`, `"awake"` | Wakes Nick up to active mode |
| | `"come here"`, `"home"`, `"den"` | Calls Nick back to the bottom corner dock |
| | `"close"`, `"hide"`, `"dismiss"` | Closes currently open panels or overlays |
| | `"help"`, `"commands"`, `"shortcuts"` | Opens the interactive Command Guide card |

---

## 🛠️ Technology Stack

- **Frontend Core**: React 18 & JavaScript (ESNext)
- **Bundler & Build Tool**: Vite 8
- **Extension Architecture**: Chrome Manifest V3 (MV3)
- **Styling**: Vanilla Scoped CSS (ensures zero CSS style leaks into host web applications)
- **Speech Recognition**: Native Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with localized acoustic models
- **WebAssembly**: Emscripten-compiled C++ codecs (`@jsquash/avif`) for offline client-side image compression
- **Persistence**: `chrome.storage.local` with fallback to `localStorage`

---

## 🚀 Installation & Setup

Because this is a developer prototype, it is not listed on the Chrome Web Store. You can install it locally as an unpacked extension:

### 1. Clone the repository
```bash
git clone https://github.com/annam0273/nick-the-developer-companion.git
cd nick-the-developer-companion
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Extension
```bash
npm run build
```
*This generates a production-ready `dist` folder containing the compiled Chrome extension.*

### 4. Load into Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `dist` folder generated inside your project directory.
5. **Done!** Open any webpage (e.g. `google.com` or `github.com`) and Nick will appear in the bottom corner of your screen.

---

## 🔄 Development & Hot Reloading

When making modifications during development:
1. Run `npm run build` to recompile the bundles.
2. Navigate to `chrome://extensions/` and click the **Reload** (circular arrow) icon on the Nick extension card.
3. Refresh the webpage you are testing on to inject the updated content script.

---

## 🔒 Security & Privacy

Nick is architected with strict offline-first privacy standards:
- **100% Offline & Private**: Zero remote telemetry, zero analytics tracking, and zero external server dependencies. Image compression runs entirely in-memory using WebAssembly.
- **Sanitized Scrapes**: The Forager tool rigorously cleans and sanitizes all scraped SVG DOM elements, stripping out `<script>` tags, `href="javascript:..."`, and `on*` event handlers to eliminate reflection XSS risks.
- **Safe Speech Recognition**: Voice recognition is executed locally via the browser's native `SpeechRecognition` engine.

---

## 🤝 Contributing

Contributions, feedback, and suggestions are always welcome! Feel free to open an issue or submit a Pull Request to help Nick become the ultimate companion for web developers.
