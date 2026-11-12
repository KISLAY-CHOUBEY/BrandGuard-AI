# Product Requirements Document (PRD)

## ThroneCaptures — AI-Powered Content Review & Brand Consistency Platform

---

## 1. Problem Statement

Organizations struggle to maintain brand consistency across all content touchpoints. Content creators, marketers, and legal teams face challenges:

- **Inconsistent brand voice** — Different writers interpret guidelines differently
- **Manual review bottlenecks** — Human reviewers cannot scale with content volume
- **Terminology drift** — Product names, legal terms, and brand-specific language evolve without centralized control
- **Accessibility gaps** — Content often fails WCAG guidelines without automated checks
- **No audit trail** — Difficult to track what was reviewed, by whom, and what changes were made
- **Delayed approvals** — Content sits in review queues waiting for human approval

**Source**: Original problem statement from CodeNexus Hackathon (Google Doc inaccessible — verified 2026-11-02)

---

## 2. Target Users

| User Persona | Role | Primary Needs |
|-------------|------|---------------|
| **Content Creator** | Marketing, Blog, Social Media | Quick feedback on brand compliance before publishing |
| **Brand Manager** | Brand Strategy | Centralized guideline management, consistency oversight |
| **Legal/Compliance** | Legal Review | Automated legal terminology checking, audit trails |
| **Editor/Reviewer** | Content Approval | Efficient review workflow, clear findings, approve/reject |
| **Developer** | Documentation | Technical terminology consistency, API doc compliance |

---

## 3. Core Requirements

### 3.1 Brand Guidelines Management
- **FR-01**: Create, edit, view, delete brand guidelines
- **FR-02**: Organize guidelines by category (Tone, Terminology, Accessibility, Formatting, Brand Voice, Legal, Custom)
- **FR-03**: Define rules with title, description, severity (low/medium/high/critical), examples (correct/incorrect)
- **FR-04**: Toggle guideline active/inactive status
- **FR-05**: Regex pattern support for automated checking (future)

### 3.2 Content Submission
- **FR-06**: Submit content with title, body, content type (text/markdown/HTML)
- **FR-07**: Select one or more active guidelines for review
- **FR-08**: Draft state before submitting for review
- **FR-09**: Auto-save drafts locally

### 3.3 AI-Powered Review (Gemini)
- **FR-10**: Submit content to Gemini 1.5 Flash for analysis against selected guidelines
- **FR-11**: Structured output with findings: severity, location, explanation, suggested correction, guideline reference
- **FR-12**: Overall compliance score (0-100)
- **FR-13**: Review summary
- **FR-14**: Error handling for API failures, rate limits, invalid responses

### 3.4 Findings & Corrections
- **FR-15**: Display findings with severity badges, location context, explanation, suggested correction
- **FR-16**: Accept/reject individual findings
- **FR-17**: Accept all findings bulk action
- **FR-18**: Track finding status (pending/accepted/rejected)
- **FR-19**: Link findings to specific guideline rules

### 3.5 Review Workflow
- **FR-20**: Status states: Draft → In Review → Changes Requested → Approved
- **FR-21**: Human approval required — AI never auto-publishes
- **FR-22**: Request changes with reviewer comments
- **FR-23**: Approve with auditor attribution
- **FR-24**: Timestamp all transitions

### 3.6 History & Audit
- **FR-25**: Complete review history with filters (date, status, type)
- **FR-26**: View submission content and review findings retrospectively
- **FR-27**: Export history (future)

### 3.7 Settings & Persistence
- **FR-28**: Gemini API key configuration (stored locally in IndexedDB)
- **FR-29**: Theme preference (light/dark/system)
- **FR-30**: Local data persistence via IndexedDB
- **FR-31**: Clear all data option

---

## 4. MVP Scope

### Must Have (MVP)
- ✅ Brand guidelines CRUD with categories and rules
- ✅ Content submission with guideline selection
- ✅ Gemini AI review with structured findings
- ✅ Findings display with accept/reject workflow
- ✅ Review status workflow (Draft → In Review → Changes Requested → Approved)
- ✅ Human approval required
- ✅ History view with filters
- ✅ Local persistence (IndexedDB)
- ✅ Settings with API key and theme
- ✅ Responsive UI (desktop, tablet, mobile)
- ✅ Premium SaaS design system

### Should Have (Post-MVP)
- 🔄 Regex pattern support in rules
- 🔄 Team collaboration (multi-user)
- 🔄 Export to PDF/CSV
- 🔄 Webhook notifications
- 🔄 Custom guideline templates

### Could Have (Future)
- 🔮 Version control for guidelines
- 🔮 Content templates
- 🔮 Integration with CMS
- 🔮 Advanced analytics dashboard

---

## 5. User Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-01 | As a Brand Manager, I want to create guidelines so that content follows brand standards | Guideline created with name, category, rules; appears in list; can be selected for review |
| US-02 | As a Content Creator, I want to submit content for review so that I get feedback before publishing | Content submitted with selected guidelines; status changes to "In Review"; AI review runs |
| US-03 | As an Editor, I want to see AI findings with explanations so that I can make informed decisions | Findings show severity, location, explanation, correction, guideline reference; accept/reject buttons work |
| US-04 | As a Reviewer, I want to approve or request changes so that content workflow progresses | Status changes correctly; timestamps recorded; auditor attributed |
| US-05 | As a Team Lead, I want to view history so that I can audit past reviews | History shows all submissions/reviews with filters; detail view works |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 2s; AI review < 10s for typical content (<5000 chars) |
| **Security** | API key stored locally only; no backend; HTTPS in production |
| **Privacy** | Content never leaves browser except to Gemini API; no tracking |
| **Accessibility** | WCAG 2.1 AA compliant; keyboard navigation; screen reader support |
| **Browser Support** | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| **Offline** | Core UI works offline; review requires connection |

---

## 7. Success Metrics

- **Time to first review**: < 30 seconds from submit to AI findings
- **Review accuracy**: > 90% of AI findings relevant (user acceptance rate)
- **Workflow completion**: > 80% of submissions reach "Approved" or "Changes Requested"
- **User satisfaction**: > 4.5/5 in post-hackathon survey

---

## 8. Constraints & Assumptions

- **No backend** — Vite frontend only; IndexedDB for persistence
- **Gemini API key** — User-provided; browser-visible (documented limitation)
- **Single-user** — No auth/multi-tenancy in MVP
- **Hackathon timeline** — Round 1: Proposal (Nov 2-3); Round 2: Development; Round 3: Polish

---

## 9. Out of Scope

- User authentication/accounts
- Team workspaces
- Real-time collaboration
- Content publishing/CMS integration
- Advanced analytics
- Mobile app (responsive web only)