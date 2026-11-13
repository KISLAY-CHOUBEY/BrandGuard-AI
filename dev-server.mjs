import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ApiError } from '@google/genai';

// Inline rate limiter (same logic as src/lib/rate-limiter.ts, required for native Node execution of .mjs)
const rateLimitStore = new Map();
function createRateLimiter(config) {
  const { windowMs, maxRequests, message, timeFn = Date.now } = config;
  return {
    check(key) {
      const now = timeFn();
      const existing = rateLimitStore.get(key);
      if (!existing || existing.resetTime < now) {
        const resetTime = now + windowMs;
        rateLimitStore.set(key, { count: 1, resetTime });
        return { allowed: true, remaining: maxRequests - 1, resetTime };
      }
      if (existing.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: existing.resetTime };
      }
      existing.count++;
      return { allowed: true, remaining: maxRequests - existing.count, resetTime: existing.resetTime };
    },
    getInfo(key) {
      const existing = rateLimitStore.get(key);
      if (!existing || existing.resetTime < timeFn()) {
        return null;
      }
      return { remaining: Math.max(0, maxRequests - existing.count), resetTime: existing.resetTime };
    },
  };
}
const geminiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many requests. Please wait a moment before trying again.',
});
function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
function setRateLimitHeaders(res, info, maxRequests) {
  if (!info) return;
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', info.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from .env.local
dotenv.config({ path: resolve(__dirname, '.env.local') });

// Configuration (same as api/gemini.ts)
const REVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          guidelineId: { type: 'STRING' },
          ruleId: { type: 'STRING' },
          severity: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] },
          location: {
            type: 'OBJECT',
            properties: {
              start: { type: 'NUMBER' },
              end: { type: 'NUMBER' },
              context: { type: 'STRING' }
            },
            required: ['start', 'end', 'context']
          },
          explanation: { type: 'STRING' },
          suggestedCorrection: { type: 'STRING' },
          guidelineReference: { type: 'STRING' }
        },
        required: ['guidelineId', 'ruleId', 'severity', 'location', 'explanation', 'suggestedCorrection', 'guidelineReference']
      }
    },
    overallScore: { type: 'NUMBER' },
    summary: { type: 'STRING' }
  },
  required: ['findings', 'overallScore', 'summary']
};

const TEST_SCHEMA = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['ok'] }
  },
  required: ['status']
};

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['429', 'quota', 'rate limit', 'network', 'fetch', 'timeout', '502', '503', 'unavailable']
};

const FALLBACK_MODEL = 'gemini-1.5-flash';

function isRetryableError(error) {
  const message = error.message.toLowerCase();
  return RETRY_CONFIG.retryableErrors.some(e => message.includes(e.toLowerCase()));
}

function calculateDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}

function buildPrompt(request) {
  const { content, guidelines, contentType } = request;
  const guidelineDetails = guidelines.map((g) => `
Guideline: ${g.name} (${g.category})
Description: ${g.description}
Rules:
${g.rules.map((r) => `  - ${r.title} (${r.severity}): ${r.description}
    Correct examples: ${r.examples.correct.join('; ')}
    Incorrect examples: ${r.examples.incorrect.join('; ')}`).join('\n')}
`).join('\n---\n');
  return `You are an expert content reviewer for brand consistency. Analyze the following ${contentType} content against the provided brand guidelines.

CONTENT TO REVIEW:
${content}

BRAND GUIDELINES:
${guidelineDetails}

INSTRUCTIONS:
1. Review the content against ALL rules in the provided guidelines
2. For each violation found, create a finding with:
   - The specific guideline and rule that was violated (use exact guidelineId and ruleId)
   - Severity (low/medium/high/critical) based on the rule's severity
   - Character location (start/end) of the issue in the ORIGINAL content string
   - Surrounding context: the EXACT substring from the content (50 chars before start to 50 chars after end)
   - Clear explanation of why this violates the guideline rule
   - Suggested correction: the EXACT text that should replace the problematic portion
   - Direct reference to the guideline rule (quote the specific rule description)
3. Calculate an overall score (0-100) where 100 = perfect compliance
4. Provide a brief summary of the review

CRITICAL REQUIREMENTS:
- The location.start and location.end MUST be valid character indices in the original content string
- The location.context MUST be an exact substring of the content (content.substring(Math.max(0, start-50), Math.min(content.length, end+50)))
- The suggestedCorrection MUST be the exact replacement text for content.substring(start, end)
- Only flag violations that are explicitly covered by the provided guidelines
- Do not flag stylistic preferences not covered by guidelines
- If no violations found, return empty findings array with score 100
- Be precise: verify each finding by checking that content.substring(start, end) matches the problematic text you identified`;
}

