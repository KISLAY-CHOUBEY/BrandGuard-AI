# Security & Privacy Documentation

## ThroneCaptures — Security Model & Privacy

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THRONE CAPTURES SECURITY MODEL                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   CLIENT    │     │   BROWSER   │     │  SERVERLESS      │     │   EXTERNAL  │
│  (REACT)    │────▶│  STORAGE    │     │  FUNCTION        │────▶│   SERVICES  │
└─────────────┘     └─────────────┘     │  (/api/gemini)   │     │  (GEMINI)   │
       │                   │             └──────────────────┘     └─────────────┘
       ▼                   ▼                   │                   │
┌─────────────────────────────────────────────────────────────────┐
│  • Serverless backend (Vercel Functions) for Gemini API proxy  │
│  • No authentication (single-user MVP)                         │
│  • API key stored in Vercel Environment Variables (server-only)│
│  • Content sent ONLY to /api/gemini → Gemini API               │
│  • No telemetry, analytics, or tracking                        │
│  • HTTPS enforced in production                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow & Privacy

### 2.1 Data Classification

| Data Type | Storage | Transmission | Retention |
|-----------|---------|--------------|-----------|
| **Brand Guidelines** | IndexedDB (local) | Never | Until user deletes |
| **Content Submissions** | IndexedDB (local) | To `/api/gemini` → Gemini API | Until user deletes |
| **Review Findings** | IndexedDB (local) | Never | Until user deletes |
| **Gemini API Key** | **Vercel Environment Variable (server-only)** | **Never** (server-side only) | Until admin rotates |
| **Theme Preference** | localStorage | Never | Until user clears |

### 2.2 What Leaves the Browser

**Only**: Content submitted for review → `/api/gemini` (serverless) → Google Gemini API

**Never**:
- Data sent to external servers (except via `/api/gemini` proxy)
- Data sent to third parties (except Gemini via proxy)
- Analytics or tracking events
- API keys in logs or error reports
- **API keys to the client** (server-side only)

---

## 3. API Key Security

### 3.1 Storage
- **Location**: Vercel Environment Variables (`GEMINI_API_KEY`) — **server-side only**
- **Encryption**: Managed by Vercel/Google Cloud infrastructure
- **Access**: Only the `/api/gemini` serverless function reads the key; never exposed to client

### 3.2 Transmission
- **Path**: `/api/gemini` (Vercel serverless function) → `generativelanguage.googleapis.com`
- **Client Header**: `Content-Type: application/json` (no API key sent from client)
- **Server Header**: `x-goog-api-key: GEMINI_API_KEY` (server-side only, from Vercel env var)
- **Protocol**: HTTPS only (enforced by Vercel and Gemini API)
- **Scope**: Client only calls `/api/gemini` on same origin

### 3.3 User Controls
- **Test Connection**: Settings page "Test Connection" button calls `/api/gemini?action=test` (validates server configuration)
- **Configure**: Set `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables (admin only)
- **Rotate**: Update `GEMINI_API_KEY` in Vercel, redeploy (no client changes needed)
- **No client-side key management**: The frontend has no API key input, save, or delete functionality

### 3.4 Server-Side Proxy (IMPLEMENTED)
> **✅ RESOLVED**: The API key is no longer exposed to the client. All Gemini API calls are proxied through a Vercel serverless function (`/api/gemini.ts`).
>
> **Architecture**:
> - Client calls `POST /api/gemini` with `{ action: "review", content, guidelines }` or `{ action: "test" }`
> - Serverless function reads `GEMINI_API_KEY` from Vercel environment variables
> - Server calls Google Gemini API with the key
> - Server returns structured response to client
> - API key never leaves the server, never in browser DevTools, never in client bundle
>
> **Benefits**:
> - Eliminates client-side API key exposure (primary threat vector)
> - Enables server-side rate limiting, logging, and monitoring
> - Allows API key rotation without client redeployment
> - Supports structured output schemas (Zod) for response validation

---

## 4. Content Security

### 4.1 Content Handling
- Content **never logged** to console
- Content **never stored** in localStorage (only IndexedDB)
- Content **only transmitted** to `/api/gemini` (serverless proxy) → Gemini API during review
- No content caching in service workers (none configured)

### 4.2 Gemini API Data Processing
Per [Google's Data Usage Policies](https://ai.google.dev/gemini-api/terms):
- Content used only for generating response
- Not used to train models (with API key)
- Processed in Google's infrastructure
- User retains IP rights

---

## 5. Client-Side Security Measures

### 5.1 Content Security Policy (Production) — IMPLEMENTED

> **Note**: The CSP below is now **implemented** in `vercel.json` headers (added 2026-11-09).
>
> **Update**: Since implementing the server-side Gemini proxy (Phase 9), `connect-src` no longer needs `generativelanguage.googleapis.com` — all API calls go to same-origin `/api/gemini`.

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self';
  img-src 'self' data:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### 5.2 Security Headers (Vercel)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### 5.3 Input Validation
- **Zod schemas** for all form inputs
- **Sanitization**: React's built-in XSS protection (auto-escape)
- **File uploads**: None in MVP
- **URL parameters**: Only review ID, validated as UUID format

### 5.4 Dependency Security
```bash
# Audit command
npm audit
```

> **Note**: The following dependency audit status is **VERIFIED** — `npm audit` was run on 2026-11-09. Results below reflect current state.

```
# Status (VERIFIED — 2026-11-09)
# - Critical: 2 (tinypool, dev only — not in production bundle)
# - High: 9 (minimatch, postcss, zod, react-router — mostly dev or low risk)
# - Moderate: 4 (esbuild, react-router — dev or SSR-only)

