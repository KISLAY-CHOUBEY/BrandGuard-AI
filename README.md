# ThroneCaptures

> **AI-Powered Content Review & Brand Consistency Platform**  
> Built for CodeNexus Hackathon 2026

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini-1.5%20Flash-4285f4.svg)](https://ai.google.dev/)

---

## 🎯 Overview

ThroneCaptures helps content teams maintain brand consistency at scale. Define your brand guidelines once, then let AI review every piece of content against them — catching tone drift, terminology errors, accessibility issues, and compliance violations before they publish.

**The Problem**: Content teams waste hours manually reviewing content against scattered brand guidelines. Inconsistencies slip through, damaging brand trust.

**The Solution**: Centralized guidelines + AI-powered review with human-in-the-loop approval. Review content in seconds, not hours.

---

## ✨ Features

### 📋 Brand Guidelines Management
- Create structured guidelines with categories (Tone, Terminology, Accessibility, Formatting, Brand Voice, Legal, Custom)
- Define rules with severity levels, correct/incorrect examples
- Search, filter, and organize with visual cards

### 📝 Content Submission
- Submit content in Text, Markdown, or HTML
- Select multiple guidelines for review
- Draft auto-save to local storage

### 🤖 AI-Powered Review (Gemini 1.5 Flash)
- Structured JSON output — no parsing errors
- Findings with: severity, location, explanation, suggested correction, guideline reference
- Overall compliance score (0-100)
- AI-generated review summary

### ✅ Human-in-the-Loop Workflow
- **Never auto-publish** — human approval required
- Accept/reject findings individually or in bulk
- Status tracking: Draft → In Review → Changes Requested → Approved
- Auditor attribution with timestamps

### 📜 History & Audit Trail
- Unified timeline of submissions and reviews
- Search, filter by status, date range
- Detail views with full context

### ⚙️ Settings & Persistence
- Secure Gemini API key storage (IndexedDB)
- Test connection before saving
- Light/Dark/System theme with instant switching
- Complete data export/clear

### 🎨 Premium SaaS UI
- Responsive: Mobile (<768px), Tablet (768-1024), Desktop (>1024)
- Collapsible sidebar with mobile slide-in overlay
- CSS Custom Properties design system (60+ tokens)
- Subtle Three.js ambient background
- Framer Motion animations
- Full keyboard accessibility
- Respects `prefers-reduced-motion`

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        THRONE CAPTURES                          │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite 5                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  AppContext │  │ThemeContext │  │   StorageService        │  │
│  │ (Global     │  │ (Theme +    │  │   (IndexedDB via idb)   │  │
│  │  State)     │  │  Persist)   │  │   Guidelines,           │  │
│  └─────────────┘  └─────────────┘  │   Submissions,          │  │
│         │              │           │   Reviews, Findings,    │  │
│         ▼              ▼           │   Settings              │  │
│  ┌─────────────────────────────────┐  └─────────────────────────┘  │
│  │         Pages (Lazy Loaded)     │                                │
│  │  Dashboard | Guidelines | Submit │                                │
│  │  Reviews   | History  | Settings│                                │
│  └─────────────────────────────────┘                                │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────┐                                            │
│  │   GeminiService     │                                            │
│  │   (AI Review)       │                                            │
│  └─────────────────────┘                                            │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────┐                                            │
│  │  Google Gemini API  │                                            │
│  │  (External)         │                                            │
│  └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone
git clone <repository-url>
cd ThroneCaptures

# Install dependencies
npm install

# Start development server
npm run dev

# Configure Gemini API key
Open the app at http://localhost:5174, go to Settings, and enter your Gemini API key. The key is stored locally in your browser's IndexedDB and used only for direct requests to the Google Gemini API.
```

Open `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint check |
| `npm run test` | Run unit tests |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [PRD](docs/PRD.md) | Product Requirements |
| [TRD](docs/TRD.md) | Technical Requirements |
| [Architecture](docs/ARCHITECTURE.md) | System Architecture (C4) |
| [UI/UX](docs/UI-UX.md) | Design System & Patterns |
| [User Flow](docs/USER-FLOW.md) | User Journeys |
| [Features](docs/FEATURES.md) | Feature Inventory |
| [Implementation Plan](docs/IMPLEMENTATION-PLAN.md) | Phased Build Plan |
| [Testing](docs/TESTING.md) | Test Cases & Results |
| [Security](docs/SECURITY.md) | Security & Privacy Model |
| [Roadmap](docs/ROADMAP.md) | Round-wise Plan |
| [Team Plan](docs/TEAM-PLAN.md) | Roles & Responsibilities |
| [Project Status](docs/PROJECT-STATUS.md) | Progress Tracker |
| [Setup](docs/SETUP.md) | Developer Setup Guide |
| [Decisions](docs/DECISIONS.md) | Architectural Decisions |
| [Round 1 Proposal](docs/ROUND1-PROPOSAL.md) | Hackathon Proposal |

---

## 🔐 Security & Privacy

- **No backend** — all data stays in your browser
- **API key stored locally** in IndexedDB
- **Content sent only to Gemini API** — nowhere else
- **No analytics, tracking, or telemetry**
- **HTTPS enforced** in production
- **GDPR/CCPA compliant** by design

> ⚠️ **Note**: The Gemini API key is entered via the Settings UI and stored in your browser's IndexedDB (not encrypted). It is sent directly from your browser to the Google Gemini API when you request a review. Use a dedicated key with restrictions in Google Cloud Console. Anyone with access to your browser profile may be able to read data stored in IndexedDB.

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18, TypeScript 5, Vite 5 |
| **Routing** | React Router 6 |
| **State** | React Context (AppContext, ThemeContext) |
| **Storage** | IndexedDB via `idb` |
| **AI** | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| **Styling** | CSS Custom Properties (Design System) |
| **3D** | Three.js, React Three Fiber, Drei |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Dates** | date-fns |
| **Testing** | Vitest, React Testing Library |
| **Linting** | ESLint, TypeScript Strict |
| **Deploy** | Vercel |

---

## 📱 Responsive Breakpoints

| Device | Width | Sidebar |
|--------|-------|---------|
| Mobile | < 768px | Slide-in overlay |
| Tablet | 768-1024px | Collapsed (72px) |
| Desktop | > 1024px | Full (260px) |
| Large | > 1440px | Full, content max 1280px |

---

## 🧪 Testing

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test

# Coverage
npm run test -- --coverage

# E2E (manual)
# Follow scenarios in docs/TESTING.md
```

---

## 📦 Production Build

```bash
npm run build
# Output: dist/

npm run preview
# Preview at http://localhost:4173
```

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Deploy — no build-time env vars required; enter your Gemini API key in the app's Settings page after deployment

---

## 🗺 Roadmap

### Round 1 (Nov 2-3, 2026) — Proposal
- ✅ Problem analysis, solution design, architecture, feasibility, team plan

### Round 2 — Development
- ✅ All MVP features complete
- ✅ Gemini integration working
- ✅ Local persistence
- ✅ Responsive UI

### Round 3 — Demo
- 🔄 Demo script, sample data, rehearsal
- 🔄 Cross-browser, accessibility final pass

### Post-Hackathon
- Multi-user collaboration
- Regex pattern support in guidelines
- Auto-fix application
- Compliance dashboard
- CMS integrations

---

## 👥 Team

| Member | Role |
|--------|------|
| **Kislay Choubey** | Lead Architect, AI Engineer, Backend Services |
| **Aman Sapra** | Product Manager, UI/UX Designer, Frontend Developer |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **CodeNexus Hackathon** by We Code Coders
- **Google Gemini** for AI capabilities
- **Open Source**: React, Vite, Three.js, Framer Motion, Lucide, date-fns, idb

---

## 📞 Contact

- **Issues**: GitHub Issues
- **Team**: Kislay Choubey, Aman Sapra
- **Event**: CodeNexus Hackathon 2026

---

**Built with ❤️ for CodeNexus Hackathon 2026**

---

**Gate Facts:**
- This file supersedes: Nothing (new README file for the project root)
- Linked from: All docs/*.md files reference back to root, package.json homepage field
- User instruction: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."