function mapApiError(error) {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error?.message) {
        return { statusCode: error.status, message: parsed.error.message };
      }
    } catch {
      // Not valid JSON — fall through to raw message
    }
    return { statusCode: error.status, message: error.message };
  }
  const err = error instanceof Error ? error : new Error(String(error));
  return { message: err.message };
}

const app = express();
app.use(express.json({ limit: '100kb' }));

// Startup validation for GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY environment variable not configured');
  console.warn('   AI review functionality will be unavailable until configured.');
  console.warn('   Set GEMINI_API_KEY in .env.local for local development');
  console.warn('   or in Vercel Project Settings for production.');
}

// Rate limiting middleware for /api/gemini
app.use('/api/gemini', (req, res, next) => {
  const ip = getClientIp(req);
  const result = geminiRateLimiter.check(ip);
  setRateLimitHeaders(res, geminiRateLimiter.getInfo(ip), 10);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
    });
  }
  next();
});

// API route: /api/gemini (same logic as Vercel serverless function)
app.post('/api/gemini', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, content, guidelines, contentType } = req.body;

  // Read API key from request header (user-provided BYOK) or server-side environment variable (fallback)
  const apiKey = req.headers['x-gemini-api-key'] ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI service not configured. Please provide a Gemini API key or set GEMINI_API_KEY in server environment.'
    });
  }

  const client = new GoogleGenAI({ apiKey });

  try {
    if (action === 'test') {
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Respond with {"status": "ok"}',
        config: {
          temperature: 0.1,
          maxOutputTokens: 100,
          responseMimeType: 'application/json',
          responseSchema: TEST_SCHEMA
        }
      });
      const text = response.text;
      if (!text) return res.status(500).json({ success: false, message: 'Empty response from Gemini' });
      const parsed = JSON.parse(text);
      if (parsed.status === 'ok') return res.json({ success: true, message: 'Connection successful' });
      return res.status(500).json({ success: false, message: 'Unexpected response format' });
    }

    if (action === 'review') {
      if (!content || !guidelines || !contentType) {
        return res.status(400).json({ error: 'Missing required fields: content, guidelines, contentType' });
      }

      if (content.length > 100000) {
        return res.status(400).json({ error: 'Content too large. Maximum 100KB allowed.' });
      }

      if (!Array.isArray(guidelines) || guidelines.length === 0 || guidelines.length > 20) {
        return res.status(400).json({ error: 'Invalid guidelines. Must provide 1-20 guidelines.' });
      }

      let lastError = null;

      const overallController = new AbortController();
      const overallTimeoutId = setTimeout(() => overallController.abort(new Error('Gemini review timed out after 60 seconds.')), 60000);

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        const attemptController = new AbortController();
        const attemptTimeoutId = setTimeout(() => attemptController.abort(new Error('Gemini request timed out after 120 seconds.')), 120000);
        try {
          const response = await client.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: buildPrompt({ content, guidelines, contentType }),
            config: {
              temperature: 0.1,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: REVIEW_SCHEMA,
              abortSignal: AbortSignal.any([attemptController.signal, overallController.signal])
            }
          });
          const text = response.text;
          if (!text) throw new Error('Empty response from Gemini');
          const parsed = JSON.parse(text);
          if (!parsed.findings || !Array.isArray(parsed.findings)) throw new Error('Invalid response: missing findings');
          if (typeof parsed.overallScore !== 'number') throw new Error('Invalid response: missing score');
          parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)));
          parsed.findings = parsed.findings.map((f) => ({
            ...f,
            severity: (['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium'),
            location: { start: Math.max(0, f.location?.start ?? 0), end: Math.max(0, f.location?.end ?? 0), context: f.location?.context ?? '' }
          }));
          return res.json(parsed);
        } catch (error) {
          if (error instanceof SyntaxError) throw new Error('Failed to parse Gemini response as JSON');
          if (error instanceof Error && error.name === 'AbortError') {
            const reason = attemptController.signal.reason instanceof Error
              ? attemptController.signal.reason
              : overallController.signal.reason instanceof Error
                ? overallController.signal.reason
                : error;
            if (!lastError || lastError.name === 'AbortError') {
              lastError = reason;
            }
          } else {
            lastError = error instanceof Error ? error : new Error(String(error));
          }

          console.log('Gemini attempt error:', {
            attempt: attempt + 1,
            errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
            isApiError: lastError instanceof ApiError,
            apiErrorStatus: lastError instanceof ApiError ? lastError.status : undefined,
            isRetryable: isRetryableError(lastError),
            isAbortError: lastError.name === 'AbortError'
          });

          if (attempt === RETRY_CONFIG.maxRetries) break;
          if (lastError.name === 'AbortError') break;
          if (!isRetryableError(lastError)) break;

          const delay = calculateDelay(attempt);
          console.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } finally {
          clearTimeout(attemptTimeoutId);
        }
      }

      // Fallback to alternative model for transient 503 errors only
      if (lastError instanceof ApiError && lastError.status === 503) {
        try {
          const fallbackResponse = await client.models.generateContent({
            model: FALLBACK_MODEL,
            contents: buildPrompt({ content, guidelines, contentType }),
            config: {
              temperature: 0.1,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: REVIEW_SCHEMA,
              abortSignal: overallController.signal
            }
          });
          const fallbackText = fallbackResponse.text;
          if (!fallbackText) throw new Error('Empty response from fallback model');
          const fallbackParsed = JSON.parse(fallbackText);
          if (!fallbackParsed.findings || !Array.isArray(fallbackParsed.findings)) throw new Error('Invalid fallback response: missing findings');
          if (typeof fallbackParsed.overallScore !== 'number') throw new Error('Invalid fallback response: missing score');
          fallbackParsed.overallScore = Math.max(0, Math.min(100, Math.round(fallbackParsed.overallScore)));
          fallbackParsed.findings = fallbackParsed.findings.map((f) => ({
            ...f,
            severity: (['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium'),
            location: { start: Math.max(0, f.location?.start ?? 0), end: Math.max(0, f.location?.end ?? 0), context: f.location?.context ?? '' }
          }));
          clearTimeout(overallTimeoutId);
          return res.json(fallbackParsed);
        } catch {
          // Fallback failed — fall through to return original error
        }
      }

      clearTimeout(overallTimeoutId);

      const mapped = mapApiError(lastError ?? new Error('Gemini API request failed after retries'));
      const statusCode = mapped.statusCode ?? 500;
      return res.status(statusCode).json({ error: mapped.message });
    }

    return res.status(400).json({ error: 'Invalid action. Use "test" or "review"' });
  } catch (error) {
    console.log('Gemini API error details:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      statusCode: error instanceof ApiError ? error.status : undefined,
      apiKeySource: req.headers['x-gemini-api-key'] ? 'BYOK' : process.env.GEMINI_API_KEY ? 'env' : 'none',
      apiKeyPresent: !!apiKey
    });
    const mapped = mapApiError(error);
    const statusCode = mapped.statusCode ?? 500;
    return res.status(statusCode).json({ error: mapped.message || 'Internal server error' });
  }
});

// Proxy all other requests to Vite dev server (port 3001)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  ws: true,
  logLevel: 'silent'
}));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Local dev server running on http://localhost:${PORT}`);
  console.log(`- Frontend proxied from Vite dev server (port 3001)`);
  console.log(`- API routes handled locally: /api/gemini`);
  console.log(`- GEMINI_API_KEY loaded from .env.local: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO (MISSING!)'}`);
});