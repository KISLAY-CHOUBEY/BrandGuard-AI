# Security & Privacy Documentation

## ThroneCaptures — Security Model & Privacy

---

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THRONE CAPTURES SECURITY MODEL                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CLIENT    │     │   BROWSER   │     │   EXTERNAL  │
│  (REACT)    │────▶│  STORAGE    │     │   SERVICES  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  • No backend server                                            │
│  • No authentication (single-user MVP)                         │
│  • API key stored in IndexedDB (browser storage, not encrypted)             │
│  • Content sent ONLY to Gemini API                             │
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
| **Content Submissions** | IndexedDB (local) | To Gemini API only | Until user deletes |
| **Review Findings** | IndexedDB (local) | Never | Until user deletes |
| **Gemini API Key** | IndexedDB (local) | To Gemini API (auth header) | Until user clears |
| **Theme Preference** | localStorage | Never | Until user clears |

### 2.2 What Leaves the Browser

**Only**: Content submitted for review → Google Gemini API

**Never**:
- Data sent to our servers (no backend exists)
- Data sent to third parties (except Gemini)
- Analytics or tracking events
- API keys in logs or error reports

---

## 3. API Key Security

### 3.1 Storage
- **Location**: IndexedDB (`thronecaptures-db` → `settings` store)
- **Encryption**: None (IndexedDB is browser storage, not encrypted at rest)
- **Access**: Only via StorageService, never exposed in React DevTools state directly

### 3.2 Transmission
- **Header**: `x-goog-api-key: YOUR_KEY` (Gemini standard)
- **Protocol**: HTTPS only (enforced by Gemini API)
- **Scope**: Only `generativelanguage.googleapis.com`

### 3.3 User Controls
- **View/Edit**: Settings page with show/hide toggle
- **Test**: "Test Connection" validates without storing
- **Delete**: "Clear All Data" removes key permanently
- **Override**: Can enter different key per session

### 3.4 Limitation (Documented)
> **⚠️ IMPORTANT**: Vite environment variables (`VITE_GEMINI_API_KEY`) are embedded in the client bundle and visible in browser DevTools. This is a fundamental limitation of client-only architectures.
> 
> **Mitigation**: 
> - Users should use a dedicated API key for this application
> - Set API key restrictions in Google Cloud Console (API restrictions, HTTP referrers)
> - Rotate keys periodically
> - The app prioritizes user-entered key over Vite default

---

## 4. Content Security

### 4.1 Content Handling
- Content **never logged** to console
- Content **never stored** in localStorage (only IndexedDB)
- Content **only transmitted** to Gemini API during review
- No content caching in service workers (none configured)

### 4.2 Gemini API Data Processing
Per [Google's Data Usage Policies](https://ai.google.dev/gemini-api/terms):
- Content used only for generating response
- Not used to train models (with API key)
- Processed in Google's infrastructure
- User retains IP rights

---

## 5. Client-Side Security Measures

### 5.1 Content Security Policy (Production) — NOT IMPLEMENTED

> **Note**: The CSP below is a **design target**, not currently implemented. `vercel.json` does not include a CSP header. This policy should be added to `vercel.json` headers before production deployment.

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self' generativelanguage.googleapis.com;
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

> **Note**: The following dependency audit status is **UNVERIFIED** — `npm audit` has not been run in this session. The claims below are from a prior assessment and should be re-validated before production deployment.

```
# Status (UNVERIFIED — prior assessment only)
# - No critical vulnerabilities in production dependencies (unverified)
# - No high vulnerabilities in production dependencies (unverified)
# - Moderate: react-router-dom (CVE-2025-68470 bypass) - SSR not used, low risk
# - High: zod (GHSA-mrhx-c7xc-m3w5) - oversized collections not used, low risk
# - Dev dependencies: esbuild, minimatch, postcss, tinypool (not in production bundle)
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
| API key theft (DevTools) | Medium | High | Documented limitation, user rotation |
| Malicious guideline injection | Low | Low | User controls own guidelines |
| IndexedDB corruption | Low | Medium | Try/catch, graceful degradation |
| Gemini API compromise | Very Low | High | Google infrastructure, API key rotation |
| MITM on API calls | Low | Medium | HTTPS enforced, HSTS |
| localStorage theme tampering | Low | Negligible | Non-sensitive data |
| Zod DoS via oversized collections | Very Low | Medium | Input size limits, constrained schemas |
| React Router open redirect | Low | Low | No user-controlled Links, SSR not used |

---

## 8. Incident Response

### 8.1 API Key Compromise
1. User detects unusual Gemini usage
2. Go to Google Cloud Console → Credentials
3. Rotate/delete compromised key
4. Enter new key in ThroneCaptures Settings
5. Test connection

### 8.2 Data Corruption
1. User reports missing data
2. Open DevTools → Application → IndexedDB
3. Export/inspect data
4. "Clear All Data" if corrupted
5. Re-enter from memory/backups

---

## 9. Security Checklist for Deployment

- [ ] HTTPS enforced (Vercel default)
- [ ] CSP headers configured
- [ ] Security headers configured
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
| **Dependency Audit** | ⚠️ Unverified | `npm audit` not run in this session; prior claims unverified |

> **Note**: "Compliant" and "Addressed" above reflect **self-assessment based on code review**, not independent third-party audit or certification. No penetration testing or formal compliance certification has been performed.

---

## 12. Future Security Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Backend proxy for Gemini | P1 | Hide API key from client, add rate limiting |
| User authentication | P2 | Auth0/Clerk, multi-tenant support |
| Encrypted IndexedDB | P2 | Additional encryption layer |
| Audit logging | P3 | Tamper-evident review logs |
| SAML/OIDC | P3 | Enterprise SSO |
| Penetration testing | P3 | Professional security audit |