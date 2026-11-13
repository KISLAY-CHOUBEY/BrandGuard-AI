# BrandGuard AI

> **AI-Powered Brand Consistency & Content Review Platform**  
> Built for CodeNexus Hackathon 2026 — Round 3 Submission

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff.svg)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini-3.8%20Flash-4285f4.svg)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-155%20Unit%20%2B%2022%20E2E-brightgreen.svg)](https://github.com)

---

## 🎯 Product Overview

**BrandGuard AI** helps content teams maintain brand consistency at scale. Define your brand guidelines once, then let AI review every piece of content against them — catching tone drift, terminology errors, accessibility issues, and compliance violations before they publish.

**The Problem**: Content teams waste hours manually reviewing content against scattered brand guidelines. Inconsistencies slip through, damaging brand trust.

**The Solution**: Centralized guidelines + AI-powered review with human-in-the-loop approval. Review content in seconds, not hours.

**Target Users**: Marketing teams, content creators, brand managers, compliance officers at companies producing regular content.

---

## ✨ Implemented Feature List

### 📋 Brand Guidelines Management
- Create structured guidelines with 7 categories (Tone, Terminology, Accessibility, Formatting, Brand Voice, Legal, Custom)
- Define rules with severity levels (low/medium/high/critical), correct/incorrect examples
- Search, filter, and organize with visual cards
- Toggle active/inactive status per guideline

### 📝 Content Submission
- Submit content in Text, Markdown, or HTML format
- Select multiple guidelines for review
- Draft auto-save to local IndexedDB

### 🤖 AI-Powered Review (Gemini 1.5 Flash)
- Structured JSON output — no parsing errors
- Findings with: severity, location (character offsets + context), explanation, suggested correction, guideline reference
- Overall compliance score (0-100)
- AI-generated review summary
- **Server-side API proxy** — API key never leaves the server (Vercel environment variables)
- **Bring Your Own Key (BYOK)** — Optional session-only user-provided key sent via `x-gemini-api-key` header; never persisted

### ✅ Human-in-the-Loop Workflow
- **Never auto-publish** — human approval required
- Accept/reject findings individually or in bulk ("Accept All Findings")
- Status tracking: Draft → In Review → Changes Requested → Approved/Rejected
- Auditor attribution with timestamps

### 🔍 Conflict Detection & Resolution
- Detects contradictory findings (same location, different corrections)
- Resolution options: Keep First, Keep Second, Custom Merge
- **Approval blocked** until all conflicts resolved
- Conflict history preserved in review events

### 📜 History & Audit Trail
- Unified timeline of submissions and reviews
- Search, filter by status, date range
- Detail views with full context (submission, findings, events)
- PDF export for compliance records

### 🎪 Demo Workspace (New in Round 3)
- One-click "Try Demo" from header — no setup required
- Pre-seeded sample data: 3 guidelines, 3 submissions, 3 reviews with findings & conflicts
- Fully interactive: inspect reviews, accept/reject findings, resolve conflicts, approve
- **Reset Demo** restores original sample data
- **Exit Demo** returns to clean normal workspace
- **Storage isolation**: Demo uses separate IndexedDB (`thronecaptures-demo-db`) — zero data leakage

### ⚙️ Settings & Persistence
- Light/Dark/System theme with instant switching (persisted)
- Complete data export (JSON) / clear all data
- **Test Connection** button validates server-side Gemini API configuration
- Security notice explaining server-side API key management
- **Bring Your Own Key (BYOK)** — Enter your own Gemini API key for session-only use (kept in memory, never persisted)

### 🎨 Premium SaaS UI
- Responsive: Mobile (<768px), Tablet (768-1024), Desktop (>1024)
- Collapsible sidebar with mobile slide-in overlay
- CSS Custom Properties design system (60+ tokens)
- Subtle Three.js ambient background (respects `prefers-reduced-motion`, hidden on iOS Low Power Mode)
- Framer Motion animations
- Full keyboard accessibility
- Respects `prefers-reduced-motion`

---

## 🏗 Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BRANDGUARD AI                            │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript 5 + Vite 5                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  AppContext │  │ThemeContext │  │   StorageService        │  │
│  │ (Global     │  │ (Theme +    │  │   (IndexedDB via idb)   │  │
│  │  State)     │  │  Persist)   │  │   Guidelines,           │  │
│  └─────────────┘  └─────────────┘  │   Submissions,          │  │
│         │              │           │   Reviews, Findings,    │  │
│         ▼              ▼           │   Events, Conflicts,    │  │
│  ┌─────────────────────────────────┐  │   Settings            │  │
│  │         Pages (Lazy Loaded)     │  └─────────────────────────┘  │
│  │  Dashboard | Guidelines | Submit │                                │
│  │  Reviews   | History  | Settings│                                │
│  │  Governance | Demo Workspace   │                                │
│  └─────────────────────────────────┘                                │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────┐                                            │
│  │   GeminiService     │                                            │
│  │   (AI Review)       │                                            │
│  └─────────────────────┘                                            │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────┐     ┌─────────────────────┐               │
│  │  /api/gemini        │────▶│  Google Gemini API  │               │
│  │  (Serverless Proxy) │     │  (External)         │               │
│  └─────────────────────┘     └─────────────────────┘               │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────────┐                                            │
│  │  Demo Storage       │                                            │
│  │  (Separate IndexedDB)                                            │
│  └─────────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **State Management** | React Context (AppContext, ThemeContext) | Zero dependencies, sufficient for MVP scope |
| **Persistence** | IndexedDB via `idb` wrapper | Offline-first, no backend required for demo |
| **Demo Isolation** | Separate IndexedDB database (`thronecaptures-demo-db`) | Zero data leakage; demo edits don't affect user data |
| **AI Integration** | Server-side Vercel function proxy | API key never exposed to client; CORS handled |
| **Code Splitting** | `React.lazy` + `Suspense` per page | Fast initial load; pages load on demand |
| **Routing** | React Router v6 | Standard, mature, type-safe |
| **Styling** | CSS Custom Properties (60+ tokens) | No runtime overhead; theming via variables |
| **Testing** | Vitest (unit) + Playwright (E2E) | Fast unit tests; real browser E2E |

---

## 🚀 Three Round 2 Improvements (CodeNexus Hackathon)

### 1. **Demo Workspace with Full Isolation** ✨
- **Before**: No way to try the product without creating guidelines/submissions manually
- **After**: One-click "Try Demo" → fully functional workspace with sample data
- **Technical**: Separate IndexedDB database, seeded on first visit, persists across sessions, Reset/Exit controls
- **Impact**: Judges/stakeholders can evaluate the full workflow in 30 seconds

### 2. **Conflict Detection & Resolution in Review Workflow** ⚖️
- **Before**: Findings were independent; contradictory AI suggestions could both be accepted
- **After**: System detects conflicts (same location, different corrections), blocks approval until resolved
- **Technical**: Conflict objects stored on Review, resolution tracked in events, approval gated on `conflicts.length === 0`
- **Impact**: Prevents contradictory approvals; audit trail shows how conflicts were resolved

### 3. **AI Integration Hardening** 🛡️
- **Before**: Direct client→Gemini calls; no retry, no validation, no rate limiting
- **After**: Server-side proxy with exponential backoff (3 retries, jitter), request validation, 100KB body limit, rate limiting (10 req/min/IP), structured error responses (503 for upstream failures)
- **Technical**: `api/gemini.ts` Vercel function + `dev-server.mjs` for local parity; `geminiService` client handles retries
- **Impact**: Reliable under load; protects API quota; graceful degradation

---

## 🧪 Testing Results (Verified 2026-11-13)

| Test Suite | Command | Result |
|------------|---------|--------|
| **TypeScript** | `npm run typecheck` | ✅ 0 errors |
| **ESLint** | `npm run lint` | ⚠️ 0 errors; pre-existing warnings cause `--max-warnings 0` to fail |
| **Production Build** | `npm run build` | ✅ Success |
| **Unit Tests** | `npm run test -- --run` | ✅ **155/155 passing** |
| **E2E Tests** | `npx playwright test` | ✅ **22/22 passing** |

### Test Coverage Details

**Unit Tests (155)** — `src/**/*.test.ts(x)`:
- Storage service (IndexedDB CRUD, transactions, import/export) — 33 tests
- Gemini service (request building, response parsing, retry logic) — 13 tests
- Rate limiter (token bucket, sliding window) — 13 tests
- AppContext (guidelines, submissions, reviews, conflicts, demo mode) — 43 tests
- LoadingContext (lazy page loading states) — 7 tests
- UI components (Skeleton, Modal focus trap) — 13+9 tests
- Integration user flows (create→submit→review→approve) — 9 tests

**E2E Tests (22)** — `e2e/*.spec.ts`:
- Core user flows (navigation to all 6 pages) — 7 tests
- Responsive design (mobile hamburger, desktop sidebar) — 2 tests
- Mobile navigation (menu open, navigate) — 1 test
- Settings functionality (test connection, security notice, connection status) — 3 tests
- **Core workflow with mocked Gemini** (create guideline → submit → review → accept all → approve) — 1 test
- **Demo workspace** (enter demo, inspect, accept finding, conflict blocks approval, resolve conflict, reset, exit, storage isolation) — 8 tests

> **Note**: E2E tests mock the `/api/gemini` endpoint via Playwright `page.route('**/api/gemini')`. No real API key required for CI.

---

## ⚠️ Honest Limitations (Disclosed for Submission)

| Limitation | Details | Mitigation / Status |
|------------|---------|---------------------|
| **No authentication/authorization** | Single-user MVP; anyone with URL has full access | Documented in SECURITY.md; Vercel Password Protection recommended for demos |
| **Shared browser IndexedDB** | All data in one browser = one user's data | Demo mode uses separate DB; not a multi-user system |
| **Gemini E2E tests are mocked** | Playwright intercepts `/api/gemini`; no real API call in CI | Real API validated manually; CI runs without secrets |
| **No image/document analysis** | Only Text/Markdown/HTML content supported | PDF upload extracts text only; no vision/model support |
| **No multi-user isolation** | Single IndexedDB per browser profile | Out of scope for hackathon MVP |
| **No production CSP validation** | CSP headers in `vercel.json` not tested in production | Three.js may need `'unsafe-eval'` for shaders |
| **IndexedDB migration undocumented** | DB_VERSION=3 but no `onupgradeneeded` logic visible | Data persists in demo; migration needed for schema changes |

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18, TypeScript 5, Vite 5 |
| **Routing** | React Router 6 |
| **State** | React Context (AppContext, ThemeContext, LoadingContext) |
| **Storage** | IndexedDB via `idb` (normal + separate demo DB) |
| **AI** | Google Gemini 1.5 Flash (`@google/genai`) via serverless proxy |
| **Styling** | CSS Custom Properties (Design System, 60+ tokens) |
| **3D** | Three.js, React Three Fiber, Drei |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Dates** | date-fns |
| **PDF** | jsPDF, html2canvas |
| **Testing** | Vitest, React Testing Library, Playwright |
| **Linting** | ESLint, TypeScript Strict |
| **Deploy** | Vercel (SPA + Serverless Functions) |

---

## 📱 Responsive Breakpoints

| Device | Width | Sidebar |
|--------|-------|---------|
| Mobile | < 768px | Slide-in overlay |
| Tablet | 768-1024px | Collapsed (72px) |
| Desktop | > 1024px | Full (260px) |
| Large | > 1440px | Full, content max 1280px |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ LTS
- npm 10+
- Google Gemini API key ([Get one free](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone
git clone https://github.com/KISLAY-CHOUBEY/BrandGuard-AI.git
cd BrandGuard-AI

# Install dependencies
npm install

# Configure Gemini API key (server-side)
# Set GEMINI_API_KEY in .env.local for local development
# or in Vercel Project Settings → Environment Variables for production

# Start development server (full-stack: Vite on 3001 + Express proxy on 3000)
npm run dev:full
```

Open `http://localhost:3000`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only (port 3001, no API) |
| `npm run dev:full` | Start full-stack dev server (Vite 3001 + Express proxy 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint check |
| `npm run test` | Run unit tests (155 tests) |
| `npx playwright test` | Run E2E tests (22 tests) |

---

## 📦 Production Build & Deploy

```bash
npm run build
# Output: dist/

npm run preview
# Preview at http://localhost:4173
```

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables
4. Deploy — auto-detects Vite; API key configured server-side only

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
| [Round 3 Final Submission Report](docs/ROUND3-FINAL-SUBMISSION-REPORT.md) | Final submission readiness & verification |
| [Roadmap](docs/ROADMAP.md) | Round-wise Plan |
| [Team Plan](docs/TEAM-PLAN.md) | Roles & Responsibilities |
| [Project Status](docs/PROJECT-STATUS.md) | Progress Tracker |
| [Setup](docs/SETUP.md) | Developer Setup Guide |
| [Decisions](docs/DECISIONS.md) | Architectural Decisions |
| [Round 1 Proposal](docs/ROUND1-PROPOSAL.md) | Hackathon Proposal |

---

## 🔐 Security & Privacy

- **Server-side API proxy** — Gemini API key never leaves the server
- **Content sent only to `/api/gemini`** (same-origin) → Google Gemini API
- **No analytics, tracking, or telemetry**
- **HTTPS enforced** in production (Vercel)
- **Rate limited** — 10 requests/minute per IP on `/api/gemini`
- **Request size limit** — 100KB body limit on `/api/gemini`
- **Exponential backoff** — 3 retries with jitter for upstream failures
- **Bring Your Own Key (BYOK)** — Optional session-only user-provided key; kept in memory only, never persisted to IndexedDB, localStorage, or exported data; lost on refresh/close

> ⚠️ **Important Limitations** (see Limitations section above):
> - **No authentication or authorization** — single-user MVP for hackathon demonstration
> - **Anyone with the URL has full access** to create guidelines, submit content, trigger AI reviews, and approve/reject
> - **All data is shared** in a single browser IndexedDB (no multi-user isolation)
> - **Do not deploy publicly without adding authentication** (see [SECURITY.md](docs/SECURITY.md#known-limitations))
> - For hackathon demos: enable Vercel Password Protection or deploy behind VPN/ngrok with auth
>
> **API Key**: Stored in Vercel Environment Variables (server-side only). Never exposed to client. Configure in Vercel Project Settings → Environment Variables. Users may also provide their own key per session via the Settings page (BYOK).

---

## 🗺 Roadmap

### Round 1 (Nov 2-3, 2026) — Proposal ✅
- Problem analysis, solution design, architecture, feasibility, team plan

### Round 2 — Development ✅
- All MVP features complete
- Gemini integration working reliably
- Local persistence via IndexedDB
- Responsive UI on all devices

### Round 3 — Demo ✅
- **Demo Workspace** with sample data & full isolation
- **Conflict detection & resolution** in review workflow
- **AI Integration Hardening** (rate limiting, retries, validation, size limits)
- All tests passing (131 unit + 22 E2E)
- Documentation updated for accuracy

### Post-Hackathon
- Multi-user collaboration with authentication
- Regex pattern support in guidelines
- Auto-fix application for accepted findings
- Compliance dashboard & reporting
- CMS integrations (Contentful, Sanity, WordPress)
- Image/document analysis (Gemini Vision)

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
- **Open Source**: React, Vite, Three.js, Framer Motion, Lucide, date-fns, idb, jsPDF, html2canvas, Vitest, Playwright

---

## 📞 Contact

- **Issues**: GitHub Issues
- **Team**: Kislay Choubey, Aman Sapra
- **Event**: CodeNexus Hackathon 2026 — Round 3 Submission

---

**Built with ❤️ for CodeNexus Hackathon 2026 — BrandGuard AI**