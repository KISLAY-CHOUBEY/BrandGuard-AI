import { GoogleGenAI, ApiError, ThinkingLevel } from '@google/genai'
import type { GeminiReviewRequest, GeminiReviewResponse, Severity } from '@/types'

// Schema for Gemini structured output - using type assertion to satisfy SDK types
const REVIEW_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    findings: { type: 'ARRAY', items: { type: 'OBJECT', properties: { guidelineId: { type: 'STRING' }, ruleId: { type: 'STRING' }, severity: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] }, location: { type: 'OBJECT', properties: { start: { type: 'NUMBER' }, end: { type: 'NUMBER' }, context: { type: 'STRING' } }, required: ['start', 'end', 'context'] }, explanation: { type: 'STRING' }, suggestedCorrection: { type: 'STRING' }, guidelineReference: { type: 'STRING' } }, required: ['guidelineId', 'ruleId', 'severity', 'location', 'explanation', 'suggestedCorrection', 'guidelineReference'] } },
    overallScore: { type: 'NUMBER' },
    summary: { type: 'STRING' }
  },
  required: ['findings', 'overallScore', 'summary']
}

// Minimal schema for connection testing
const TEST_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['ok'] }
  },
  required: ['status']
}

// Retry configuration
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
  const jitter = Math.random() * 0.3 * delay // 0-30% jitter
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs)
}

function buildPrompt(request: GeminiReviewRequest): string {
  const { content, guidelines, contentType } = request
  const guidelineDetails = guidelines.map(g => `
Guideline: ${g.name} (${g.category})
Description: ${g.description}
Rules:
${g.rules.map(r => `  - ${r.title} (${r.severity}): ${r.description}
    Correct: ${r.examples.correct.join('; ')}
    Incorrect: ${r.examples.incorrect.join('; ')}`).join('\n')}
`).join('\n---\n')
  return `You are an expert content reviewer for brand consistency. Analyze the following ${contentType} content against the provided brand guidelines.

CONTENT TO REVIEW:
${content}

BRAND GUIDELINES:
${guidelineDetails}

INSTRUCTIONS:
1. Review the content against ALL rules in the provided guidelines
2. For each violation found, create a finding with:
   - The specific guideline and rule that was violated
   - Severity (low/medium/high/critical) based on the rule's severity
   - Character location (start/end) of the issue in the content
   - Surrounding context (50 chars before and after)
   - Clear explanation of why this violates the guideline
   - Suggested correction that fixes the issue
   - Direct reference to the guideline rule
3. Calculate an overall score (0-100) where 100 = perfect compliance
4. Provide a brief summary of the review

Be thorough but precise. Only flag actual violations, not stylistic preferences not covered by guidelines.
If no violations found, return empty findings array with score 100.`
}

function mapApiError(error: unknown): { statusCode?: number; message: string } {
  if (error instanceof ApiError) {
    // Google's ApiError.message contains JSON.stringify(errorBody).
    // Parse it to extract the human-readable error.message field.
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

export class GeminiReviewService {
  private client: GoogleGenAI | null = null
  private apiKey: string = ''

  initialize(apiKey: string): void { this.apiKey = apiKey; this.client = new GoogleGenAI({ apiKey }) }
  isConfigured(): boolean { return !!this.apiKey && !!this.client }

  /**
   * Test the API connection with a minimal request
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) return { success: false, message: 'Gemini API not configured' }
    try {
      const response = await this.client.models.generateContent({
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
      if (!text) return { success: false, message: 'Empty response from Gemini' }
      const parsed = JSON.parse(text)
      if (parsed.status === 'ok') return { success: true, message: 'Connection successful' }
      return { success: false, message: 'Unexpected response format' }
    } catch (error) {
      const mapped = mapApiError(error)
      switch (mapped.statusCode) {
        case 401: return { success: false, message: 'Invalid API key' }
        case 403: return { success: false, message: 'API key forbidden - check permissions' }
        case 404: return { success: false, message: 'Model not found or not available' }
        case 429: return { success: false, message: 'Rate limited - please try again later' }
        case 500: return { success: false, message: 'Gemini API server error - please try again later' }
      }
      if (mapped.message.includes('network') || mapped.message.includes('fetch')) {
        return { success: false, message: 'Network error - check your connection' }
      }
      return { success: false, message: mapped.message || 'Connection test failed' }
    }
  }

  async reviewContent(request: GeminiReviewRequest): Promise<GeminiReviewResponse> {
    if (!this.client) throw new Error('Gemini API not configured. Please add your API key in Settings.')

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      const attemptController = new AbortController()
      const attemptTimeoutId = setTimeout(() => attemptController.abort(new Error('Gemini request timed out after 120 seconds.')), 120000)
      try {
        const response = await this.client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: buildPrompt(request),
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
        const parsed = JSON.parse(text) as GeminiReviewResponse
        if (!parsed.findings || !Array.isArray(parsed.findings)) throw new Error('Invalid response: missing findings')
        if (typeof parsed.overallScore !== 'number') throw new Error('Invalid response: missing score')
        parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
        parsed.findings = parsed.findings.map((f) => ({
          ...f,
          severity: (['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium') as Severity,
          location: { start: Math.max(0, f.location?.start ?? 0), end: Math.max(0, f.location?.end ?? 0), context: f.location?.context ?? '' }
        }))
        return parsed as GeminiReviewResponse
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error('Failed to parse Gemini response as JSON')
        // Use our explicit timeout reason when our own controller aborted,
        // but preserve any previous non-timeout error (e.g. a 503 ApiError) so
        // the actual Google error is surfaced when retries are exhausted.
        if (error instanceof Error && error.name === 'AbortError' && attemptController.signal.reason instanceof Error) {
          if (!lastError || lastError.name === 'AbortError') {
            lastError = attemptController.signal.reason
          }
          // else: keep the previous non-timeout error
        } else {
          lastError = error instanceof Error ? error : new Error(String(error))
        }

        // Don't retry on the last attempt
        if (attempt === RETRY_CONFIG.maxRetries) break

        // Never retry abort errors from our own per-attempt controller
        if (lastError.name === 'AbortError') break

        // Only retry on retryable errors
        if (!isRetryableError(lastError)) break

        const delay = calculateDelay(attempt)
        console.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } finally {
        clearTimeout(attemptTimeoutId)
      }
    }

    const mapped = mapApiError(lastError ?? new Error('Gemini API request failed after retries'))
    throw new Error(mapped.message)
  }
}

export const geminiService = new GeminiReviewService()
