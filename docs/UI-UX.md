# UI/UX Design System

## ThroneCaptures — Visual Design Specification

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Clarity First** | Content hierarchy over decoration; generous whitespace |
| **Consistent Rhythm** | 4px baseline grid; consistent spacing scale |
| **Purposeful Motion** | Animations guide attention; respect `prefers-reduced-motion` |
| **Accessible by Default** | WCAG 2.1 AA; semantic HTML; focus management |
| **Premium Feel** | Subtle gradients, depth, refined typography |

---

## 2. Color System

### 2.1 Semantic Colors (CSS Variables)

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #0f0f1a;      /* Page background */
  --color-bg-secondary: #1a1a2e;    /* Cards, panels */
  --color-bg-tertiary: #24243e;     /* Inputs, hover states */
  --color-bg-hover: #2d2d4a;        /* Interactive hover */
  --color-bg-active: #363658;       /* Active/pressed */
  
  /* Text */
  --color-text-primary: #f8f8fc;    /* Headings, primary text */
  --color-text-secondary: #b8b8d0;  /* Body text */
  --color-text-muted: #7a7a9a;      /* Placeholders, secondary info */
  --color-text-inverse: #0f0f1a;    /* On accent backgrounds */
  
  /* Accent (Brand Gold) */
  --color-accent-primary: #f5c542;  /* Primary actions */
  --color-accent-secondary: #ffd966;/* Gradient end */
  --color-accent-muted: #e6b83d;    /* Hover states */
  
  /* Semantic Status */
  --color-success: #10b981;
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-warning: #f59e0b;
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-error: #ef4444;
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-info: #3b82f6;
  --color-info-bg: rgba(59, 130, 246, 0.1);
  
  /* Borders */
  --color-border: #2d2d4a;
  --color-border-light: #3a3a5a;
  --color-border-focus: #f5c542;
}
```

### 2.2 Light Mode Override
```css
[data-theme="light"] {
  --color-bg-primary: #fafafa;
  --color-bg-secondary: #ffffff;
  --color-bg-tertiary: #f4f4f6;
  --color-bg-hover: #eaeaea;
  --color-bg-active: #e0e0e0;
  
  --color-text-primary: #1a1a2e;
  --color-text-secondary: #5a5a7a;
  --color-text-muted: #9a9ab8;
  --color-text-inverse: #f8f8fc;
  
  --color-border: #e0e0ea;
  --color-border-light: #eaeaee;
  --color-border-focus: #e6b83d;
  
  --color-success-bg: rgba(16, 185, 129, 0.1);
  --color-warning-bg: rgba(245, 158, 11, 0.1);
  --color-error-bg: rgba(239, 68, 68, 0.1);
  --color-info-bg: rgba(59, 130, 246, 0.1);
}
```

### 2.3 Gradients
```css
--gradient-primary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
--gradient-accent: linear-gradient(135deg, #f5c542 0%, #ffd966 100%);
--gradient-card: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
--gradient-glow: radial-gradient(ellipse at center, rgba(245, 197, 66, 0.15) 0%, transparent 70%);
```

---

## 3. Typography

### 3.1 Font Families
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-display: 'Space Grotesk', 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### 3.2 Type Scale
| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | 0.7rem (11.2px) | 1.4 | 400 | Captions, labels |
| `--text-sm` | 0.8125rem (13px) | 1.5 | 400 | Secondary text |
| `--text-base` | 0.9375rem (15px) | 1.6 | 400 | Body text |
| `--text-lg` | 1.0625rem (17px) | 1.5 | 500 | Large body |
| `--text-xl` | 1.25rem (20px) | 1.4 | 600 | H5, card titles |
| `--text-2xl` | 1.5rem (24px) | 1.3 | 700 | H4, section headers |
| `--text-3xl` | 1.875rem (30px) | 1.2 | 700 | H3, page titles |
| `--text-4xl` | 2.5rem (40px) | 1.1 | 700 | H1, hero |

### 3.3 Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 4. Spacing System

```css
--space-1: 4px;    /* 0.25rem */
--space-2: 8px;    /* 0.5rem */
--space-3: 12px;   /* 0.75rem */
--space-4: 16px;   /* 1rem */
--space-5: 20px;   /* 1.25rem */
--space-6: 24px;   /* 1.5rem */
--space-8: 32px;   /* 2rem */
--space-10: 40px;  /* 2.5rem */
--space-12: 48px;  /* 3rem */
--space-16: 64px;  /* 4rem */
```

### Layout Constants
```css
--header-height: 64px;
--sidebar-width: 260px;
--sidebar-collapsed: 72px;
--content-max: 1280px;
```

---

## 5. Border Radius

```css
--radius-sm: 6px;    /* Buttons, inputs */
--radius-md: 10px;   /* Cards, modals */
--radius-lg: 16px;   /* Large cards */
--radius-xl: 24px;   /* Hero sections */
--radius-full: 9999px; /* Badges, pills */
```

---

## 6. Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.5);
--shadow-glow: 0 0 30px rgba(245, 197, 66, 0.2);
--shadow-inner: inset 0 2px 4px rgba(0, 0, 0, 0.2);
```

---

## 7. Component Specifications

### 7.1 Buttons

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | Gradient (accent) | Inverse | None | Main CTAs |
| Secondary | bg-tertiary | Primary | border | Secondary actions |
| Outline | Transparent | Accent | 2px accent | Alternative CTAs |
| Ghost | Transparent | Secondary | None | Subtle actions |
| Danger | error-bg | Error | Error | Destructive |

| Size | Padding | Font Size | Gap |
|------|---------|-----------|-----|
| sm | 8px 12px | 13px | 6px |
| md | 16px 24px | 15px | 8px |
| lg | 24px 32px | 17px | 10px |

**States**: hover (shadow/color shift), active (scale 0.98), focus (ring), disabled (opacity 0.5), loading (spinner)

### 7.2 Cards

| Variant | Background | Border | Shadow | Usage |
|---------|------------|--------|--------|-------|
| Default | gradient-card | border | None | Standard content |
| Elevated | gradient-card | border | shadow-lg | Emphasized content |
| Outlined | Transparent | 2px border-light | None | Subtle containers |

**Padding**: none / sm (16px) / md (24px) / lg (32px)

### 7.3 Form Inputs

```
Base: bg-secondary, border, rounded-lg, px-4 py-2.5
Focus: ring-2 ring-border-focus, border-transparent
Error: border-error, error message below
Disabled: opacity-50, cursor-not-allowed
```

### 7.4 Badges

| Variant | Background | Text | Border | Dot Icon |
|---------|------------|------|--------|----------|
| Default | bg-tertiary | Secondary | border | — |
| Success | success-bg | Success | Success/30% | Check |
| Warning | warning-bg | Warning | Warning/30% | AlertTriangle |
| Error | error-bg | Error | Error/30% | AlertCircle |
| Info | info-bg | Info | Info/30% | Info |
| Accent | Gradient | Inverse | None | — |

### 7.5 Modals

- Backdrop: `bg-black/60 backdrop-blur-sm`
- Container: `bg-gradient-card border border-border rounded-xl shadow-xl max-h-[90vh]`
- Animation: `scaleIn` (150ms), fadeIn (200ms)
- Focus trap required

---

## 8. Layout Structure

### 8.1 Desktop (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (260px) │ Header (64px)                             │
│                 ├──────────────────────────────────────────┤
│                 │ Main Content (max 1280px, centered)       │
│                 │                                           │
│                 │                                           │
└─────────────────┴───────────────────────────────────────────┘
```

### 8.2 Tablet (768px–1023px)
- Sidebar collapsible to 72px (icons only)
- Header full width minus sidebar
- Content padding: 24px

### 8.3 Mobile (<768px)
- Sidebar: slide-in overlay (260px), hamburger menu
- Header: compact, search hidden
- Content: full width, padding 16px
- Cards stack single column
- Modals: full screen on mobile

---

## 9. Animation & Motion

### 9.1 Timing
```css
--transition-fast: 150ms ease;    /* Micro-interactions */
--transition-base: 250ms ease;    /* Standard transitions */
--transition-slow: 400ms ease;    /* Complex animations */
```

### 9.2 Keyframes
```css
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
```

### 9.3 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. 3D Background (Three.js)

### 10.1 Specification
- **Canvas**: Fixed, full-screen, `z-index: -10`, `pointer-events: none`
- **Scene**: Subtle floating geometric shapes + grid floor + particles
- **Colors**: Accent gold (`#f5c542`) with low opacity (0.15)
- **Animation**: Auto-rotate (0.2 speed), gentle floating
- **Performance**: Respects `prefers-reduced-motion`; disabled on low-end devices
- **Fallback**: CSS radial gradient glow (`--gradient-glow`)

### 10.2 Geometry
- 8 floating shapes (box, sphere, octahedron, torus)
- Orbital positions, random rotation/scale
- Glass-like material: transmission 0.3, roughness 0.4
- 50 ambient particles

---

## 11. Accessibility Checklist

- [ ] Semantic HTML5 elements (header, nav, main, section, article, aside, footer)
- [ ] Heading hierarchy (h1 → h2 → h3)
- [ ] Focus visible on all interactive elements
- [ ] Focus trap in modals
- [ ] ARIA labels on icon-only buttons
- [ ] ARIA live regions for toasts
- [ ] Color contrast ≥ 4.5:1 (AA)
- [ ] Keyboard navigation for all features
- [ ] Screen reader tested (NVDA, VoiceOver)
- [ ] `prefers-reduced-motion` respected
- [ ] Form labels associated with inputs
- [ ] Error messages linked via `aria-describedby`

---

## 12. Icon System

- **Library**: Lucide React (consistent stroke weight 2)
- **Sizes**: 16px (inline), 20px (UI), 24px (primary), 32px (feature)
- **Color**: Inherit `currentColor` for theme adaptation

---

## 13. Responsive Breakpoints

```css
/* Mobile First */
/* sm: 640px */
/* md: 768px */
/* lg: 1024px */
/* xl: 1280px */
/* 2xl: 1536px */
```

---

## 14. Design Tokens Export

All tokens defined in `src/styles/globals.css` as CSS custom properties for runtime theming and zero-runtime cost.