import { GoogleGenerativeAI } from '@google/generative-ai'
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
  retryableErrors: ['429', 'quota', 'rate limit', 'network', 'fetch', 'timeout', '503', '504', '502']
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

export class GeminiReviewService {
  private client: GoogleGenerativeAI | null = null
  private apiKey: string = ''

  initialize(apiKey: string): void { this.apiKey = apiKey; this.client = new GoogleGenerativeAI(apiKey) }
  isConfigured(): boolean { return !!this.apiKey && !!this.client }

  /**
   * Test the API connection with a minimal request
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) return { success: false, message: 'Gemini API not configured' }
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
          responseMimeType: 'application/json',
          responseSchema: TEST_SCHEMA
        }
      })
      const result = await model.generateContent('Respond with {"status": "ok"}')
      const text = result.response.text()
      if (!text) return { success: false, message: 'Empty response from Gemini' }
      const parsed = JSON.parse(text)
      if (parsed.status === 'ok') return { success: true, message: 'Connection successful' }
      return { success: false, message: 'Unexpected response format' }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (err.message.includes('API_KEY') || err.message.includes('API key')) return { success: false, message: 'Invalid API key' }
      if (err.message.includes('quota') || err.message.includes('429')) return { success: false, message: 'Rate limited - please try again later' }
      if (err.message.includes('network') || err.message.includes('fetch')) return { success: false, message: 'Network error - check your connection' }
      return { success: false, message: err.message || 'Connection test failed' }
    }
  }

  async reviewContent(request: GeminiReviewRequest): Promise<GeminiReviewResponse> {
    if (!this.client) throw new Error('Gemini API not configured. Please add your API key in Settings.')

    const model = this.client.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: REVIEW_SCHEMA
      }
    })
    const prompt = buildPrompt(request)

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt)
        const text = result.response.text()
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
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on the last attempt
        if (attempt === RETRY_CONFIG.maxRetries) break

        // Only retry on retryable errors
        if (!isRetryableError(lastError)) break

        const delay = calculateDelay(attempt)
        console.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError ?? new Error('Gemini API request failed after retries')
  }
}

export const geminiService = new GeminiReviewService()