# ThroneCaptures — CodeNexus Hackathon Round 1 Proposal

**Team**: Kislay Choubey (Lead Architect / AI Engineer), Aman Sapra (Product Manager / UI/UX Designer / Frontend Developer)  
**Submission Window**: November 2–3, 2026  
**Track**: AI-Powered SaaS / Developer Tools

---

## 1. Problem Understanding (25%)

### 1.1 The Problem

Content teams at growing companies face a critical but overlooked challenge: **brand consistency at scale**.

> **Current Reality**: A marketing team of 10 people produces 50+ pieces of content weekly — blog posts, landing pages, emails, social posts, documentation. Brand guidelines exist as a 20-page PDF in Notion/Drive. Review happens manually in Google Docs comments. Inconsistencies slip through: wrong terminology ("user" vs "customer"), tone drift (formal → casual), accessibility violations (missing alt text), legal risks (unapproved claims).

> **Impact**: 
> - 40% of content requires rework after "final" review
> - Brand trust erodes from inconsistent voice
> - Compliance violations risk legal exposure
> - Senior editors become bottlenecks

### 1.2 Why This Matters Now

| Trend | Impact |
|-------|--------|
| Content velocity increasing | Manual review doesn't scale |
| Distributed teams | No shared review context |
| AI content generation | More content, same reviewers |
| Regulatory scrutiny | Legal/compliance non-negotiable |

### 1.3 Existing Solutions Fall Short

| Solution | Gap |
|----------|-----|
| Style guides (PDF/Notion) | Not enforceable, not searchable |
| Grammarly/Writer | Generic rules, not brand-specific |
| CMS workflows | Only for published content, not drafts |
| Custom scripts | Brittle, no AI understanding |

---

## 2. Solution Overview (25%)

### 2.1 ThroneCaptures in One Sentence

**Centralized brand guidelines + AI-powered content review with human-in-the-loop approval — review content in seconds, not hours.**

### 2.2 Core Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   DEFINE    │────▶│  SUBMIT     │────▶│   REVIEW    │────▶│  APPROVE    │
│ Guidelines  │     │  Content    │     │  (AI +      │     │  (Human)    │
└─────────────┘     └─────────────┘     │   Human)    │     └─────────────┘
                                         └─────────────┘
