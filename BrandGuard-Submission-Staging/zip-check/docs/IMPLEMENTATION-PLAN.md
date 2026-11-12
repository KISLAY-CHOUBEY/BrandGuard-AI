# Implementation Plan

## ThroneCaptures — Development Phases & Priorities

---

## 1. Development Phases Overview

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| **Phase 1** | Week 1 | Foundation | Project setup, design system, core infrastructure |
| **Phase 2** | Week 2 | Core Features | Guidelines, Submission, AI Review, Findings |
| **Phase 3** | Week 3 | Workflow & Polish | Approval workflow, History, Settings, Testing |
| **Phase 4** | Week 4 | Hackathon Prep | Documentation, demo prep, bug fixes |

---

## 2. Phase 1: Foundation (Week 1)

### 2.1 Project Setup
- [x] Initialize Vite + React + TypeScript
- [x] Configure ESLint, TypeScript, Prettier
- [x] Set up path aliases (`@/`, `@components/`, etc.)
- [x] Configure Git, `.gitignore`, `.vercelignore`
- [x] Create `.env.example` with `VITE_GEMINI_API_KEY`

### 2.2 Design System
- [x] CSS custom properties (colors, spacing, typography, shadows)
- [x] Light/dark theme with `data-theme` attribute
- [x] Global styles, reset, utilities
- [x] Responsive breakpoints
- [x] Animation keyframes, reduced motion support

### 2.3 Core Infrastructure
- [x] React Router with layout routes
- [x] AppContext (global state + persistence)
- [x] ThemeContext (theme management)
- [x] Storage Service (IndexedDB via idb)
- [x] Gemini Service (API integration)
- [x] Utility functions (date formatting, classNames)

### 2.4 UI Primitives
- [x] Button (variants, sizes, loading state)
- [x] Card (variants, header/content/footer)
- [x] Input, Textarea, Select (validation, error states)
- [x] Badge (variants, sizes, dot indicators)
- [x] Modal (portal, focus trap, animations)
- [x] Toast/Toaster (portal, auto-dismiss)

### 2.5 Layout Components
- [x] Sidebar (collapsible, mobile overlay)
- [x] Header (search, notifications, theme, user menu)
- [x] MainLayout (responsive, ThreeBackground)
- [x] ThreeBackground (Three.js, prefers-reduced-motion)

---

## 3. Phase 2: Core Features (Week 2)

### 3.1 Guidelines Management
- [x] Guidelines page with search/filter
- [x] GuidelineCard display
- [x] Create/Edit Modal with dynamic rules
- [x] Category icons, severity badges
- [x] Active/inactive toggle
- [x] Delete confirmation
- [x] Persistence to IndexedDB

### 3.2 Content Submission
- [x] Submit page with submission list
- [x] SubmissionCard with status badges
- [x] Submit Modal (title, content, type, guideline selection)
- [x] Content type support (text/markdown/html)
- [x] View Submission Modal
- [x] Draft state management

### 3.3 AI Review Integration
- [x] GeminiService with structured output schema
- [x] Prompt engineering with guidelines + rules
- [x] Response validation & parsing
- [x] Error handling (network, parse, API errors)
- [x] Review initiation from submission
- [x] Loading states during review

### 3.4 Findings Display
- [x] ReviewDetailModal with tabs (Findings, Content, Guidelines)
- [x] FindingCard with severity, location, explanation, correction
- [x] Accept/Reject individual findings
- [x] Accept All bulk action
- [x] Status tracking (pending/accepted/rejected)
- [x] Guideline reference linking

---

## 4. Phase 3: Workflow & Polish (Week 3)

### 4.1 Approval Workflow
- [x] Review status states (draft → in_review → changes_requested → approved)
- [x] Approve action with auditor attribution
- [x] Request Changes action
- [x] Submission status sync
- [x] Timestamps on all transitions

### 4.2 History & Audit
- [x] Unified timeline (submissions + reviews)
- [x] Search, status filter, date filter
- [x] HistoryRow with type icons
- [x] HistoryDetailModal (submission or review)
- [x] Export placeholder

### 4.3 Settings
- [x] API Key input (show/hide, test connection)
- [x] Security notice documentation
- [x] Theme selector (light/dark/system cards)
- [x] Data management (clear all with confirmation)
- [x] About section

