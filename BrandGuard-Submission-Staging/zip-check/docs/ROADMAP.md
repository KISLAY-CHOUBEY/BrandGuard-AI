# Roadmap

## ThroneCaptures — Round-wise Development Plan

---

## 1. Hackathon Timeline Overview

| Round | Period | Focus | Deliverable |
|-------|--------|-------|-------------|
| **Round 1** | Nov 2–3, 2026 | Proposal | PDF submission |
| **Round 2** | Development | Build | Working application |
| **Round 3** | Final Polish | Demo | Production-ready demo |

---

## 2. Round 1: Proposal Submission (Nov 2–3, 2026)

### 2.1 Submission Window
- **Opens**: 2 November 2026, 10:00 AM IST
- **Closes**: 3 November 2026, 6:00 PM IST
- **Format**: PDF proposal document

### 2.2 Required Proposal Content
| Section | Status | Source Document |
|---------|--------|-----------------|
| Problem Understanding | ✅ Complete | PRD.md §1 |
| Solution Overview | ✅ Complete | PRD.md §3, ARCHITECTURE.md |
| Technical Plan | ✅ Complete | TRD.md, IMPLEMENTATION-PLAN.md |
| Originality | ✅ Complete | PRD.md, FEATURES.md |
| Feasibility | ✅ Complete | TRD.md §7, SECURITY.md |
| Team Plan | ✅ Complete | TEAM-PLAN.md |
| Architecture Diagrams | ✅ Complete | ARCHITECTURE.md §7 |

### 2.3 Round 1 Deliverables
- [x] Problem statement analysis
- [x] Solution design with user flows
- [x] Technical architecture (C4 diagrams)
- [x] Implementation plan with phases
- [x] Risk assessment & mitigation
- [x] Team responsibility matrix
- [x] PDF generated from markdown

---

## 3. Round 2: Application Development

### 3.1 Phase 1: Foundation (Complete)
- [x] Vite + React + TypeScript setup
- [x] Design system (CSS variables, themes)
- [x] Routing, contexts, services
- [x] UI primitives (Button, Card, Input, Modal, etc.)
- [x] Layout (Sidebar, Header, ThreeBackground)
- [x] IndexedDB persistence layer

### 3.2 Phase 2: Core Features (Complete)
- [x] Guidelines CRUD with categories & rules
- [x] Content submission with multi-guideline selection
- [x] Gemini AI review integration
- [x] Findings display with accept/reject
- [x] Review workflow (Draft → In Review → Changes Requested → Approved)

### 3.3 Phase 3: Workflow & Polish (Complete)
- [x] Approval workflow with auditor tracking
- [x] History timeline with filters
- [x] Settings (API key, theme, data management)
- [x] Dashboard with stats & quick actions
- [x] Responsive design (mobile, tablet, desktop)

### 3.4 Phase 4: Quality Assurance (In Progress)
- [x] TypeScript strict mode passes
- [x] ESLint passes
- [x] Production build succeeds
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Bug fixes

---

## 4. Round 3: Final Polish & Demo

### 4.1 Documentation Completion
- [x] PRD.md
- [x] TRD.md
- [x] UI-UX.md
- [x] ARCHITECTURE.md
- [x] IMPLEMENTATION-PLAN.md
- [x] USER-FLOW.md
- [x] FEATURES.md
- [x] TESTING.md
- [x] SECURITY.md
- [x] ROADMAP.md (this file)
- [x] TEAM-PLAN.md
- [x] PROJECT-STATUS.md
- [x] SETUP.md
- [x] DECISIONS.md
- [x] README.md
- [x] Round 1 Proposal PDF content

### 4.2 Demo Preparation
- [x] Demo script (3-minute walkthrough)
- [x] Sample guidelines for demo
- [x] Sample content for live review
- [x] Screenshots for presentation slides
- [x] Backup video recording
- [x] Live demo rehearsal

### 4.3 Final Quality Gate
- [x] All lint/typecheck pass
- [x] Build output verified
- [x] No console errors
- [x] Responsive on all breakpoints
- [x] Keyboard accessible
- [x] Theme switching works
- [x] API key flow works end-to-end

---

## 5. Post-Hackathon Roadmap (Future)

### 5.1 Q1 2027: Collaboration Foundation
| Feature | Effort | Dependencies |
|---------|--------|--------------|
| User Authentication | High | Backend or Auth0/Clerk |
| Team Workspaces | High | Auth + DB |
| Role-based Access | Medium | Teams |
| Real-time Sync | High | WebSockets/Firebase |

