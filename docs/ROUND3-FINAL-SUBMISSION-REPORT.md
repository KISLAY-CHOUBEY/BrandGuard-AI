# BrandGuard AI — Round 3 Final Submission Report

**Hackathon:** CodeNexus Hackathon 2026 — Round 3
**Deadline:** 13 November 2026, 11:59 PM IST
**Project Root:** `E:\ThroneCaptures`
**Team:** Kislay Choubey, Aman Sapra

---

## 1. Problem and Proposed Solution

### Problem
Content teams waste hours manually reviewing content against scattered brand guidelines. Inconsistencies slip through, damaging brand trust. There is no centralized system that lets teams define brand guidelines once and automatically review every piece of content against them with human-in-the-loop approval.

### Proposed Solution
BrandGuard AI provides a centralized guidelines management system with AI-powered review (Google Gemini) via a server-side API proxy. Users define structured brand guidelines (7 categories, severity levels, correct/incorrect examples), submit content (Text/Markdown/HTML), receive AI-generated findings with character-accurate locations and suggested corrections, and then accept/reject findings individually or in bulk. All data persists locally in IndexedDB; the API key never leaves the server. A Bring-Your-Own-Key (BYOK) option allows session-only user-provided keys.

---

## 2. Target Users

| User Type | Role |
|-----------|------|
| Marketing teams | Maintain brand voice across content channels |
| Content creators | Submit content for automated brand review |
| Brand managers | Define and manage brand guidelines |
| Compliance officers | Audit review history and approve/reject changes |

---

## 3. Complete Implemented Workflow

```
1. Define Brand Guidelines
   └─ Create guideline (name, category, rules with severity + examples)
   └─ Toggle active/inactive per guideline

2. Submit Content
   └─ Enter title, content (text/markdown/html), select guidelines
   └─ Content auto-saved to IndexedDB as draft

3. Start AI Review
   └─ Submit triggers Gemini review via /api/gemini server proxy
   └─ Returns findings (severity, location, explanation, correction) + overall score (0-100)

4. Human-in-the-Loop Review
   └─ Accept/reject individual findings
   └─ Accept all findings (bulk)
   └─ Edit suggested corrections before accepting
   └─ Add reviewer comments to findings

5. Conflict Detection & Resolution
   └─ System detects overlapping findings with different corrections
   └─ Approval blocked until all conflicts resolved
   └─ Resolve: Keep First / Keep Second / Custom

6. Approve / Request Changes
   └─ Human approves review → submission marked approved
   └─ Or requests changes → submission returns to changes_requested

7. History & Audit Trail
   └─ Full timeline of submissions, reviews, findings, events
   └─ PDF export for compliance records
   └─ Export/Import all data (JSON)
```

---

## 4. Actual Features and Differentiators

### Implemented Features

| Feature | Status | Description |
|---------|--------|-------------|
| Brand Guidelines Management | ✅ Implemented | 7 categories, severity levels, correct/incorrect examples, active/inactive toggle |
| Content Submission | ✅ Implemented | Text/Markdown/HTML, guideline selection, IndexedDB persistence |
| AI-Powered Review (Gemini) | ✅ Implemented | Structured JSON output, findings with character offsets, overall score, summary |
| Server-Side API Proxy | ✅ Implemented | `/api/gemini` Vercel function; API key never exposed to client |
| Bring-Your-Own-Key (BYOK) | ✅ Implemented | Session-only key in React state; `x-gemini-api-key` header; never persisted |
| Human-in-the-Loop Workflow | ✅ Implemented | Accept/reject findings, bulk accept-all, editor attribution |
| Conflict Detection & Resolution | ✅ Implemented | Overlap detection, approval blocked on unresolved, resolution history |
| History & Audit Trail | ✅ Implemented | Event log per review (AI completed, accepted, rejected, approved, blocked) |
| Demo Workspace | ✅ Implemented | Separate IndexedDB (`thronecaptures-demo-db`), sample data, reset/exit controls |
| Data Export/Import | ✅ Implemented | JSON export (API key stripped), import with settings preservation |
| Responsive UI | ✅ Implemented | Mobile/Tablet/Desktop breakpoints, collapsible sidebar |
| Rate Limiting | ✅ Implemented | 10 req/min per IP on `/api/gemini` |
| Request Validation | ✅ Implemented | 100KB body limit, 1-20 guidelines, required field checks |
| Exponential Backoff | ✅ Implemented | 3 retries with jitter for upstream failures |

### Differentiators