### 4.4 Dashboard
- [x] Stats cards (guidelines, submissions, reviews, pending)
- [x] Pending reviews section
- [x] Quick actions
- [x] Recent activity feed

---

## 5. Phase 4: Hackathon Prep (Week 4)

### 5.1 Documentation
- [x] PRD.md — Product Requirements
- [x] TRD.md — Technical Requirements
- [x] UI-UX.md — Design System
- [x] ARCHITECTURE.md — System Architecture
- [x] IMPLEMENTATION-PLAN.md — This file
- [x] USER-FLOW.md — User Journeys
- [x] FEATURES.md — Feature Inventory
- [x] TESTING.md — Test Cases
- [x] SECURITY.md — Security & Privacy
- [x] ROADMAP.md — Round-wise Plan
- [x] TEAM-PLAN.md — Team Responsibilities
- [x] PROJECT-STATUS.md — Progress Tracker
- [x] SETUP.md — Installation Guide
- [x] DECISIONS.md — Technical Decisions
- [x] README.md — Project Overview
- [x] Round 1 Proposal Content

### 5.2 Quality Assurance
- [ ] Lint & typecheck pass
- [ ] Production build succeeds
- [ ] Manual testing all user flows
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive testing
- [ ] Accessibility audit (keyboard, screen reader)
- [ ] Performance check (bundle size, load time)

### 5.3 Demo Preparation
- [ ] Demo script (3-min walkthrough)
- [ ] Sample guidelines for demo
- [ ] Sample content for review
- [ ] Screenshots for presentation
- [ ] Backup plan (video demo)

---

## 6. Priority Matrix

| Feature | Priority | Effort | Risk | Notes |
|---------|----------|--------|------|-------|
| Project Setup | P0 | Low | Low | Done |
| Design System | P0 | Medium | Low | Done |
| AppContext + Storage | P0 | Medium | Medium | Done |
| Gemini Integration | P0 | High | High | Core differentiator |
| Guidelines CRUD | P0 | Medium | Low | Done |
| Content Submission | P0 | Medium | Low | Done |
| AI Review Flow | P0 | High | High | Done |
| Findings UI | P0 | Medium | Medium | Done |
| Approval Workflow | P0 | Medium | Low | Done |
| History | P1 | Medium | Low | Done |
| Settings | P1 | Medium | Low | Done |
| Dashboard | P1 | Medium | Low | Done |
| Three.js Background | P2 | Low | Low | Enhancement |
| Export Features | P3 | Medium | Low | Post-MVP |
| Team Features | P3 | High | Medium | Post-MVP |

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini API key invalid/quota | Medium | High | Clear error messages, test button in settings |
| Structured output parsing fails | Medium | High | Robust validation, fallback handling |
| IndexedDB not supported | Low | High | Graceful degradation notice |
| Three.js performance on mobile | Medium | Medium | Respects prefers-reduced-motion, CSS fallback |
| Theme flash on load | Low | Medium | Inline script in index.html (future) |
| Bundle size too large | Low | Medium | Code splitting, lazy loading |

---

## 8. Definition of Done

A feature is **Done** when:
- [ ] Code implemented and reviewed
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Manual testing verifies happy path
- [ ] Error states handled gracefully
- [ ] Responsive on mobile/desktop
- [ ] Accessible (keyboard, ARIA)
- [ ] Persists correctly to IndexedDB
- [ ] Documented in relevant .md files

---

## 9. Team Velocity Tracking

| Sprint | Planned | Completed | Carryover | Notes |
|--------|---------|-----------|-----------|-------|
| Week 1 | 15 tasks | 15 | 0 | Foundation complete |
| Week 2 | 18 tasks | 18 | 0 | Core features complete |
| Week 3 | 12 tasks | 12 | 0 | Workflow complete |
| Week 4 | 10 tasks | — | — | Documentation & polish |

---

## 10. Hackathon Round Alignment

### Round 1 (Nov 2-3, 2026) — Proposal Submission
- Problem analysis ✅
- Solution design ✅
- Technical architecture ✅
- Feasibility assessment ✅
- Team plan ✅
- **Output**: PDF proposal

### Round 2 (Development) — Working Application
- All MVP features functional ✅
- Gemini integration working ✅
- Local persistence ✅
- Responsive UI ✅

### Round 3 (Final) — Polished Demo
- Complete documentation ✅
- Bug fixes ✅
- Performance optimized ✅
- Demo ready ✅