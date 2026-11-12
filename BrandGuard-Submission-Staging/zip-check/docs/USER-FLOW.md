# User Flow Documentation

## ThroneCaptures — Complete User Journeys

---

## 1. Primary User Flows

### 1.1 First-Time User Onboarding

```
User visits app
    │
    ▼
┌─────────────────────┐
│  Dashboard (empty)  │
│  - Stats all zero   │
│  - CTA: Create      │
│    Guideline        │
│  - CTA: Submit      │
│    Content          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Settings → API Key  │
│ Enter Gemini API    │
│ Test Connection     │
│ Save                │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Guidelines → Create │
│ Add Brand Guideline │
│ - Name, Category    │
│ - Rules with        │
│   examples          │
│ Save                │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Submit → New        │
│ Submission          │
│ - Title, Content    │
│ - Select Guidelines │
│ Submit for Review   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Review → AI runs    │
│ View Findings       │
│ Accept/Reject       │
│ Approve or Request  │
│ Changes             │
└─────────────────────┘
```

### 1.2 Core Workflow: Guidelines → Content → Review → Approve

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. CREATE GUIDELINES
   ┌──────────────────────────────────────────────────────────┐
   │ User navigates to /guidelines                            │
   │ Clicks "Create Guideline"                                │
   │ Fills: Name, Category, Description                       │
   │ Adds Rules: Title, Description, Severity, Examples       │
   │ Saves → Guideline appears in list (Active)               │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
2. SUBMIT CONTENT
   ┌──────────────────────────────────────────────────────────┐
   │ User navigates to /submit                                │
   │ Clicks "New Submission"                                  │
   │ Fills: Title, Content (paste/type), Content Type         │
   │ Selects: One or more active guidelines                   │
   │ Submits → Status: "Draft" → "In Review"                  │
   │ AI Review triggers automatically                         │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
3. AI REVIEW (Gemini)
   ┌──────────────────────────────────────────────────────────┐
   │ System builds prompt with content + selected guidelines  │
   │ Sends to Gemini 1.5 Flash with structured output schema  │
   │ Receives: Findings[], OverallScore, Summary              │
   │ Creates Finding records in IndexedDB                     │
   │ Updates Review: findings, score, status                  │
   │ Updates Submission: status → "changes_requested"         │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
4. HUMAN REVIEW FINDINGS
   ┌──────────────────────────────────────────────────────────┐
   │ User navigates to /reviews                               │
   │ Clicks review → ReviewDetailModal opens                  │
   │ Tabs: Findings | Content | Guidelines                    │
   │ For each finding:                                        │
   │   - Reads explanation & suggested correction             │
   │   - Views location context in content                    │
   │   - Clicks "Accept" or "Reject"                          │
   │   - Or clicks "Accept All" for bulk action               │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
5. APPROVE OR REQUEST CHANGES
   ┌──────────────────────────────────────────────────────────┐
   │ If all findings accepted → Click "Approve"               │
   │   → Status: "Approved"                                   │
   │   → Auditor recorded, timestamp saved                    │
   │   → Submission status: "Approved"                        │
   │                                                           │
   │ If changes needed → Click "Request Changes"              │
   │   → Status: "Changes Requested"                          │
   │   → Content creator notified (future)                    │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
6. HISTORY & AUDIT
   ┌──────────────────────────────────────────────────────────┐
   │ User navigates to /history                               │
   │ Sees unified timeline of submissions & reviews           │
   │ Filters: Search, Status, Date Range                      │
   │ Clicks item → Detail modal with full context             │
   └──────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Screen Flows

### 2.1 Dashboard Flow

```
Dashboard (/)
├── Stats Overview (4 cards)
│   ├── Total Guidelines → Links to /guidelines
│   ├── Content Submitted → Links to /submit
│   ├── Reviews Completed → Links to /reviews
│   └── Pending Approvals → Links to /reviews (filtered)
├── Quick Actions (5 buttons)
│   ├── Submit New Content → /submit (opens modal)
│   ├── Create Guideline → /guidelines (opens modal)
│   ├── View All Reviews → /reviews
│   ├── Review History → /history
│   └── Configure Settings → /settings
├── Pending Reviews Section
│   ├── List of reviews with status badges
│   ├── Click "Review" → /reviews/:id (modal)
│   └── Click row → /reviews/:id (modal)
└── Recent Activity Feed
    ├── Mixed submissions & reviews
    ├── Timestamps with relative time
    └── Status indicators
```