- **Server-side API key proxy**: Unlike client-side Gemini integrations, the API key never reaches the browser
- **BYOK session-only keys**: Users can provide their own key per session; lost on refresh/close
- **Conflict-aware approval**: Contradictory AI findings block approval until resolved by human
- **Zero-data-leakage demo**: Separate IndexedDB for demo mode; demo edits never touch normal data
- **Content size limits**: 100KB body limit prevents abuse

---

## 5. Current Technical Architecture

```
React 18 + TypeScript 5 + Vite 5
├── AppContext (global state: guidelines, submissions, reviews, settings, BYOK key)
├── ThemeContext (light/dark/system, persisted in localStorage)
├── LoadingContext (lazy page loading)
├── Pages: Dashboard, Guidelines, Submit, Reviews, History, Governance, Settings, Demo Workspace
├── GeminiService (client): sends x-gemini-api-key header when user key set
└── /api/gemini (Vercel serverless proxy): header key ?? GEMINI_API_KEY env var

Storage: IndexedDB via `idb`
- Normal DB: thronecaptures-db (user data)
- Demo DB: thronecaptures-demo-db (isolated sample data)
- Export strips geminiApiKey for security

Deploy: Vercel (SPA + Serverless Functions)
Local dev: dev-server.mjs (Express on 3000 + Vite proxy on 3001)
```

---

## 6. Gemini Integration and BYOK Security Model

### BYOK Key Lifecycle (Verified)

1. **Entry**: User enters key in Settings page password input (Show/Hide toggle via Eye/EyeOff)
2. **Save**: Clicking "Save / Connect" calls `setUserGeminiApiKey()` → stored in React `useState` only
3. **Transmission**: Frontend sends key via `x-gemini-api-key` header to `/api/gemini` (never in URL, never in body)
4. **Server**: `api/gemini.ts` reads `req.headers['x-gemini-api-key'] ?? process.env.GEMINI_API_KEY`
5. **Fallback**: If no user key, server uses `GEMINI_API_KEY` environment variable
6. **Persistence**: Key is **never** written to IndexedDB, localStorage, sessionStorage, or export files
   - `storage.exportAllData()` sets `geminiApiKey: ''` in exported settings
   - `storage.importAllData()` preserves current key, ignores imported key
7. **Clearing**: "Clear Key" button sets key to null in React state and geminiService
8. **Session boundaries**: Key lost on full page reload (React state reset); preserved during SPA navigation (React Context persists)

### Key Never Logged or Persisted (Verified by Tests)

- `api/gemini.test.ts`: Console spy verifies key never appears in `console.log/warn/error`
- `api/gemini.test.ts`: Verifies key only passed to `GoogleGenAI` constructor, no other storage writes
- `src/services/storage/index.ts` line 121: `settings: { ...settings, geminiApiKey: '' }` — export strips key

### Server-Side Fallback (Verified by Tests)

- `api/gemini.test.ts`: No header + env var set → `GoogleGenAI` called with env key
- `api/gemini.test.ts`: No header + no env var → 503 response
- `api/gemini.test.ts`: Custom header + env var → custom header takes precedence
- `api/gemini.test.ts`: Empty string header → 503 (falsy check)

---

## 7. Three Round 3 Improvements with Evidence

### Improvement 1: Demo Workspace with Full Isolation

**Implementation Evidence:**
- `src/services/storage/demo.ts` — Separate IndexedDB `thronecaptures-demo-db` (distinct from `thronecaptures-db`)
- `src/context/AppContext.tsx` lines 57-86 — `switchToDemo()` seeds demo data only when demo DB is empty; preserves user's demo edits across sessions
- `src/context/AppContext.tsx` lines 92-113 — `switchToNormal()` loads normal data exclusively from `storage` (never `activeStorage` during mode switch)
- `src/context/AppContext.tsx` lines 115-126 — `resetDemo()` calls `demoStorage.clearDemoData()` only — never touches normal user data
- `src/pages/DemoWorkspace.tsx` — SAMPLE DATA banner, isolated stat cards, Reset/Exit controls, PDF export marked as sample
- **E2E test**: `e2e/demo.spec.ts` — 8 tests covering: enter demo, inspect data, accept/reject findings, conflict blocks approval, resolve conflict, reset, exit, storage isolation (demo data does not leak into normal storage)

**Verification:** All 8 demo workspace E2E tests pass. Storage isolation confirmed — demo uses separate IndexedDB database name.

---

### Improvement 2: Conflict Detection & Resolution in Review Workflow

