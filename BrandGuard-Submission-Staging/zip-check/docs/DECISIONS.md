# Architectural Decision Records (ADRs)

## ThroneCaptures — Key Technical Decisions

---

## 1. Decision Log

| ID | Date | Title | Status |
|----|------|-------|--------|
| ADR-001 | 2026-10-28 | Client-only Architecture (No Backend) | Accepted |
| ADR-002 | 2026-10-28 | IndexedDB for Local Persistence | Accepted |
| ADR-003 | 2026-10-29 | Google Gemini 1.5 Flash for AI Reviews | Accepted |
| ADR-004 | 2026-10-29 | Structured Output via responseSchema | Accepted |
| ADR-005 | 2026-10-30 | CSS Custom Properties Design System | Accepted |
| ADR-006 | 2026-10-30 | React Context for Global State | Accepted |
| ADR-007 | 2026-10-31 | Three.js Ambient Background | Accepted |
| ADR-008 | 2026-10-31 | Vite + React + TypeScript Stack | Accepted |
| ADR-009 | 2026-11-01 | Lucide React for Icons | Accepted |
| ADR-010 | 2026-11-01 | Framer Motion for Animations | Accepted |

---

## 2. Detailed Records

### ADR-001: Client-only Architecture (No Backend)

**Date**: 2026-10-28  
**Status**: Accepted  
**Deciders**: Kislay Choubey, Aman Sapra  

#### Context
Hackathon requires a working application within tight timeline. Building a backend adds infrastructure complexity (hosting, database, auth, scaling).

#### Decision
Build a fully client-side React application with:
- All data stored in browser IndexedDB
- AI processing via direct Gemini API calls from client
- No authentication (single-user MVP)
- Deploy to Vercel static hosting

#### Consequences
**Positive**:
- Zero backend infrastructure cost
- Instant deployment
- No server maintenance
- Works offline for data viewing

**Negative**:
- API key visible in browser DevTools (mitigated: user enters own key)
- No multi-user collaboration
- No centralized data backup
- Rate limiting handled client-side only

#### Mitigation
- Document API key limitation prominently
- Provide "Test Connection" before saving
- Support per-session key override
- Plan backend proxy for post-hackathon

---

### ADR-002: IndexedDB for Local Persistence

**Date**: 2026-10-28  
**Status**: Accepted  
**Deciders**: Kislay Choubey  

#### Context
Need persistent local storage for guidelines, submissions, reviews, and settings. localStorage has 5MB limit and synchronous API.

#### Decision
Use IndexedDB via `idb` wrapper library:
- Schema versioning for migrations
- Async API, no blocking
- Large storage quota (hundreds of MB)
- Structured data with indexes

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| localStorage | 5MB limit, synchronous, string-only |
| Dexie.js | Larger bundle, overkill for simple schema |
| OPFS (File System Access) | Requires user permission, complex |
| Cookies | 4KB limit, sent with every request |

#### Consequences
**Positive**:
- Handles all MVP data volumes easily
- Fast queries with indexes
- Survives browser restarts
- Works in all modern browsers

**Negative**:
- Slightly more complex API
- Not accessible in Private/Incognito (some browsers)
- No built-in sync

---

### ADR-003: Google Gemini 1.5 Flash for AI Reviews

**Date**: 2026-10-29  
**Status**: Accepted  
**Deciders**: Kislay Choubey  

#### Context
Need fast, cost-effective AI for content review against brand guidelines. Must support structured JSON output.

#### Decision
Use Google Gemini 1.5 Flash via `@google/generative-ai` SDK:
- Free tier: 15 RPM, 1M tokens/day
- 1M token context window
- Native structured output (responseSchema)
- Low latency (~2-5s typical)

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| OpenAI GPT-4o | Higher cost, no free tier for hackathon |
| OpenAI GPT-3.5 Turbo | No structured output, higher hallucination |
| Anthropic Claude | No direct browser SDK, proxy needed |
| Local LLMs (Ollama) | Requires user setup, inconsistent quality |

#### Consequences
**Positive**:
- Free tier sufficient for hackathon
- Structured output eliminates parsing errors
- Fast enough for interactive use
- Simple SDK integration

**Negative**:
- Vendor lock-in to Google
- Rate limits may affect demo
- API key management complexity

---

### ADR-004: Structured Output via responseSchema

**Date**: 2026-10-29  
**Status**: Accepted  
**Deciders**: Kislay Choubey  

#### Context
AI responses must be reliably parsed into TypeScript types for findings display. Free-form JSON parsing is error-prone.

#### Decision
Use Gemini's `generationConfig.responseSchema` to enforce JSON schema:
- Schema defined in TypeScript, converted to Gemini format
- Validates: findings array, score (0-100), summary string
- Handles: severity enum, location bounds, required fields

#### Consequences
**Positive**:
- Zero parsing failures in production
- Type-safe response handling
- Self-documenting expected format
- Reduces prompt engineering for format

**Negative**:
- Schema must match exactly (strict)
- Limited to supported JSON Schema subset
- Adds ~200 tokens to prompt

---

### ADR-005: CSS Custom Properties Design System

**Date**: 2026-10-30  
**Status**: Accepted  
**Deciders**: Aman Sapra  

#### Context
Need consistent, themeable design system supporting light/dark modes with minimal bundle size.