### 2.2 Guidelines Management Flow

```
Guidelines (/guidelines)
├── Header: Title + "Create Guideline" button
├── Search & Filter Bar
│   ├── Search input (name, description)
│   └── Category dropdown (All, Tone, Terminology, etc.)
├── Guidelines Grid (responsive)
│   ├── GuidelineCard per guideline
│   │   ├── Category icon + name
│   │   ├── Active/Inactive badge
│   │   ├── Description (truncated)
│   │   ├── Rule count + high severity count
│   │   └── Actions: Edit, Toggle, Delete
│   └── Empty state with CTA
└── Modals
    ├── Create Guideline Modal
    │   ├── Name, Category, Description
    │   ├── Dynamic Rules List
    │   │   ├── Title, Severity, Description
    │   │   ├── Correct Examples (textarea, one per line)
    │   │   └── Incorrect Examples (textarea, one per line)
    │   ├── Add Rule / Remove Rule buttons
    │   └── Save → Creates guideline, closes modal
    ├── Edit Guideline Modal (pre-filled)
    └── Delete Confirmation Dialog
```

### 2.3 Content Submission Flow

```
Submit (/submit)
├── Header: Title + "New Submission" button
├── Active Guidelines Warning (if none)
├── Submissions List
│   ├── SubmissionCard per submission
│   │   ├── Title + Status Badge
│   │   ├── Content Type, Character Count, Age
│   │   ├── Applied Guidelines (badges, +N more)
│   │   └── Actions: View, Review (if draft)
│   └── Empty State with CTA
└── Modals
    ├── Submit Modal
    │   ├── Title (required)
    │   ├── Content Type (Text/Markdown/HTML)
    │   ├── Content Textarea (required)
    │   ├── Guidelines Selection (checkboxes with preview)
    │   └── Submit → Creates submission, triggers review
    └── View Submission Modal
        ├── Title, Status, Type, Guidelines
        └── Full Content (read-only, scrollable)
```

### 2.4 Review Detail Flow

```
Review Detail (/reviews/:id) - Modal
├── Header
│   ├── Submission Title
│   ├── Status Badge + Score Badge + Findings Count
│   └── Actions: Request Changes, Approve (if changes_requested)
├── Tabs
│   ├── Findings Tab
│   │   ├── "Accept All" button (if pending findings)
│   │   ├── FindingCard per finding
│   │   │   ├── Severity Badge + Guideline Badge + Rule Badge
│   │   │   ├── Status Badge (Pending/Accepted/Rejected)
│   │   │   ├── Explanation
│   │   │   ├── Location Context (highlighted)
│   │   │   ├── Suggested Correction (green box)
│   │   │   ├── Guideline Reference
│   │   │   └── Actions: Accept / Reject (if pending)
│   │   └── Empty State (no findings = perfect score)
│   ├── Content Tab
│   │   └── Full Content (monospace, read-only, scrollable)
│   └── Guidelines Tab
│       └── Card per applied guideline with rules
└── Footer: Close button
```

### 2.5 History Flow

```
History (/history)
├── Header: Title + Export Button
├── Stats Overview (4 cards)
├── Filters Bar
│   ├── Search (title/content)
│   ├── Status Dropdown
│   └── Date Range Dropdown
├── Unified Timeline
│   ├── HistoryRow per item (submission or review)
│   │   ├── Type Icon (FileText vs ClipboardCheck)
│   │   ├── Title
│   │   ├── Status Badge
│   │   ├── Date + Relative Time
│   │   ├── Score Badge (reviews only)
│   │   └── View Button
│   └── Empty State
└── Detail Modal
    ├── Submission Detail: Content preview, guidelines, metadata
    └── Review Detail: Findings summary, score, guidelines, metadata
```