# Production dependency assessment:
# - zod (GHSA-mrhx-c7xc-m3w5): High — oversized collections; mitigated by input size limits, constrained schemas
# - react-router-dom (CVE-2025-68470 bypass): Moderate — open redirect via backslash; SSR not used, no user-controlled Links
# - Dev dependencies (esbuild, minimatch, postcss, tinypool, vitest): Not in production bundle

# Recommendation: Update zod to >=4.6.6 when stable; monitor vitest/vite updates for esbuild/tinypool fixes
```

---

## 6. Privacy Compliance

### 6.1 GDPR Considerations
- **No personal data collected** (no auth, no accounts)
- **User controls all data** (view, export via devtools, delete)
- **Right to erasure**: "Clear All Data" button
- **Data portability**: IndexedDB accessible via DevTools Application tab
- **No cookies** used (only localStorage for theme)

### 6.2 CCPA Considerations
- **No sale of personal information**
- **No tracking**
- **User owns all data**

### 6.3 Data Processing Agreement
Not applicable — no backend processing, no subprocessors.

---

## 7. Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| XSS via content | Low | Medium | React auto-escape, no dangerouslySetInnerHTML |
| **API key theft (DevTools)** | **Very Low** | **High** | **Server-side proxy — key never in client** |
| Malicious guideline injection | Low | Low | User controls own guidelines |
| IndexedDB corruption | Low | Medium | Try/catch, graceful degradation |
| Gemini API compromise | Very Low | High | Google infrastructure, API key rotation |
| MITM on API calls | Low | Medium | HTTPS enforced, HSTS |
| localStorage theme tampering | Low | Negligible | Non-sensitive data |
| Zod DoS via oversized collections | Very Low | Medium | Input size limits, constrained schemas |
| React Router open redirect | Low | Low | No user-controlled Links, SSR not used |

---

## 7.1 Known Limitations — Authentication & Authorization

**⚠️ CRITICAL LIMITATION FOR PUBLIC DEPLOYMENTS**

This application is designed as a **single-user MVP** for hackathon demonstration. It **does not implement authentication or authorization**.

### What This Means

| Aspect | Current State | Risk if Publicly Deployed |
|--------|---------------|---------------------------|
| **User Identity** | None — all users are anonymous | Cannot attribute actions to specific users |
| **Access Control** | None — anyone with URL has full access | Any visitor can create guidelines, submit content, trigger AI reviews, approve/reject |
| **Data Isolation** | None — single shared IndexedDB | All users see and modify the same data |
| **API Key Protection** | Server-side only (good) | But unlimited usage by anyone who finds the URL |
| **Rate Limiting** | ✅ 10 req/min per IP (added) | Mitigates abuse but not a substitute for auth |

### Deployment Implications

| Deployment Type | Safe? | Notes |
|-----------------|-------|-------|
| **Local development** | ✅ Yes | Single developer, trusted environment |
| **Private network / VPN** | ⚠️ Conditional | Only if network access is controlled |
| **Password-protected preview** | ⚠️ Conditional | Requires external auth (e.g., Vercel Password Protection) |
| **Public internet (no auth)** | ❌ **NO** | **Do not deploy publicly without authentication** |

### Required Before Public Deployment

1. **Add authentication** (Auth0, Clerk, NextAuth, or custom)
2. **Implement authorization** (user owns their guidelines/submissions/reviews)
3. **Add multi-tenancy** (data isolation per user/organization)
4. **Enable Vercel Password Protection** or similar as interim measure
5. **Audit rate limiting** for authenticated vs anonymous tiers

### Interim Mitigation (Hackathon Demo Only)

If you must demo publicly during the hackathon:
- Enable **Vercel Password Protection** on the deployment
- Or deploy behind a **VPN / ngrok with auth**
- Monitor `/api/gemini` usage in Google Cloud Console
- Set Gemini API key quotas in Google Cloud Console as safety net

---

## 8. Incident Response

### 8.1 API Key Compromise
> **Note**: The Gemini API key is now stored in **Vercel Environment Variables** (server-side), not in the client. If compromised:
1. Detect unusual Gemini usage in Google Cloud Console
2. Go to Google Cloud Console → Credentials
3. Rotate/delete compromised key
4. Update `GEMINI_API_KEY` in Vercel Project Settings → Environment Variables
5. Redeploy (or wait for auto-redeploy)
6. Verify via Settings → "Test Connection"

### 8.2 Data Corruption
1. User reports missing data
2. Open DevTools → Application → IndexedDB
3. Export/inspect data
4. "Clear All Data" if corrupted
5. Re-enter from memory/backups

---

## 9. Security Checklist for Deployment

- [x] HTTPS enforced (Vercel default)
- [x] CSP headers configured (added to vercel.json 2026-11-09)
- [x] Security headers configured (X-Content-Type-Options, X-Frame-Options, etc.)
- [x] **Server-side Gemini API proxy implemented** (`/api/gemini.ts` — API key never in client)
- [ ] No `VITE_GEMINI_API_KEY` in repo (`.gitignore` includes `.env*`)
- [ ] `.env.example` has placeholder only
- [ ] `npm audit` passes
- [ ] Dependencies updated
- [ ] No console.log of sensitive data
- [ ] Error boundaries don't leak state
- [ ] IndexedDB not exposed globally

---

## 10. Security Contacts

| Role | Contact |
|------|---------|
| **Team** | Kislay Choubey, Aman Sapra |
| **Event** | CodeNexus Hackathon (We Code Coders) |
| **Report Issues** | GitHub Issues (private) or direct message |

---

## 11. Compliance Summary (Self-Assessed — No Independent Audit)

| Standard | Status | Notes |
|----------|--------|-------|
| **GDPR** | 🟡 Designed for compliance | No personal data collected; user controls all data via local storage; right to erasure via "Clear All Data" |
| **CCPA** | 🟡 Designed for compliance | No sale of personal information; no tracking; user owns all data |
| **SOC 2** | N/A | No backend, single-user MVP |
| **HIPAA** | N/A | Not a healthcare application |
| **PCI DSS** | N/A | No payment processing |
| **OWASP Top 10 (Client-Side)** | 🟡 Mitigations documented | XSS: React auto-escape; CSRF: No backend; Injection: Zod validation; Broken Auth: N/A; etc. |
| **Dependency Audit** | 🟡 Verified — Dev only | `npm audit` run 2026-11-09; critical/high in dev deps only (not in production); zod & react-router-dom low risk |

> **Note**: "Compliant" and "Addressed" above reflect **self-assessment based on code review**, not independent third-party audit or certification. No penetration testing or formal compliance certification has been performed.

---

## 12. Future Security Enhancements

| Enhancement | Priority | Status | Description |
|-------------|----------|--------|-------------|
| **Backend proxy for Gemini** | **P1** | **✅ DONE (Phase 9)** | **Implemented via Vercel serverless function `/api/gemini.ts` — API key hidden from client, rate limiting ready** |
| User authentication | P2 | Planned | Auth0/Clerk, multi-tenant support |
| Encrypted IndexedDB | P2 | Planned | Additional encryption layer |
| Audit logging | P3 | Planned | Tamper-evident review logs |
| SAML/OIDC | P3 | Planned | Enterprise SSO |
| Penetration testing | P3 | Planned | Professional security audit |