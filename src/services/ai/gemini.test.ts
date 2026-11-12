import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { geminiService } from './gemini'

// Store original fetch
const originalFetch = global.fetch

describe('FrontendGeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    geminiService.resetForTesting()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('initialize', () => {
    it('should configure the service', () => {
      geminiService.initialize()
      expect(geminiService.isConfigured()).toBe(true)
    })

    it('should report not configured before initialization', () => {
      // Create a fresh service instance by not calling initialize
      // Since we can't reset the singleton, this test runs first in the describe block
      // and beforeEach doesn't call initialize anymore
      expect(geminiService.isConfigured()).toBe(false)
    })
  })

  describe('testConnection', () => {
    it('should return success when API responds with ok status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Connection successful' })
      })
      geminiService.initialize()

      const result = await geminiService.testConnection()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Connection successful')
      expect(global.fetch).toHaveBeenCalledWith('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      })
    })

    it('should return error for invalid API key from API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid API key' })
      })
      geminiService.initialize()

      const result = await geminiService.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid API key')
    })

    it('should return error for network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network fetch failed'))
      geminiService.initialize()

      const result = await geminiService.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Network error - check your connection')
    })

    it('should return error when not configured', async () => {
      // Don't call initialize - service should be unconfigured
      const result = await geminiService.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Gemini API not configured')
    })
  })

  describe('reviewContent', () => {
    const defaultGuidelines = [
      {
        id: 'g1',
        name: 'Brand Voice',
        description: 'Maintain professional tone',
        category: 'tone' as const,
        rules: [
          {
            id: 'r1',
            title: 'Avoid passive voice',
            description: 'Use active voice',
            examples: { correct: ['We build solutions'], incorrect: ['Solutions are built'] },
            severity: 'high' as const,
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        isActive: true,
      },
    ]

    it('should parse a valid API response', async () => {
      const mockResponse = {
        findings: [
          {
            guidelineId: 'g1',
            ruleId: 'r1',
            severity: 'high',
            location: { start: 0, end: 10, context: 'test content' },
            explanation: 'Uses passive voice',
            suggestedCorrection: 'Use active voice',
            guidelineReference: 'Brand Voice rule 1',
          },
        ],
        overallScore: 85,
        summary: 'Good content overall',
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })
      geminiService.initialize()

      const result = await geminiService.reviewContent({
        content: 'test content',
        guidelines: defaultGuidelines,
        contentType: 'text',
      })

      expect(result.overallScore).toBe(85)
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].severity).toBe('high')
      expect(result.summary).toBe('Good content overall')
      expect(global.fetch).toHaveBeenCalledWith('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          content: 'test content',
          guidelines: defaultGuidelines,
          contentType: 'text'
        })
      })
    })

    it('should clamp overallScore to 0-100 range', async () => {
      const mockResponse = {
        findings: [],
        overallScore: 150,
        summary: 'test',
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })
      geminiService.initialize()

      const result = await geminiService.reviewContent({
        content: 'test',
        guidelines: [],
        contentType: 'text',
      })

      expect(result.overallScore).toBe(100)
    })

    it('should clamp negative overallScore to 0', async () => {
      const mockResponse = {
        findings: [],
        overallScore: -10,
        summary: 'test',
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })
      geminiService.initialize()

      const result = await geminiService.reviewContent({
        content: 'test',
        guidelines: [],
        contentType: 'text',
      })

      expect(result.overallScore).toBe(0)
    })

    it('should normalize invalid severity to medium', async () => {
      const mockResponse = {
        findings: [
          {
            guidelineId: 'g1',
            ruleId: 'r1',
            severity: 'invalid',
            location: { start: 0, end: 5, context: 'test' },
            explanation: 'test',
            suggestedCorrection: 'fix',
            guidelineReference: 'ref',
          },
        ],
        overallScore: 50,
        summary: 'test',
      }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      })
      geminiService.initialize()

      const result = await geminiService.reviewContent({
        content: 'test',
        guidelines: defaultGuidelines,
        contentType: 'text',
      })

      expect(result.findings[0].severity).toBe('medium')
    })

    it('should throw on API error response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Rate limited' })
      })
      geminiService.initialize()

      await expect(
        geminiService.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Rate limited')
    })

    it('should throw on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      geminiService.initialize()

      await expect(
        geminiService.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Network error')
    })

    it('should throw when not configured', async () => {
      // Don't call initialize - service should be unconfigured
      await expect(
        geminiService.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Gemini API not configured')
    })
  })
})