#### Decision
Build design system using CSS Custom Properties (CSS Variables):
- 60+ design tokens in `:root`
- Dark mode via `[data-theme="dark"]` override
- System preference via `@media (prefers-color-scheme: dark)`
- No CSS-in-JS, no Tailwind (bundle size)

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| Tailwind CSS | Adds ~30KB, learning curve, purges needed |
| Styled Components | Runtime overhead, SSR complexity |
| Emotion | Similar to styled-components |
| CSS Modules | No theming, manual dark mode |

#### Consequences
**Positive**:
- Zero runtime cost
- Native browser theming
- Easy to extend/customize
- Works with any component library
- ~2KB gzipped for entire design system

**Negative**:
- No built-in utilities (margin, padding classes)
- Manual utility classes needed
- IE11 not supported (not required)

---

### ADR-006: React Context for Global State

**Date**: 2026-10-30  
**Status**: Accepted  
**Deciders**: Kislay Choubey, Aman Sapra  

#### Context
Need global state for guidelines, submissions, reviews, settings across 6 pages. Must sync with IndexedDB.

#### Decision
Use two React Contexts:
- **AppContext**: All business data + CRUD actions (guidelines, submissions, reviews, findings, settings)
- **ThemeContext**: Theme state + persistence

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| Redux Toolkit | Boilerplate, overkill for client-only |
| Zustand | Extra dependency, Context sufficient |
| Jotai | Atomic model not needed |
| React Query | No server state, local only |

#### Consequences
**Positive**:
- Zero dependencies for state
- Colocated with persistence logic
- Easy to test (pure functions)
- Familiar React patterns

**Negative**:
- Re-renders all consumers on any change
- No middleware/devtools
- Manual optimization needed (useMemo, split contexts)

#### Mitigation
- Split contexts (App vs Theme)
- Memoize context values
- Use `React.memo` on consumers

---

### ADR-007: Three.js Ambient Background

**Date**: 2026-10-31  
**Status**: Accepted  
**Deciders**: Aman Sapra  

#### Context
Hackathon brief mentions "subtle 3D/ambient elements" for premium SaaS feel. Must not distract from content.

#### Decision
Add `@react-three/fiber` + `@react-three/drei` for animated background:
- Subtle floating geometric shapes
- Respects `prefers-reduced-motion`
- Low opacity, slow animation
- Pauses when tab hidden

#### Consequences
**Positive**:
- Premium visual differentiation
- ~50KB gzipped (acceptable)
- React-native integration
- Accessible (respects reduced motion)

**Negative**:
- Bundle size increase
- GPU usage on low-end devices
- Potential distraction if too prominent

#### Mitigation
- Default opacity very low (0.03)
- Disable on mobile if performance issues
- `prefers-reduced-motion` hides entirely

---

### ADR-008: Vite + React + TypeScript Stack

**Date**: 2026-10-28  
**Status**: Accepted  
**Deciders**: Kislay Choubey  

#### Context
Standard modern React stack for fast development and production builds.

#### Decision
- **Vite 5**: Fast HMR, optimized builds
- **React 18**: Concurrent features, strict mode
- **TypeScript 5**: Strict mode, latest features
- **ESLint + Prettier**: Code quality

#### Consequences
**Positive**:
- Industry standard
- Excellent DX
- Fast builds
- Tree-shaking

**Negative**:
- Build config complexity
- TypeScript strict mode learning curve

---

### ADR-009: Lucide React for Icons

**Date**: 2026-11-01  
**Status**: Accepted  
**Deciders**: Aman Sapra  

#### Context
Need consistent, accessible icon system with tree-shaking.

#### Decision
Use `lucide-react`:
- 1000+ icons, MIT licensed
- Tree-shakeable (only used icons in bundle)
- React components (not font)
- Consistent 24x24 design

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| React Icons (multiple libs) | Inconsistent styles, larger |
| Heroicons | Fewer icons, Tailwind-focused |
| FontAwesome | Font-based, Pro features locked |
| Custom SVG | Maintenance burden |

---

### ADR-010: Framer Motion for Animations

**Date**: 2026-11-01  
**Status**: Accepted  
**Deciders**: Aman Sapra  

#### Context
Need smooth, accessible animations for modals, toasts, page transitions.

#### Decision
Use Framer Motion:
- Declarative API
- Layout animations
- Exit animations (AnimatePresence)
- Respects `prefers-reduced-motion`

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|
| CSS Animations | Complex for exit animations |
| React Transition Group | Lower-level, more boilerplate |
| Tailwind Animate | Requires Tailwind |

---

## 3. Deferred Decisions (Post-MVP)

| ID | Topic | Decision Needed |
|----|-------|-----------------|
| DEF-001 | Backend Architecture | Node/Go/Python, Database, Auth |
| DEF-002 | Real-time Sync | WebSockets, Server-Sent Events, Firebase |
| DEF-003 | Multi-tenancy | Schema isolation, Row-level security |
| DEF-004 | Custom Models | Fine-tuning pipeline, Model registry |
| DEF-005 | Plugin System | Guideline extensions, Custom rules |

---

## 4. Decision Template

For future decisions, use:

```markdown
### ADR-XXX: [Title]

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Rejected | Superseded  
**Deciders**: [Names]

#### Context
[What problem are we solving?]

#### Decision
[What did we decide?]

#### Alternatives Considered
| Option | Rejected Because |
|--------|------------------|

#### Consequences
**Positive**:
- 

**Negative**:
- 

#### Mitigation
[How to handle negatives]
```

---

## 5. Gate Facts

- This file supersedes: Nothing (new documentation file)
- Linked from: ARCHITECTURE.md, ROADMAP.md
- User instruction: "Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with 'I'll continue' or similar. Pick up the last task as if the break never happened."