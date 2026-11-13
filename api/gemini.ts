import { GoogleGenAI, ApiError, ThinkingLevel } from '@google/genai'
import { geminiRateLimiter, getClientIp, setRateLimitHeaders } from '../src/lib/rate-limiter'

// Schema for Gemini structured output
const REVIEW_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    findings: { type: 'ARRAY', items: { type: 'OBJECT', properties: { guidelineId: { type: 'STRING' }, ruleId: { type: 'STRING' }, severity: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] }, location: { type: 'OBJECT', properties: { start: { type: 'NUMBER' }, end: { type: 'NUMBER' }, context: { type: 'STRING' } }, required: ['start', 'end', 'context'] }, explanation: { type: 'STRING' }, suggestedCorrection: { type: 'STRING' }, guidelineReference: { type: 'STRING' } }, required: ['guidelineId', 'ruleId', 'severity', 'location', 'explanation', 'suggestedCorrection', 'guidelineReference'] } },
    overallScore: { type: 'NUMBER' },
    summary: { type: 'STRING' }
  },
  required: ['findings', 'overallScore', 'summary']
}

const TEST_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['ok'] }
  },
  required: ['status']
}

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['429', 'quota', 'rate limit', 'network', 'fetch', 'timeout', '504', '502']
} as const

function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()
  return RETRY_CONFIG.retryableErrors.some(e => message.includes(e.toLowerCase()))
}

function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * delay
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs)
}

function buildPrompt(request: any): string {
  const { content, guidelines, contentType } = request
  const guidelineDetails = guidelines.map((g: any) => `
Guideline: ${g.name} (${g.category})
Description: ${g.description}
Rules:
${g.rules.map((r: any) => `  - ${r.title} (${r.severity}): ${r.description}
    Correct examples: ${r.examples.correct.join('; ')}
    Incorrect examples: ${r.examples.incorrect.join('; ')}`).join('\n')}
`).join('\n---\n')
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
- Be precise: verify each finding by checking that content.substring(start, end) matches the problematic text you identified`
}

function mapApiError(error: unknown): { statusCode?: number; message: string } {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { error?: { message?: string } }
      if (parsed.error?.message) {
        return { statusCode: error.status, message: parsed.error.message }
      }
    } catch {
      // Not valid JSON — fall through to raw message
    }
    return { statusCode: error.status, message: error.message }
  }
  const err = error instanceof Error ? error : new Error(String(error))
  return { message: err.message }
}

// Startup validation for GEMINI_API_KEY (logs once per cold start)
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY environment variable not configured')
  console.warn('   AI review functionality will be unavailable until configured.')
  console.warn('   Set GEMINI_API_KEY in Vercel Project Settings → Environment Variables.')
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limiting
  const ip = getClientIp(req)
  const rateLimitResult = geminiRateLimiter.check(ip)
  setRateLimitHeaders(res, geminiRateLimiter.getInfo(ip), 10)

  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.',
      retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
    })
  }

  const { action, content, guidelines, contentType } = req.body

  // Read API key from request header (user-provided BYOK) or server-side environment variable (fallback)
  const apiKey = req.headers['x-gemini-api-key'] as string | undefined ?? process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI service not configured. Please provide a Gemini API key or set GEMINI_API_KEY in server environment.'
    })
  }

  const client = new GoogleGenAI({ apiKey })

  try {
    if (action === 'test') {
      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Respond with {"status": "ok"}',
        config: {
          temperature: 0.1,
          maxOutputTokens: 100,
          responseMimeType: 'application/json',
          responseSchema: TEST_SCHEMA as any
        }
      })
      const text = response.text
      if (!text) return res.status(500).json({ success: false, message: 'Empty response from Gemini' })
      const parsed = JSON.parse(text)
      if (parsed.status === 'ok') return res.json({ success: true, message: 'Connection successful' })
      return res.status(500).json({ success: false, message: 'Unexpected response format' })
    }

    if (action === 'review') {
      if (!content || !guidelines || !contentType) {
        return res.status(400).json({ error: 'Missing required fields: content, guidelines, contentType' })
      }

      if (content.length > 100000) {
        return res.status(400).json({ error: 'Content too large. Maximum 100KB allowed.' })
      }

      if (!Array.isArray(guidelines) || guidelines.length === 0 || guidelines.length > 20) {
        return res.status(400).json({ error: 'Invalid guidelines. Must provide 1-20 guidelines.' })
      }

      let lastError: Error | null = null

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        const attemptController = new AbortController()
        const attemptTimeoutId = setTimeout(() => attemptController.abort(new Error('Gemini request timed out after 120 seconds.')), 120000)
        try {
          const response = await client.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: buildPrompt({ content, guidelines, contentType }),
            config: {
              temperature: 0.1,
              topP: 0.8,
              topK: 40,
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: REVIEW_SCHEMA as any,
              abortSignal: attemptController.signal
            }
          })
          const text = response.text
          if (!text) throw new Error('Empty response from Gemini')
          const parsed = JSON.parse(text)
          if (!parsed.findings || !Array.isArray(parsed.findings)) throw new Error('Invalid response: missing findings')
          if (typeof parsed.overallScore !== 'number') throw new Error('Invalid response: missing score')
          parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
          parsed.findings = parsed.findings.map((f: any) => ({
            ...f,
            severity: (['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium'),
            location: { start: Math.max(0, f.location?.start ?? 0), end: Math.max(0, f.location?.end ?? 0), context: f.location?.context ?? '' }
          }))
          return res.json(parsed)
        } catch (error) {
          if (error instanceof SyntaxError) throw new Error('Failed to parse Gemini response as JSON')
          if (error instanceof Error && error.name === 'AbortError' && attemptController.signal.reason instanceof Error) {
            if (!lastError || lastError.name === 'AbortError') {
              lastError = attemptController.signal.reason
            }
          } else {
            lastError = error instanceof Error ? error : new Error(String(error))
          }

          if (attempt === RETRY_CONFIG.maxRetries) break
          if (lastError.name === 'AbortError') break
          if (!isRetryableError(lastError)) break

          const delay = calculateDelay(attempt)
          console.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        } finally {
          clearTimeout(attemptTimeoutId)
        }
      }

      const mapped = mapApiError(lastError ?? new Error('Gemini API request failed after retries'))
      const statusCode = mapped.statusCode ?? 500
      return res.status(statusCode).json({ error: mapped.message })
    }

    return res.status(400).json({ error: 'Invalid action. Use "test" or "review"' })
  } catch (error) {
    console.error('Gemini API error:', error)
    const mapped = mapApiError(error)
    const statusCode = mapped.statusCode ?? 500
    return res.status(statusCode).json({ error: mapped.message || 'Internal server error' })
  }
}