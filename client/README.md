# 💻 BuilderAI — Frontend Client

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![GSAP 3](https://img.shields.io/badge/Animations-GSAP%203-0ae448?logo=greensock&logoColor=white)](https://greensock.com/gsap/)

> Interactive, high-performance web interface for BuilderAI. Built with React 19, strict TypeScript, Vite, Tailwind CSS v4, Sandpack live browser-compilation, and GSAP micro-animations.

---

## 🚀 Key Features & Security Architecture

* **⚡ Real-Time In-Browser React Compilation**: Powered by `@codesandbox/sandpack-react` for instant live execution of multi-file React/Tailwind applications inside an **isolated cross-origin iframe sandbox**.
* **🌊 GSAP-Driven Lenis Smooth Scrolling**: Synchronized momentum inertia scrolling via `Lenis` + `gsap.ticker` across all landing and public pages, with GPU-accelerated background layers for 120 FPS performance.
* **🔮 Pure Glassmorphism Design System**: Tailored frosted glass styling (`.glass-panel`, `.glass-card`, `.glass-pill`, `.glass-modal`) with hardware-accelerated backdrop blur and luminescent rose/coral accents.
* **🛡️ Sandpack Untrusted Code Boundary**: Generated code executes in an isolated sandbox runtime with strict cross-origin object policies, preventing untrusted scripts from accessing the parent window's DOM, cookies, or React state.
* **🔍 Spotlight Command Palette (`Ctrl+K` / `Cmd+K`)**: Fast access to actions (export ZIP, toggle previews, roll back versions, open settings, manage API keys).
* **📸 HTML5 Canvas Image Pre-Compression**: Automatically compresses user-uploaded reference screenshot blueprints client-side before submission, preventing network bottlenecks and optimizing Gemini Vision throughput.
* **📱 Responsive Viewport Switcher**: Instant switching between Desktop (`100%`), Tablet (`768px`), and Mobile (`375px`) device simulator viewports.
* **✨ GSAP 3 Staggered Micro-Animations**: Smooth, aesthetic entrance reveals for hero elements, prompt inputs, project lists, and sidebar transitions.
* **🔐 Scoped In-Memory Session Management**: Primary authentication runs via **`HttpOnly; Secure; SameSite=None`** cookies. In-memory scoped tokens in `api.ts` prevent persistent unencrypted credential exposure in long-term storage.
* **📦 Hardened 1-Click ZIP Export**: Bundling with `jszip` and `file-saver` featuring a strict **Deny-List & Path Sanitizer** that blocks `.env*`, `credentials*`, `*.pem`, `*.key`, `service-account*.json`, and `../` directory traversal attempts.
* **⏱️ Granular Version History & Rollback**: Visual timeline modal allowing 1-click preview and rollback to any earlier project version.

---

## 📂 Architecture & Directory Structure

```
client/
├── public/
│   ├── bg-img.png           # Fallback background asset
│   ├── bg-img.webp          # 13KB optimized background asset
│   ├── logo.svg             # Vector branding mark
│   └── favicon.svg          # Application favicon
├── src/
│   ├── api/
│   │   └── api.ts           # Axios instance with in-memory token state and withCredentials
│   ├── assets/
│   │   └── assets.ts        # Tag suggestions, templates, and static constants
│   ├── components/
│   │   ├── CommandPalette.tsx     # Global Ctrl+K spotlight modal
│   │   ├── DeviceAdvisory.tsx     # Mobile viewport notification advisory banner
│   │   ├── LoginLeft.tsx          # Animated left brand panel for auth screens
│   │   ├── PreviewPanel.tsx       # Sandpack provider and code editor split-pane
│   │   ├── PromptInput.tsx        # Expanding textarea with image drag-and-drop & paste
│   │   ├── PublishModal.tsx       # Deployment & export preview modal
│   │   ├── SettingsModal.tsx      # BYOK API keys, profile, security & DPDP controls
│   │   ├── UserMenu.tsx           # User avatar dropdown and navigation
│   │   └── VersionHistoryModal.tsx# Project revision history & 1-click restore
│   ├── context/
│   │   └── AppContext.tsx   # Central state (User, Projects, Auth Token, Live Builder State)
│   ├── pages/
│   │   ├── BuilderPage.tsx  # Split-pane workspace (Chat + Live Sandpack Preview + Code)
│   │   ├── HomePage.tsx     # Landing page, prompt input, and project list
│   │   ├── LoginPage.tsx    # User authentication screen
│   │   └── RegisterPage.tsx # Account registration with real-time password strength meter
│   ├── utils/
│   │   ├── codeSanitizer.ts # Syntax normalizer for Sandpack compatibility
│   │   ├── exportProject.ts # JSZip exporter with path traversal and secret deny-list
│   │   └── sandpackUtils.ts # Dynamic dependency analyzer
│   ├── index.css            # Tailwind CSS v4 design tokens, custom scrollbars, animations
│   ├── App.tsx              # React Router v7 routes & global modal mount points
│   └── main.tsx             # Root entry point
├── package.json             # Frontend dependencies & build scripts
├── tsconfig.json            # Strict TypeScript configuration
├── vercel.json              # Single-page application (SPA) rewrite configuration
└── vite.config.ts           # Vite configuration & React plugin setup
```

---

## 🛠️ Tech Stack & Dependencies

| Category | Technology | Purpose |
|---|---|---|
| **Framework** | React 19 (`react`, `react-dom`) | UI rendering and component tree |
| **Language** | TypeScript 5.x | 100% strict type safety across components and hooks |
| **Build Tool** | Vite 8.x | High-speed ESM dev server and optimized production bundling |
| **Styling** | Tailwind CSS v4 | Modern, utility-first CSS design system |
| **Sandbox** | Sandpack React (`@codesandbox/sandpack-react`) | In-browser live React compiler and isolated preview iframe |
| **Animations** | GSAP 3 (`gsap`) | Staggered reveals, hero transitions, and spring animations |
| **Icons** | Lucide React (`lucide-react`) | Scalable vector icon library |
| **Routing** | React Router DOM v7 | Client-side routing with clean URL parameters |
| **Exporting** | `jszip` + `file-saver` | In-memory ZIP archive creation and file download trigger |
| **Notifications** | `react-hot-toast` | Toast alerts for operations, errors, and background tasks |
| **Dates** | `moment` | Relative timestamps for project activity |

---

## ⚙️ Environment Variables

Create a `.env` file in the `client/` directory:

```env
# URL of your BuilderAI backend API
# Local Development:
VITE_BASE_URL="http://localhost:3000"

# Production (e.g. Render / Railway):
# VITE_BASE_URL="https://builder-ai-api.onrender.com"
```

---

## 🚦 Available Scripts

In the `client/` directory:

```bash
# 1. Start development server (HMR enabled on http://localhost:5173)
npm run dev

# 2. Type-check and build production bundle into dist/
npm run build

# 3. Preview production build locally
npm run preview
```

---

## ☁️ Deployment (Vercel)

1. Connect your repository to [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variable:
   - `VITE_BASE_URL`: `https://your-backend-api.onrender.com`
5. Deploy. (The included `client/vercel.json` ensures all SPA routes like `/builder/:id` route cleanly without 404 errors on refresh).
