import type { GeminiReviewRequest, GeminiReviewResponse } from '@/types'

// API base URL - uses relative path for Vercel deployment
const API_BASE = '/api'

export interface GeminiReviewService {
  initialize(apiKey: string): void
  isConfigured(): boolean
  testConnection(): Promise<{ success: boolean; message: string }>
  reviewContent(request: GeminiReviewRequest): Promise<GeminiReviewResponse>
}

class FrontendGeminiService implements GeminiReviewService {
  // API key is now configured server-side via Vercel environment variable
  // This field is kept for interface compatibility but is no longer used
  private _configured = false

  initialize(): void {
    this._configured = true
  }

  /** Reset the service state - for testing only */
  resetForTesting(): void {
    this._configured = false
  }

  isConfigured(): boolean {
    // Always return true since the server has the key configured
    return this._configured
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this._configured) {
      return { success: false, message: 'Gemini API not configured' }
    }
    try {
      const response = await fetch(`${API_BASE}/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return { success: false, message: error.error || `HTTP ${response.status}` }
      }

      const data = await response.json()
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      if (message.includes('network') || message.includes('fetch')) {
        return { success: false, message: 'Network error - check your connection' }
      }
      return { success: false, message }
    }
  }

  async reviewContent(request: GeminiReviewRequest): Promise<GeminiReviewResponse> {
    if (!this._configured) {
      throw new Error('Gemini API not configured')
    }
    const response = await fetch(`${API_BASE}/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review',
        content: request.content,
        guidelines: request.guidelines,
        contentType: request.contentType
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `API request failed with status ${response.status}`)
    }

    const parsed = await response.json()

    // Validate and normalize response (same as server-side)
    if (!parsed.findings || !Array.isArray(parsed.findings)) throw new Error('Invalid response: missing findings')
    if (typeof parsed.overallScore !== 'number') throw new Error('Invalid response: missing score')
    parsed.overallScore = Math.max(0, Math.min(100, Math.round(parsed.overallScore)))
    parsed.findings = parsed.findings.map((f: any) => ({
      ...f,
      severity: (['low', 'medium', 'high', 'critical'].includes(f.severity) ? f.severity : 'medium'),
      location: { start: Math.max(0, f.location?.start ?? 0), end: Math.max(0, f.location?.end ?? 0), context: f.location?.context ?? '' }
    }))

    return parsed as GeminiReviewResponse
  }
}

export const geminiService = new FrontendGeminiService()