**Implementation Evidence:**
- `src/context/AppContext.tsx` lines 304-371 — `acceptAllFindings()` detects overlapping findings with different corrections; creates `ReviewConflict[]` objects with status `'unresolved'`; blocks approval when conflicts exist
- `src/context/AppContext.tsx` lines 489-523 — `approveReview()` rejects approval if any conflict has status `'unresolved'`; records `review_approval_blocked` event for audit trail
- `src/context/AppContext.tsx` lines 195-220 — `updateConflict()` resolves conflicts with status `resolved_keep_first` / `resolved_keep_second` / `resolved_custom`
- `src/types/index.ts` lines 66-80 — `ReviewConflict` type: conflictType ('overlap' | 'correction_mismatch'), status ('unresolved' | 'resolved_keep_first' | 'resolved_keep_second' | 'resolved_custom')
- `src/pages/DemoWorkspace.tsx` lines 465-482 — Conflict resolution UI with "Keep First" / "Keep Second" buttons
- **E2E test**: `e2e/demo.spec.ts` — conflict blocks approval, resolve conflict, then approve succeeds

**Verification:** Conflict detection verified in code logic (overlap check in `acceptAllFindings`), approval gate verified in `approveReview()`, resolution paths verified in `updateConflict()`. All E2E tests pass.

---

### Improvement 3: AI Integration Hardening

**Implementation Evidence:**
- `api/gemini.ts` — Server-side Vercel function with:
  - Rate limiting: 10 req/min per IP (`geminiRateLimiter.check`)
  - Request validation: 100KB body limit, 1-20 guidelines, required fields
  - Retry logic: 3 attempts with exponential backoff + jitter, 120s timeout per attempt
  - Structured output: JSON schema enforcement via `responseSchema`
  - Error handling: `mapApiError()` converts Google GenAI errors to structured responses
- `dev-server.mjs` — Local parity: same logic as `api/gemini.ts`, Express on port 3000
- `src/services/ai/gemini.ts` — Client service: `getHeaders()` sends `x-gemini-api-key` only when user key set
- `api/gemini.test.ts` — 9 backend tests: header precedence, env fallback, empty string rejection (503), no key logging, no persistence, 503 when no key, 405 for non-POST

**Verification:** All 9 backend API tests pass. Rate limiting, validation, retries, and error handling implemented in serverless function.

---

## 8. Testing Results (Verified 2026-11-13)

| Check | Command | Result |
|-------|---------|--------|
| **TypeScript typecheck** | `npm run typecheck` | ✅ 0 errors |
| **Production build** | `npm run build` | ✅ Success |
| **Unit tests** | `npm test -- --run` | ✅ **155/155 passing** |
| **E2E tests** | `npx playwright test` | ✅ **22/22 passing** |
| **Lint (main project)** | `npx eslint src/ api/` | ⚠️ 0 errors; pre-existing warnings (unused vars, non-null assertions) cause `--max-warnings 0` to fail — not introduced by Round 3 changes |

### Unit Test Breakdown (155 tests, 8 files)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/__tests__/integration/user-flows.test.tsx` | 9 | Create→submit→review→accept all→approve flow |
| `src/context/AppContext.test.tsx` | 43 | Guidelines, submissions, reviews, conflicts, demo mode, BYOK |
| `src/components/ui/Skeleton.test.tsx` | 13 | Skeleton loader component |
| `src/services/ai/gemini.test.ts` | 28 | Gemini service (BYOK key management, testConnection, reviewContent headers) |
| `api/gemini.test.ts` | 9 | Backend handler (header precedence, env fallback, malformed headers, no key logging/persistence, 503, 405) |
| `src/lib/rate-limiter.test.ts` | 13 | Token bucket rate limiter |
| `src/services/storage.test.ts` | 33 | IndexedDB CRUD, transactions, import/export |
| `src/context/LoadingContext.test.tsx` | 7 | Lazy page loading states |

### E2E Test Breakdown (22 tests, 2 files)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `e2e/demo.spec.ts` | 8 | Demo workspace: enter, inspect, accept finding, conflict blocks approval, resolve conflict, reset, exit, storage isolation |
| `e2e/user-flows.spec.ts` | 14 | Navigation (6 pages), responsive design, mobile nav, settings functionality, core workflow with mocked Gemini |

> **Note**: E2E tests mock the `/api/gemini` endpoint via Playwright `page.route('**/api/gemini')`. No real API key required for CI.

---

## 9. Privacy, Security and Responsible AI Considerations

### Data Classification (Verified)

