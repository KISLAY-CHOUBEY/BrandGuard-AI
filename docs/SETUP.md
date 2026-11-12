# Setup & Installation Guide

## ThroneCaptures — Developer Setup

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x LTS | Runtime |
| **npm** | 10.x | Package manager |
| **Git** | 2.40+ | Version control |
| **VS Code** | Latest | Recommended IDE |

### 1.1 Verify Installation

```bash
node --version   # v20.x.x
npm --version    # 10.x.x
git --version    # 2.40+
```

---

## 2. Project Setup

### 2.1 Clone Repository

```bash
git clone <repository-url>
cd ThroneCaptures
```

### 2.2 Install Dependencies

```bash
npm install
```

Expected output:
```
added 280 packages in 15s
```

### 2.3 Environment Configuration

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Gemini API key (for local development only):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note**: Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
> **Important**: The API key is now stored server-side. For local development, use `.env.local`. For production, set `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables. The frontend never receives or stores the API key.

---

## 3. Development Workflow

### 3.1 Start Development Server

**Full-stack (with API proxy):**
```bash
npm run dev:full
```
Server starts at `http://localhost:3000` (Express proxy on 3000, Vite on 3001)

**Frontend only (no API):**
```bash
npm run dev
```
Server starts at `http://localhost:3001` (Vite only, no API routes)

### 3.2 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only (port 3001, no API) |
| `npm run dev:full` | Start full-stack dev server (Vite 3001 + Express proxy 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code quality check |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Tests with coverage report |

### 3.3 TypeScript Strict Mode

```bash
npm run typecheck
# Runs: tsc --noEmit
# Must pass with 0 errors
```

### 3.4 ESLint

```bash
npm run lint
# Runs: eslint src --ext ts,tsx
# Must pass with 0 warnings
```

---

## 4. Project Structure

```
ThroneCaptures/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── ui/            # Reusable primitives (Button, Card, Modal...)
│   │   └── layout/        # Sidebar, Header, MainLayout, ThreeBackground
│   ├── context/
│   │   ├── AppContext.tsx      # Global state + CRUD
│   │   └── ThemeContext.tsx    # Theme management
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Guidelines.tsx
│   │   ├── Submit.tsx
│   │   ├── Reviews.tsx
│   │   ├── History.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   ├── storage/         # IndexedDB CRUD
│   │   └── ai/              # Gemini integration
│   ├── styles/
│   │   └── globals.css      # Design system (CSS variables)
│   ├── types/
│   │   └── index.ts         # All TypeScript types
│   ├── utils/
│   │   └── date.ts          # Formatting, classNames
│   ├── App.tsx              # Routing + lazy loading
│   └── main.tsx             # Entry + providers
├── docs/                    # 16 documentation files
├── .env.example             # Environment template
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vercel.json
```

---

## 5. Key Dependencies

### 5.1 Production

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.2 | UI library |
| `react-dom` | 18.2 | DOM renderer |
| `react-router-dom` | 6.20 | Routing |
| `@google/genai` | latest | Gemini API |
| `idb` | 8.0 | IndexedDB wrapper |
| `framer-motion` | 10.16 | Animations |
| `lucide-react` | 0.294 | Icons |
| `three` | 0.158 | 3D graphics |
| `@react-three/fiber` | 8.15 | React Three.js |
| `@react-three/drei` | 9.88 | Three.js helpers |
| `date-fns` | 2.30 | Date formatting |
| `zod` | 3.22 | Validation (planned) |

### 5.2 Development

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | 5.0 | Build tool |
| `typescript` | 5.3 | Type checking |
| `eslint` | 8.54 | Linting |
| `@types/react` | 18.2 | Type definitions |
| `@types/three` | 0.158 | Three.js types |
| `vitest` | 1.0 | Unit testing |
| `@testing-library/react` | 14.0 | Component testing |

---

## 6. Environment Variables

### 6.1 Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key (server-side only) | `AIzaSy...` |

### 6.2 Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_APP_TITLE` | `ThroneCaptures` | App title in header |

### 6.3 .env.example

```env
# Google Gemini API Key (server-side only)
# Get yours at: https://aistudio.google.com/apikey
GEMINI_API_KEY=

# Optional: App customization
VITE_APP_TITLE=ThroneCaptures
```

---

## 7. IDE Configuration (VS Code)

### 7.1 Recommended Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

### 7.2 Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## 8. Troubleshooting

### 8.1 Port Already in Use

```bash
# Kill process on port 3000 (full-stack) or 3001 (Vite only)
npx kill-port 3000
npx kill-port 3001
# Or use different port for Vite
npm run dev -- --port 3002
```

### 8.2 TypeScript Errors After Pull

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run typecheck
```

### 8.3 IndexedDB Not Persisting

- Check browser DevTools → Application → IndexedDB
- Ensure not in Private/Incognito mode
- Clear site data and retry

### 8.4 Gemini API Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `API_KEY_INVALID` | Wrong key format | Verify key in Google AI Studio |
| `QUOTA_EXCEEDED` | Daily limit reached | Wait or request quota increase |
| `MODEL_NOT_FOUND` | Wrong model name | Use `gemini-1.5-flash` |

### 8.5 Build Fails

```bash
# Clear Vite cache
npm run build -- --force

# Or full clean
rm -rf dist node_modules/.vite
npm run build
```

---

## 9. Production Deployment

### 9.1 Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables
4. Deploy — no build-time env vars required; the API key is configured server-side

### 9.2 Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other chunks]
└── vite.svg
```

### 9.3 Vercel Config (`vercel.json`)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

---

## 10. Development Tips

### 10.1 Hot Module Replacement

- Changes to React components update instantly
- Context/state changes may require refresh
- CSS variable changes apply immediately

### 10.2 Debugging IndexedDB

```javascript
// In DevTools Console
const db = await idb.openDB('thronecaptures-db', 1);
const tx = db.transaction('guidelines', 'readonly');
const all = await tx.store.getAll();
console.table(all);
```

### 10.3 Testing Gemini Locally

```bash
# Test API key directly
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

---

## 11. Common Issues Checklist

- [ ] Node.js 20+ installed
- [ ] `npm install` completed without errors
- [ ] `.env.local` file created with valid `GEMINI_API_KEY`
- [ ] `npm run dev:full` starts successfully (or `npm run dev` for frontend only)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` produces `dist/`
- [ ] App loads at `http://localhost:3000` (or `http://localhost:3001` for frontend only)
- [ ] Settings page shows "Test Connection" button (no API key input)
- [ ] "Test Connection" shows success
- [ ] Can create guideline and submission
- [ ] AI review works end-to-end

---

## 12. Useful Commands Reference

```bash
# Development
npm run dev                    # Start Vite dev server (port 3001)
npm run dev:full               # Start full-stack dev server (Vite 3001 + Express proxy 3000)
npm run dev -- --host          # Expose on network
npm run dev -- --port 3002     # Custom port for Vite

# Quality
npm run typecheck              # TypeScript check
npm run lint                   # ESLint check
npm run lint -- --fix          # Auto-fix lint issues

# Testing
npm run test                   # Run tests
npm run test -- --watch        # Watch mode
npm run test:coverage          # Coverage report

# Build
npm run build                  # Production build
npm run preview                # Preview build

# Maintenance
npm audit                      # Security audit
npm outdated                   # Check outdated packages
npm update                     # Update packages
```

---

## 13. Gate Facts

- This file supersedes: Nothing (new documentation file)
- Linked from: README.md, ROADMAP.md
- User instruction: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."