### 5.2 Q2 2027: Enhanced AI & Content
| Feature | Effort | Dependencies |
|---------|--------|--------------|
| Regex Pattern Support | Medium | Guidelines v2 |
| Auto-fix Application | High | Content editable |
| Batch Review | Medium | Queue system |
| Content Templates | Medium | Schema design |

### 5.3 Q3 2027: Analytics & Integrations
| Feature | Effort | Dependencies |
|---------|--------|--------------|
| Compliance Dashboard | Medium | Event tracking |
| PDF/CSV Export | Low | Report generation |
| CMS Connectors | High | Partner APIs |
| Webhook Notifications | Medium | Backend |

### 5.4 Q4 2027: Enterprise Features
| Feature | Effort | Dependencies |
|---------|--------|--------------|
| SSO (SAML/OIDC) | High | Auth provider |
| Audit Logging | Medium | Immutable store |
| Custom Models | High | ML infrastructure |
| On-premise Option | Very High | Docker/K8s |

---

## 6. Milestone Tracking

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Project Initialization | Oct 28, 2026 | ✅ Complete |
| Design System Complete | Oct 30, 2026 | ✅ Complete |
| Core Features Complete | Nov 1, 2026 | ✅ Complete |
| Workflow Complete | Nov 2, 2026 | ✅ Complete |
| Round 1 Proposal Ready | Nov 2, 2026 10:00 AM | ✅ Ready |
| Round 1 Submission | Nov 2-3, 2026 | ✅ Ready |
| All Documentation Complete | Nov 3, 2026 | ✅ Complete |
| Demo Ready | Nov 4, 2026 | ✅ Complete |
| Hackathon Submission | Nov 4, 2026 | ✅ Ready |

---

## 7. Risk Register

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Gemini API quota exceeded | Medium | High | Test with small content, cache results | Kislay |
| PDF generation fails | Low | High | Use browser print-to-PDF as backup | Aman |
| Demo environment issues | Medium | High | Record backup video, test on multiple browsers | Both |
| Last-minute bugs | Medium | Medium | Freeze features 24h before demo, only bug fixes | Both |
| Team availability | Low | High | Pair programming, shared context | Both |

---

## 8. Success Criteria by Round

### Round 1 Success
- [ ] PDF submitted within window
- [ ] All judging criteria addressed (25% each: Problem, Solution, Technical, Originality, Feasibility)
- [ ] Clear problem-solution fit
- [ ] Realistic technical plan

### Round 2 Success
- [ ] All MVP features functional
- [ ] Gemini integration working reliably
- [ ] Data persists correctly
- [ ] Responsive on all devices

### Round 3 Success
- [ ] Live demo works without errors
- [ ] Documentation complete and accurate
- [ ] Presentation tells compelling story
- [ ] Q&A preparation complete

---

## 9. Resource Allocation

| Resource | Round 1 | Round 2 | Round 3 |
|----------|---------|---------|---------|
| **Kislay** | Architecture, PRD, TRD, Backend services | Gemini integration, Storage, Testing | Demo script, Video, Q&A prep |
| **Aman** | UI/UX, Design System, Frontend components | Guidelines, Submit, Review UI, Dashboard | Documentation, Accessibility, Polish |
| **Shared** | Planning, Reviews, Integration | E2E testing, Bug fixes | Final rehearsal, Submission |

---

## 10. Communication Plan

| Cadence | Format | Participants | Purpose |
|---------|--------|--------------|---------|
| Daily | 15-min sync | Both | Progress, blockers, next steps |
| Per Feature | PR/Review | Both | Code quality, knowledge sharing |
| Milestone | Retro | Both | Reflect, adjust plan |
| Pre-submission | Dry run | Both | Final validation |

---

## 11. Budget & Tools

| Tool | Cost | Purpose |
|------|------|---------|
| Vercel (Hosting) | Free tier | Production deployment |
| GitHub (Repo) | Free | Version control, issues |
| Gemini API | Pay-per-use | AI reviews (~$0.001/request) |
| Fonts (Google Fonts) | Free | Inter, Space Grotesk |
| Icons (Lucide) | Free | MIT licensed |
| Three.js | Free | MIT licensed |

**Estimated API Cost**: ~$5-10 for hackathon duration (500-1000 reviews)