```

### 2.3 Key Differentiators

1. **Guidelines as Code** — Structured, versioned, machine-readable rules with examples
2. **AI That Explains** — Every finding includes: location, severity, explanation, correction, rule reference
3. **Human Gate** — AI never auto-publishes; human approves/rejects each finding
4. **Local-First Privacy** — All data in browser IndexedDB; only content sent to Gemini
5. **Premium SaaS UX** — Responsive, accessible, animated, with subtle 3D ambient background

### 2.4 User Value

| Role | Before | After |
|------|--------|-------|
| **Content Creator** | Write → Wait 2 days → Fix 10 comments | Write → Submit → Fix 3 AI findings in 5 min |
| **Editor** | Read 50 docs → Leave 200 comments | Review AI findings → Approve in 10 min |
| **Brand Manager** | Hope guidelines followed | Dashboard: compliance scores, trend lines |
| **Legal/Compliance** | Manual spot-checks | Every piece reviewed against legal rules |

---

## 3. Technical Plan (25%)

### 3.1 Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)                      │
├────────────────────────────────────────────────────────────────┤
│  AppContext  │  ThemeContext  │  StorageService (IndexedDB)   │
├────────────────────────────────────────────────────────────────┤
│  Pages: Dashboard │ Guidelines │ Submit │ Reviews │ History │ Settings  │
├────────────────────────────────────────────────────────────────┤
│  GeminiService → Google Gemini 1.5 Flash API (Structured JSON) │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Vite 5 + React 18 + TS 5 | Fast HMR, strict types, modern |
| **State** | React Context (2 contexts) | Zero deps, colocated with persistence |
| **Storage** | IndexedDB via `idb` | Large quota, async, indexed queries |
| **AI** | Gemini 1.5 Flash + `responseSchema` | Free tier, 1M context, structured output |
| **Styling** | CSS Custom Properties | 60+ tokens, zero runtime, native theming |
| **3D** | Three.js + R3F + Drei | Subtle ambient, respects reduced motion |
| **Animation** | Framer Motion | Declarative, accessible, exit animations |
| **Icons** | Lucide React | Tree-shakeable, consistent, MIT |
| **Deploy** | Vercel | Static hosting, edge network, free tier |

### 3.3 Data Models

```typescript
// Core entities (simplified)
Guideline: { id, name, category, description, rules[], isActive }
Rule: { id, title, description, severity, examples: { correct, incorrect } }
Submission: { id, title, content, contentType, guidelineIds[], status }
Review: { id, submissionId, guidelineIds[], findings[], score, status }
Finding: { id, reviewId, guidelineId, ruleId, severity, location, explanation, correction, status }
Settings: { geminiApiKey, theme }
```

### 3.4 AI Integration Details

**Prompt Engineering**:
- Dynamic prompt includes ALL selected guidelines + rules + examples
- Instructs: "Review content against each rule. Return findings with exact character locations."
- Uses `generationConfig.responseSchema` for guaranteed JSON structure

**Output Schema**:
```json
{
  "findings": [
    {
      "guidelineId": "uuid",
      "ruleId": "uuid", 
      "severity": "high|medium|low|info",
      "location": { "start": 145, "end": 162 },
      "explanation": "Why this violates the rule",
      "correction": "Suggested fix",
      "reference": "Rule title"
    }
  ],
  "overallScore": 0-100,
  "summary": "High-level review summary"
}
```

**Validation**: Post-processing clamps scores, validates enums, bounds-checks locations.

### 3.5 Implementation Phases (Complete)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Foundation | 2 days | Vite, TS, Design System, Routing, Contexts, Storage |
| 2. Core Features | 3 days | Guidelines CRUD, Submission, Gemini Integration |
| 3. Workflow | 2 days | Findings UI, Accept/Reject, Approval, History |
| 4. Polish | 1 day | Dashboard, Settings, Responsive, 3D Background |
| 5. QA | 1 day | Typecheck, Lint, Build, Cross-browser, Accessibility |

**Status**: All phases complete. Demo ready.

---

## 4. Originality (12.5%)

### 4.1 What's Novel

| Innovation | Description |
|------------|-------------|
| **Guidelines as Executable Specs** | Rules with examples become AI evaluation criteria — not static docs |
| **Location-Aware Findings** | AI returns character offsets; UI highlights exact problematic text |
| **Human-in-the-Loop by Default** | No "auto-approve" — every finding requires explicit human decision |
| **Local-First Architecture** | Zero backend; user owns data; API key never leaves their browser |
| **Premium SaaS in Browser** | 3D ambient background, micro-animations, full accessibility — in a hackathon MVP |

### 4.2 Not Just Another Wrapper

- Not a thin UI over ChatGPT — structured prompt engineering with schema enforcement
- Not a CMS plugin — standalone tool for any content workflow
- Not a linter — understands semantics, not just patterns

---

## 5. Feasibility (12.5%)

### 5.1 Technical Feasibility — ✅ Proven

| Component | Status | Evidence |
|-----------|--------|----------|
| Vite + React + TS | ✅ Working | `npm run build` passes |
| IndexedDB Persistence | ✅ Working | 5 entity types, CRUD complete |
| Gemini Integration | ✅ Working | Structured output validated |
| UI Components | ✅ Working | 25+ primitives, all pages |
| Responsive Design | ✅ Working | 4 breakpoints tested |
| Three.js Background | ✅ Working | 60fps, respects reduced motion |
| TypeScript Strict | ✅ Passing | 0 errors |
| ESLint | ✅ Passing | 0 warnings |
| Production Build | ✅ Working | ~145KB gzipped |

### 5.2 Resource Feasibility

| Resource | Cost | Status |
|----------|------|--------|
| **Development Time** | ~164 hours (2 people) | Complete |
| **Gemini API** | ~$5-10 (hackathon) | Free tier sufficient |
| **Hosting (Vercel)** | Free | Configured |
| **Dependencies** | All MIT/Apache | No license risk |

### 5.3 Risk Mitigation

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Gemini API quota exceeded | Medium | Test with small content; cache results |
| Demo environment failure | Medium | Record backup video; test multi-browser |
| Last-minute bugs | Medium | Feature freeze 24h before demo |
| API key visibility in client | High (known) | Documented; user enters own key; recommend restrictions |

### 5.4 Timeline Compliance

- **Round 1 Proposal**: Ready for Nov 2-3 submission ✅
- **Round 2 Development**: Complete ✅  
- **Round 3 Demo**: In final preparation 🔄

---

## 6. Team Plan (Bonus)

### 6.1 Roles

| Member | Primary | Secondary |
|--------|---------|-----------|
| **Kislay Choubey** | Architecture, AI/Backend, Testing | PRD, TRD, Documentation |
| **Aman Sapra** | Product, UI/UX, Frontend | User Flow, Features, Accessibility |

### 6.2 Collaboration

- Daily 15-min sync (9:30 AM IST)
- Pair programming for integrations
- PR reviews < 2 hours
- Shared decision log (DECISIONS.md)

### 6.3 Success Metrics

- 100% MVP features delivered
- Zero critical bugs at demo
- Documentation 100% complete
- Demo rehearsal > 4.5/5

---

## 7. Appendix: Documentation Index

All documentation available in `/docs`:

| File | Purpose |
|------|---------|
| PRD.md | Full product requirements |
| TRD.md | Technical specifications |
| ARCHITECTURE.md | C4 diagrams, data flow |
| UI-UX.md | Design system, components |
| USER-FLOW.md | User journeys, edge cases |
| FEATURES.md | Feature inventory matrix |
| IMPLEMENTATION-PLAN.md | Phased build plan |
| TESTING.md | Test cases, results |
| SECURITY.md | Threat model, privacy |
| ROADMAP.md | Round-wise timeline |
| TEAM-PLAN.md | RACI, workflow |
| PROJECT-STATUS.md | Progress tracker |
| SETUP.md | Developer setup guide |
| DECISIONS.md | Architectural decision records |
| ROUND1-PROPOSAL.md | This document |

---

## 8. Appendix: Demo Script (3 Minutes)

| Time | Action | Narrative |
|------|--------|-----------|
| 0:00 | Open app, show Dashboard | "ThroneCaptures — brand consistency at AI speed" |
| 0:20 | Settings → Enter API key → Test | "Your key, your browser, your data" |
| 0:40 | Guidelines → Create "Brand Voice" | "Guidelines as code, not PDFs" |
| 1:10 | Submit → Paste marketing copy | "Any content type, any guidelines" |
| 1:30 | Click "Review with AI" | "Gemini 1.5 Flash, structured output" |
| 2:00 | Reviews → Show findings | "Location-aware, explained, correctable" |
| 2:30 | Accept All → Approve | "Human gate, auditor trail" |
| 2:50 | History → Show timeline | "Complete audit trail" |

---

**End of Proposal**

*ThroneCaptures — Because your brand deserves better than a PDF in Drive.*

---

**Gate Facts:**
- This file supersedes: Nothing (new proposal document for hackathon submission)
- Linked from: ROADMAP.md, README.md, PROJECT-STATUS.md
- User instruction: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."