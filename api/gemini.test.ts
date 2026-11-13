import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the GoogleGenAI module
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn()
    }
  })),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
  ThinkingLevel: { LOW: 'low' }
}))

// Mock rate limiter
vi.mock('../src/lib/rate-limiter', () => ({
  geminiRateLimiter: {
    check: vi.fn().mockReturnValue({ allowed: true }),
    getInfo: vi.fn().mockReturnValue({})
  },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  setRateLimitHeaders: vi.fn()
}))

import { GoogleGenAI } from '@google/genai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Import the handler dynamically after mocks are set up
async function getHandler() {
  const mod = await import('./gemini.ts')
  return mod.default
}

describe('API /api/gemini handler', () => {
  let mockReq: Partial<VercelRequest>
  let mockRes: Partial<VercelResponse>
  let mockJson: ReturnType<typeof vi.fn>
  let mockStatus: ReturnType<typeof vi.fn>
  let mockSend: ReturnType<typeof vi.fn>
  let mockGenerateContent: ReturnType<typeof vi.fn>
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalEnv = { ...process.env }
    process.env.GEMINI_API_KEY = 'server-fallback-key'

    mockJson = vi.fn().mockImplementation(() => mockRes)
    mockStatus = vi.fn().mockImplementation(() => ({ json: mockJson, send: mockSend }))
    mockSend = vi.fn().mockImplementation(() => mockRes)
    mockRes = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
      setHeader: vi.fn()
    } as Partial<VercelResponse>

    mockGenerateContent = vi.fn()
    ;(GoogleGenAI as any).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent }
    }))
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  function createMockReq(overrides: Partial<VercelRequest> = {}): Partial<VercelRequest> {
    return {
      method: 'POST',
      headers: {},
      body: {},
      ...overrides
    }
  }

  describe('API key precedence', () => {
    it('uses custom x-gemini-api-key header when provided', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': 'custom-user-key' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'custom-user-key' })
    })

    it('falls back to GEMINI_API_KEY env var when no custom header', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: {},
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'server-fallback-key' })
    })

    it('custom header takes precedence over env var', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': 'custom-key' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'custom-key' })
      expect(GoogleGenAI).not.toHaveBeenCalledWith({ apiKey: 'server-fallback-key' })
    })
  })

  describe('malformed header handling', () => {
    it('rejects empty string header with 503 (falsy check)', async () => {
      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': '' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      // Empty string is falsy, so !apiKey check triggers 503
      expect(mockStatus).toHaveBeenCalledWith(503)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'AI service not configured. Please provide a Gemini API key or set GEMINI_API_KEY in server environment.'
      })
    })

    it('handles whitespace-only header (passed to Gemini, will fail there)', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': '   ' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: '   ' })
    })
  })

  describe('key never logged or persisted', () => {
    it('does not log API key in console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': 'secret-key-123' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      const allLogs = [
        ...consoleSpy.mock.calls.map(c => c.join(' ')),
        ...consoleWarnSpy.mock.calls.map(c => c.join(' ')),
        ...consoleErrorSpy.mock.calls.map(c => c.join(' '))
      ]

      const keyLeaked = allLogs.some(log => log.includes('secret-key-123'))
      expect(keyLeaked).toBe(false)

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('does not persist API key to any storage', async () => {
      // The handler uses the key only for the GoogleGenAI client instantiation
      // It does not write to any database, file, or persistent storage
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({ status: 'ok' })
      })

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: { 'x-gemini-api-key': 'secret-key-123' },
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      // Verify the key was only passed to GoogleGenAI constructor
      expect(GoogleGenAI).toHaveBeenCalledTimes(1)
      expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'secret-key-123' })
    })
  })

  describe('error handling', () => {
    it('returns 503 when no API key available (no header, no env)', async () => {
      delete process.env.GEMINI_API_KEY

      const handler = await getHandler()
      mockReq = createMockReq({
        headers: {},
        body: { action: 'test' }
      })

      await handler(mockReq as any, mockRes as any)

      expect(mockStatus).toHaveBeenCalledWith(503)
      expect(mockJson).toHaveBeenCalledWith({
        error: 'AI service not configured. Please provide a Gemini API key or set GEMINI_API_KEY in server environment.'
      })
    })

    it('returns 405 for non-POST methods', async () => {
      const handler = await getHandler()
      mockReq = createMockReq({ method: 'GET' })

      await handler(mockReq as any, mockRes as any)

      expect(mockStatus).toHaveBeenCalledWith(405)
      expect(mockJson).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })
  })
})