| Data Type | Storage | Transmission | Retention |
|-----------|---------|--------------|-----------|
| Brand Guidelines | IndexedDB (local) | Never | Until user deletes |
| Content Submissions | IndexedDB (local) | To `/api/gemini` → Gemini API | Until user deletes |
| Review Findings | IndexedDB (local) | Never | Until user deletes |
| Gemini API Key (Server) | Vercel Environment Variable (server-only) | Never (server-side only) | Until admin rotates |
| Gemini API Key (BYOK) | Memory only (React state) | Sent via `x-gemini-api-key` header to `/api/gemini` | Session only — lost on refresh/close |
| Theme Preference | localStorage | Never | Until user clears |

### What Leaves the Browser (Verified)
- **Only**: Content submitted for review → `/api/gemini` → Google Gemini API
- Optional: User-provided BYOK API key via `x-gemini-api-key` header (session-only, not stored)

### Never Leaves Browser
- Data sent to external servers (except via `/api/gemini` proxy)
- Analytics or tracking events
- API keys in logs or error reports
- API keys to the client (server-side only)
- BYOK keys persisted (memory only, never written to disk)

### Known Limitations — Authentication & Authorization

**This application is a single-user MVP for hackathon demonstration. It does not implement authentication or authorization.**

| Aspect | Current State | Risk if Publicly Deployed |
|--------|---------------|---------------------------|
| User Identity | None | Cannot attribute actions to specific users |
| Access Control | None — anyone with URL has full access | Any visitor can create guidelines, submit content, trigger AI reviews, approve/reject |
| Data Isolation | None — single shared IndexedDB | All users see and modify the same data |
| Rate Limiting | ✅ 10 req/min per IP | Mitigates abuse but not a substitute for auth |

**Interim mitigation for hackathon demo:** Enable Vercel Password Protection or deploy behind VPN/ngrok with auth.

---

## 10. Known Limitations

| Limitation | Details | Status |
|------------|---------|--------|
| No authentication/authorization | Single-user MVP; anyone with URL has full access | Documented; Vercel Password Protection recommended for demos |
| Shared browser IndexedDB | All data in one browser = one user's data | Demo mode uses separate DB; not multi-user |
| Gemini E2E tests mocked | Playwright intercepts `/api/gemini`; no real API call in CI | Real API validated manually; CI runs without secrets |
| No image/document analysis | Only Text/Markdown/HTML content supported | Out of scope for hackathon MVP |
| No multi-user isolation | Single IndexedDB per browser profile | Out of scope for hackathon MVP |
| No production CSP validation | CSP headers in `vercel.json` not tested in production | Three.js may need `'unsafe-eval'` for shaders |
| BYOK key lost on refresh | React state key not persisted across page loads | Intentional session-only design |

---

## 11. Future Roadmap

| Item | Priority | Description |
|------|----------|-------------|
| Multi-user collaboration with authentication | P2 | Auth0/Clerk, multi-tenant data isolation |
| Regex pattern support in guidelines | P3 | Pattern-based rule matching |
| Auto-fix application for accepted findings | P3 | Apply corrections directly to content |
| Compliance dashboard & reporting | P3 | Export review metrics for compliance |
| CMS integrations | P3 | Contentful, Sanity, WordPress |
| Image/document analysis | P3 | Gemini Vision support |
| Encrypted IndexedDB | P3 | Additional encryption layer for local data |

---

## 12. Team Members and Contribution Details

| Member | Role |
|--------|------|
| **Kislay Choubey** | Lead Architect, AI Engineer, Backend Services |
| **Aman Sapra** | Product Manager, UI/UX Designer, Frontend Developer |

*Event:* CodeNexus Hackathon 2026 — Round 3 Submission  
*Project:* BrandGuard AI (formerly ThroneCaptures)

---

## Implementation Status Summary

| Category | Implemented | Partially Implemented | Future Scope |
|----------|-------------|----------------------|--------------|
| Brand Guidelines | ✅ | — | Regex patterns |
| Content Submission | ✅ | — | File upload (PDF/DOCX) |
| AI Review (Gemini) | ✅ | — | Vision/image analysis |
| Server-side Proxy | ✅ | — | — |
| BYOK | ✅ | — | Persistent user keys (with auth) |
| Human-in-the-Loop | ✅ | — | Auto-fix application |
| Conflict Detection | ✅ | — | Custom merge UI |
| Demo Workspace | ✅ | — | Multi-scenario demos |
| Export/Import | ✅ | — | Cloud backup |
| Authentication | — | — | Auth0/Clerk integration |

---

*This report reflects the actual implemented code as verified on 2026-11-13. All test results are from actual test runs. No features are claimed that are not present in the source code.*