### 2.6 Settings Flow

```
Settings (/settings)
├── API Configuration Section
│   ├── API Key Input (password/text toggle)
│   ├── Save Button
│   ├── Test Connection Button
│   ├── Test Result Toast
│   └── Security Notice (expandable)
├── Appearance Section
│   ├── Theme Cards: Light, Dark, System
│   │   ├── Icon, Label, Description
│   │   └── Selected state with accent border
├── Data Management Section
│   ├── Clear All Data Button (danger variant)
│   ├── Confirmation Dialog
│   └── Storage Stats (placeholder)
└── About Section
    ├── Version, Team, Event, Round Info
```

---

## 3. Edge Cases & Alternative Flows

### 3.1 No API Key Configured
```
User clicks "Review" on submission
    │
    ▼
┌─────────────────────┐
│  Check: API Key?    │
│  No → Toast Error   │
│  "Configure API    │
│  key in Settings"   │
│  Redirect to       │
│  /settings          │
└─────────────────────┘
```

### 3.2 No Active Guidelines Selected
```
User tries to submit content
    │
    ▼
┌─────────────────────┐
│  Validation:        │
│  At least 1 active  │
│  guideline required │
│  Submit button      │
│  disabled           │
│  Warning banner     │
│  shown              │
└─────────────────────┘
```

### 3.3 AI Review Fails
```
Gemini API error
    │
    ▼
┌─────────────────────┐
│  Catch error        │
│  Update Review      │
│  status:            │
│  "changes_requested"│
│  (with 0 findings)  │
│  Toast: "Review     │
│  failed: [message]" │
│  User can retry     │
└─────────────────────┘
```

### 3.4 All Findings Accepted → Auto-Approve Option
```
User clicks "Accept All"
    │
    ▼
┌─────────────────────┐
│  All findings       │
│  status → "accepted"│
│  Review status      │
│  → "approved"       │
│  (optional: prompt  │
│  to approve)        │
└─────────────────────┘
```

### 3.5 Mobile Responsive Behavior
```
Viewport < 768px
    │
    ▼
┌─────────────────────┐
│  Sidebar → Hamburger│
│  Menu overlay       │
│  Search hidden in   │
│  Header             │
│  Cards stack 1-col  │
│  Modals full-screen │
│  Tables → Cards     │
└─────────────────────┘
```

---

## 4. State Transitions

### 4.1 Submission Status

```
DRAFT ──submit──▶ IN_REVIEW ──AI complete──▶ CHANGES_REQUESTED
                                                              │
                                              approve ◀───────┘
                                                │
                                                ▼
                                           APPROVED
```

### 4.2 Review Status

```
DRAFT ──start review──▶ IN_REVIEW ──AI complete──▶ CHANGES_REQUESTED
                                                              │
                                              approve ◀───────┘
                                                │
                                                ▼
                                           APPROVED
```

### 4.3 Finding Status

```
PENDING ──accept──▶ ACCEPTED
   │
   └──reject──▶ REJECTED
```

---

## 5. Notification Triggers

| Event | Notification | Channel |
|-------|--------------|---------|
| AI Review Complete | "Review ready for [Title]" | Toast + Badge on Reviews nav |
| Review Approved | "[Title] approved" | Toast |
| Changes Requested | "Changes requested for [Title]" | Toast |
| API Key Saved | "API key saved successfully" | Toast |
| API Key Test Passed | "Connection successful" | Toast |
| API Key Test Failed | "Failed: [error]" | Toast |
| Data Cleared | "All data cleared" | Toast |
| Guideline Created | "[Name] created" | Toast |
| Guideline Deleted | "[Name] deleted" | Toast |

---

## 6. Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl + K` | Focus Search | Global |
| `Cmd/Ctrl + N` | New Submission | Global |
| `Cmd/Ctrl + G` | New Guideline | Global |
| `Escape` | Close Modal | Modal Open |
| `Tab` | Next Focusable | Global |
| `Shift + Tab` | Previous Focusable | Global |
| `Enter` | Submit Form | Form Focus |
| `Arrow Keys` | Navigate Dropdown | Dropdown Open |