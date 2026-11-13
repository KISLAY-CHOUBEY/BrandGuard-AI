import type { GeminiReviewRequest, GeminiReviewResponse } from '@/types'

// API base URL - uses relative path for Vercel deployment
const API_BASE = '/api'

export interface GeminiReviewService {
  initialize(apiKey?: string): void
  isConfigured(): boolean
  testConnection(apiKey?: string): Promise<{ success: boolean; message: string }>
  reviewContent(request: GeminiReviewRequest, apiKey?: string): Promise<GeminiReviewResponse>
  /** Set user-provided API key (BYOK) - kept in memory only, never persisted */
  setUserApiKey(apiKey: string | null): void
  /** Get current user API key if set */
  getUserApiKey(): string | null
  /** Check if user has provided their own key */
  hasUserApiKey(): boolean
  /** Reset the service state - for testing only */
  resetForTesting(): void
}

class FrontendGeminiService implements GeminiReviewService {
  // User-provided API key (BYOK) - kept in memory only, never persisted
  private _userApiKey: string | null = null
  private _serverConfigured = false

  initialize(userApiKey?: string): void {
    this._userApiKey = userApiKey ?? null
    this._serverConfigured = true
  }

  /** Set user-provided API key (BYOK) - kept in memory only */
  setUserApiKey(apiKey: string | null): void {
    this._userApiKey = apiKey
  }

  /** Get current user API key if set */
  getUserApiKey(): string | null {
    return this._userApiKey
  }

  /** Check if user has provided their own key */
  hasUserApiKey(): boolean {
    return this._userApiKey !== null && this._userApiKey.length > 0
  }

  /** Reset the service state - for testing only */
  resetForTesting(): void {
    this._userApiKey = null
    this._serverConfigured = false
  }

  isConfigured(): boolean {
    // Return true if either user provided key or server is configured
    return this.hasUserApiKey() || this._serverConfigured
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    // Use user-provided key if available, otherwise let server use its fallback
    const keyToSend = apiKey ?? this._userApiKey
    if (keyToSend) {
      headers['x-gemini-api-key'] = keyToSend
    }
    return headers
  }

  async testConnection(apiKey?: string): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured() && !apiKey) {
      return { success: false, message: 'Gemini API not configured' }
    }
    try {
      const response = await fetch(`${API_BASE}/gemini`, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
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

  async reviewContent(request: GeminiReviewRequest, apiKey?: string): Promise<GeminiReviewResponse> {
    if (!this.isConfigured() && !apiKey) {
      throw new Error('Gemini API not configured')
    }
    const response = await fetch(`${API_BASE}/gemini`, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
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