# Technical Requirements Document (TRD)

## ThroneCaptures — Architecture & Technical Specifications

---

## 1. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vite** | 5.0+ | Build tool, dev server |
| **React** | 18.2+ | UI framework |
| **TypeScript** | 5.3+ | Type safety |
| **React Router** | 6.21+ | Client-side routing |
| **CSS Variables** | Native | Design system, theming |

### AI Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| **@google/generative-ai** | 0.12+ | Gemini API client |
| **Gemini 1.5 Flash** | Latest | Content review model |

### UI Libraries
| Technology | Version | Purpose |
|------------|---------|---------|
| **Lucide React** | 0.303+ | Icons |
| **Framer Motion** | 10.17+ | Animations |
| **Three.js** | 0.160+ | 3D background |
| **@react-three/fiber** | 8.15+ | React Three.js renderer |
| **@react-three/drei** | 9.92+ | Three.js helpers |

### Validation & Storage
| Technology | Version | Purpose |
|------------|---------|---------|
| **Zod** | 3.22+ | Schema validation |
| **idb** | 8.0+ | IndexedDB wrapper |

### Development
| Technology | Version | Purpose |
|------------|---------|---------|
| **ESLint** | 8.56+ | Linting |
| **TypeScript ESLint** | 6.15+ | TS linting |
| **Vitest** | 1.1+ | Unit testing |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   React UI   │  │  App Context │  │  Theme Context   │   │
│  │  (Components)│◄─┤  (State Mgmt)│  │  (Theme State)   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                     │            │
│         ▼                 ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Services Layer                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Gemini Service│  │ Storage Service│ │  Utils     │  │   │
│  │  │ (AI Review)   │  │ (IndexedDB)   │  │  (Dates)   │  │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                 │                     │            │
│         ▼                 ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  External APIs                          │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │          Google Gemini API (REST)                 │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                                 │   │
│         ▼                                                 ▼   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Local Storage                          │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │          IndexedDB (thronecaptures-db)            │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### 3.1 Guideline Creation Flow
```
User Input → Validation (Zod) → AppContext.createGuideline()
    → Storage.saveGuideline() → IndexedDB
    → AppContext state update → UI re-render
```

### 3.2 Content Submission Flow
```
User Input → Validation → AppContext.createSubmission()
    → Storage.saveSubmission() → IndexedDB
    → UI shows in submissions list
```

### 3.3 AI Review Flow
```
User clicks "Review" → AppContext.startReview(submissionId)
    → Fetch submission + selected guidelines
    → Update status to "in_review"
    → Create Review record in IndexedDB
    → Call GeminiService.reviewContent()
        → Build prompt with content + guidelines
        → Send to Gemini API (structured output)
        → Parse & validate response
    → Create Finding records in IndexedDB
    → Update Review with findings + score
    → Update Submission status
    → UI re-renders with results
```

### 3.4 Approval Flow
```
User clicks "Approve" → AppContext.approveReview(reviewId)
    → Update Review status to "approved"
    → Update Submission status to "approved"
    → Record auditor + timestamp
    → Persist to IndexedDB
    → UI updates
```

---

## 4. Database Schema (IndexedDB)

### Stores
```typescript
// Guidelines
{ id, name, description, category, rules[], createdAt, updatedAt, isActive }

// Submissions  
{ id, title, content, contentType, selectedGuidelineIds[], status, submittedAt, updatedAt, reviewId? }

// Reviews
{ id, submissionId, guidelineIds[], findings[], overallScore, status, createdAt, updatedAt, completedAt?, approvedBy?, approvedAt? }

// Findings
{ id, reviewId, guidelineId, ruleId, severity, location{start,end,context}, explanation, suggestedCorrection, guidelineReference, status, createdAt, resolvedAt? }

// Settings
{ id: "user-settings", geminiApiKey, defaultGuidelineIds[], autoSave, theme }
```

### Indexes
- Guidelines: by-category, by-active
- Submissions: by-status, by-date
- Reviews: by-submission, by-status, by-date
- Findings: by-review, by-guideline, by-status

---

## 5. Gemini API Integration

### Model Configuration
```typescript
model: 'gemini-1.5-flash'
temperature: 0.1        // Low for consistent structured output
topP: 0.8
topK: 40
maxOutputTokens: 8192
responseMimeType: 'application/json'
responseSchema: REVIEW_SCHEMA  // Enforced JSON structure
```

### Prompt Engineering
- System role: Expert content reviewer for brand consistency
- Input: Content + formatted guidelines with rules & examples
- Output: Structured JSON with findings array, score, summary
- Validation: Post-process to ensure schema compliance

### Error Handling
- Network errors → User-facing error message
- Parse errors → Retry once, then show error
- Rate limits → Exponential backoff (future)
- Invalid API key → Clear error directing to settings

---

## 6. Security Considerations

### API Key Management
- **Stored in IndexedDB** — Encrypted at rest by browser
- **Never logged** — No console output of keys
- **User-controlled** — Clearable via Settings > Clear All Data
- **Browser-visible** — VITE_ prefix means accessible in DevTools (documented limitation)

### Content Privacy
- Content sent **only to Gemini API** (Google)
- No telemetry, analytics, or third-party tracking
- No backend = no server-side data collection
- HTTPS enforced in production (Vercel)

### CSP Headers (Production)
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src fonts.gstatic.com;
  connect-src 'self' generativelanguage.googleapis.com;
  img-src 'self' data:;
```

---

## 7. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 2s | LCP on 3G |
| Time to Interactive | < 3s | TTI |
| AI Review Latency | < 10s | 5000 char content |
| Bundle Size (gzipped) | < 200KB | JS + CSS |
| Memory Usage | < 50MB | Heap snapshot |

### Optimizations
- Code splitting by route (React.lazy)
- Three.js background lazy-loaded, respects `prefers-reduced-motion`
- IndexedDB async operations
- Memoized context selectors
- CSS variables for instant theme switching

---

## 8. Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 100+ | Full support |
| Firefox | 100+ | Full support |
| Safari | 15+ | IndexedDB full support |
| Edge | 100+ | Full support |

### Required APIs
- IndexedDB (idb wrapper)
- Fetch API
- CSS Custom Properties
- ES2020 (optional chaining, nullish coalescing)

---

## 9. Deployment

### Build Command
```bash
npm run build  # tsc + vite build → dist/
```

### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Environment Variables
- `VITE_GEMINI_API_KEY` — Optional default (user can override in Settings)

---

## 10. Monitoring & Observability (Future)

- Error boundary with reporting
- Performance marks for AI review latency
- User action analytics (privacy-respecting)
- API error rate tracking