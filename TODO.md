# BrandGuard AI - Round 3 Implementation TODO

## Phase 1: Project Audit - COMPLETE
- [x] Inspected folder structure, architecture, routing, state management
- [x] Reviewed all pages, components, services, AI integration
- [x] Verified Git status (clean except .gitignore mod + staging folder)
- [x] TypeScript typecheck: PASS
- [x] Production build: PASS
- [x] Tests: 47 pass, 13 fail (gemini tests mock outdated @google/generative-ai vs @google/genai)

## Phase 2: Evidence-Grounded AI Review
- [ ] Improve Gemini prompt for better evidence-grounding
- [ ] Add finding validation to verify guideline references exist
- [ ] Distinguish confirmed violations vs unverified claims
- [ ] Fix FindingCard context highlighting bug
- [ ] Add finding deduplication logic

## Phase 3: Human Approval Workflow
- [ ] Add "Edit Suggestion" capability to FindingCard
- [ ] Track revised draft content separately from original
- [ ] Show original vs revised comparison view
- [ ] Improve review status transitions (draft → in_review → changes_requested → approved)
- [ ] Add overall approval validation (all findings must be resolved)

## Phase 4: Revision History & Audit Trail
- [ ] Add ReviewEvent type for audit trail
- [ ] Store events in IndexedDB (new object store)
- [ ] Record: review_created, ai_review_completed, suggestion_accepted, suggestion_rejected, suggestion_edited, comment_added, draft_updated, review_approved, review_rejected
- [ ] Add History/Events tab to ReviewDetailModal
- [ ] Display events chronologically with details

## Phase 5: Governance Insights Dashboard
- [ ] Add new page: Governance/Insights
- [ ] Calculate metrics from actual stored data
- [ ] Show: total reviews, findings by severity, top violation categories, acceptance rate, pending reviews, activity over time
- [ ] Handle empty states gracefully

## Phase 6: Data Persistence & Reliability
- [ ] Ensure all new data persists to IndexedDB
- [ ] Add migration logic for existing data
- [ ] Handle malformed/missing data gracefully

## Phase 7: UI/UX Quality
- [ ] Improve FindingCard visual design
- [ ] Add clear severity indicators
- [ ] Improve empty/loading/error states
- [ ] Ensure responsive design works

## Phase 8: Testing & Verification
- [ ] Fix failing gemini tests (update mocks for @google/genai)
- [ ] Add tests for new features
- [ ] Run typecheck and build
- [ ] Manual E2E testing of workflow

## Known Issues to Fix
- [ ] gemini.test.ts mocks @google/generative-ai but code uses @google/genai
- [ ] FindingCard context highlighting logic is buggy
- [ ] No edit capability for suggestions
- [ ] No revision history / audit trail
- [ ] No governance insights dashboard
