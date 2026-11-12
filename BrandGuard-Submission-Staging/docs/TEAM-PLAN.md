# Team Plan

## ThroneCaptures — Roles & Responsibilities

---

## 1. Team Composition

| Member | Role | Primary Focus | Secondary Focus |
|--------|------|---------------|-----------------|
| **Kislay Choubey** | Lead Architect / AI Engineer / Backend Services | Architecture, Gemini integration, Storage, Testing | PRD, TRD, Documentation |
| **Aman Sapra** | Product Manager / UI/UX Designer / Frontend Developer | Design system, Components, Pages, Accessibility | USER-FLOW, UI-UX, FEATURES |

---

## 2. Responsibility Matrix (RACI)

| Task | Kislay | Aman |
|------|--------|------|
| **Project Setup** | | |
| Vite + React + TS config | R/A | C |
| ESLint/TypeScript/Prettier | R/A | C |
| Git, CI/CD config | R/A | I |
| **Design System** | | |
| Color palette, typography | C | R/A |
| Spacing, shadows, radii | C | R/A |
| Component library design | C | R/A |
| Dark/Light theme | R/A | R/A |
| **Architecture** | | |
| System architecture | R/A | C |
| Data models | R/A | C |
| API integration design | R/A | I |
| **State Management** | | |
| AppContext (global state) | R/A | C |
| ThemeContext | C | R/A |
| Storage Service (IndexedDB) | R/A | I |
| **AI Integration** | | |
| Gemini Service | R/A | I |
| Prompt engineering | R/A | C |
| Structured output schema | R/A | I |
| Error handling | R/A | C |
| **UI Components** | | |
| Button, Card, Input, Modal | C | R/A |
| Badge, Toast, Toaster | C | R/A |
| Form components (Select, Textarea) | C | R/A |
| **Layout** | | |
| Sidebar (collapsible, mobile) | C | R/A |
| Header (search, notifications, user) | C | R/A |
| MainLayout + ThreeBackground | R/A | C |
| **Pages** | | |
| Dashboard | C | R/A |
| Guidelines (CRUD, modals) | R/A | R/A |
| Submit (submission, review trigger) | R/A | R/A |
| Reviews (findings, approval) | R/A | R/A |
| History (timeline, filters) | C | R/A |
| Settings (API, theme, data) | R/A | C |
| **Documentation** | | |
| PRD, TRD, ARCHITECTURE | R/A | C |
| UI-UX, USER-FLOW, FEATURES | C | R/A |
| TESTING, SECURITY, ROADMAP | R/A | C |
| TEAM-PLAN, PROJECT-STATUS, SETUP | R/A | R/A |
| README, DECISIONS, Proposal | R/A | R/A |
| **Quality Assurance** | | |
| TypeScript strict mode | R/A | C |
| ESLint configuration | R/A | C |
| Unit tests (Vitest) | R/A | C |
| Manual E2E testing | R/A | R/A |
| Accessibility audit | C | R/A |
| Cross-browser testing | C | R/A |
| Performance optimization | R/A | C |
| **Hackathon Delivery** | | |
| Round 1 PDF proposal | R/A | C |
| Demo script | C | R/A |
| Live demo rehearsal | R/A | R/A |
| Final submission | R/A | R/A |

**Legend**: R = Responsible, A = Accountable, C = Consulted, I = Informed

---

## 3. Daily Workflow

### 3.1 Morning Sync (15 min)
- **When**: 9:30 AM IST daily
- **Format**: Standup
- **Agenda**: 
  1. What did you complete yesterday?
  2. What will you tackle today?
  3. Any blockers needing help?

### 3.2 Work Sessions
- **Deep Work Blocks**: 2-3 hours uninterrupted
- **Pair Programming**: For complex integration (Gemini + Context, Modal + Forms)
- **Code Reviews**: Every feature before merge

### 3.3 End of Day
- Commit working code
- Update PROJECT-STATUS.md
- Note blockers for next day

---

## 4. Communication Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| **In-person/Call** | Deep discussion, architecture decisions | Immediate |
| **GitHub Issues** | Bug tracking, feature requests | Within 4 hours |
| **GitHub PRs** | Code review, knowledge sharing | Within 2 hours |
| **Shared Notes** | Decisions, context, research | Async |

---

## 5. Decision Making

| Decision Type | Process |
|---------------|---------|
| **Technical Architecture** | Kislay proposes, Aman reviews, consensus |
| **UI/UX Design** | Aman proposes, Kislay reviews, consensus |
| **Feature Scope** | Both evaluate against MVP, timebox |
| **Trade-offs** | Document in DECISIONS.md, move on |

### 5.1 Escalation
1. Discuss directly (15 min timebox)
2. Document pros/cons in DECISIONS.md
3. If stuck: flip a coin / defer to hackathon constraints
4. No decision blocks progress for > 1 hour

---

## 6. Skill Development Goals

### 6.1 Kislay
- [ ] Advanced Gemini prompt engineering
- [ ] IndexedDB performance optimization
- [ ] Three.js / React Three Fiber
- [ ] Technical writing for hackathon proposals

### 6.2 Aman
- [ ] Advanced CSS (container queries, cascade layers)
- [ ] Framer Motion complex animations
- [ ] Accessibility testing (axe-core, screen readers)
- [ ] Design system documentation

---

## 7. Time Allocation (Estimated Hours)

| Phase | Kislay | Aman | Total |
|-------|--------|------|-------|
| **Setup & Foundation** | 12 | 16 | 28 |
| **Core Features** | 20 | 24 | 44 |
| **Workflow & Polish** | 16 | 12 | 28 |
| **Documentation** | 12 | 16 | 28 |
| **Testing & QA** | 8 | 8 | 16 |
| **Demo Prep** | 4 | 8 | 12 |
| **Buffer** | 4 | 4 | 8 |
| **Total** | **76** | **88** | **164** |

---

## 8. Pairing Schedule

| Feature | Pairing Session | Duration |
|---------|-----------------|----------|
| AppContext + Storage Integration | Both | 2 hrs |
| Gemini Service + AppContext | Both | 3 hrs |
| Guideline Modal + Validation | Both | 2 hrs |
| Submit Modal + Review Trigger | Both | 2 hrs |
| Review Detail Modal + Findings | Both | 3 hrs |
| Theme Context + CSS Variables | Both | 1 hr |
| Mobile Responsive Testing | Both | 2 hrs |
| Accessibility Audit | Both | 2 hrs |

---

## 9. Conflict Resolution

| Situation | Resolution |
|-----------|------------|
| Disagreement on approach | Timebox 30 min discussion, document, pick one |
| Scope creep | Refer to MVP definition in PRD, defer to post-hackathon |
| Technical debt | Mark in DECISIONS.md, fix if time permits |
| Burnout | Mandatory break, reduce scope, focus on done |

---

## 10. Success Metrics for Team

| Metric | Target |
|--------|--------|
| Features delivered on time | 100% MVP |
| Code review turnaround | < 2 hours |
| Zero critical bugs at demo | 0 |
| Documentation completeness | 100% |
| Demo rehearsal score | > 4.5/5 |
| Hackathon submission | On time |

---

## 11. Retrospective Template (Post-Hackathon)

| Question | Kislay | Aman |
|----------|--------|------|
| What went well? | | |
| What was challenging? | | |
| What would we do differently? | | |
| Best collaboration moment? | | |
| Skill to improve next time? | | |