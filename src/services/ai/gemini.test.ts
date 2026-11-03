import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GeminiReviewService } from './gemini'

// Mock @google/generative-ai
const mocks = vi.hoisted(() => {
  const mockGenerateContent = vi.fn()
  const mockGetGenerativeModel = vi.fn(() => ({ generateContent: mockGenerateContent }))
  const mockGoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }))
  return { mockGenerateContent, mockGetGenerativeModel, mockGoogleGenerativeAI }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mocks.mockGoogleGenerativeAI,
}))

describe('GeminiReviewService', () => {
  let service: GeminiReviewService

  beforeEach(() => {
    service = new GeminiReviewService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialize', () => {
    it('should configure the service with an API key', () => {
      service.initialize('test-api-key')
      expect(service.isConfigured()).toBe(true)
      expect(mocks.mockGoogleGenerativeAI).toHaveBeenCalledWith('test-api-key')
    })

    it('should report not configured before initialization', () => {
      expect(service.isConfigured()).toBe(false)
    })
  })

  describe('testConnection', () => {
    it('should return success when API responds with ok status', async () => {
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => '{"status": "ok"}' } })
      service.initialize('test-api-key')

      const result = await service.testConnection()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Connection successful')
    })

    it('should return error for invalid API key', async () => {
      mocks.mockGenerateContent.mockRejectedValueOnce(new Error('API_KEY_INVALID'))
      service.initialize('bad-key')

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid API key')
    })

    it('should return error for rate limiting', async () => {
      mocks.mockGenerateContent.mockRejectedValueOnce(new Error('quota exceeded'))
      service.initialize('test-api-key')

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Rate limited - please try again later')
    })

    it('should return error for network failure', async () => {
      mocks.mockGenerateContent.mockRejectedValueOnce(new Error('network fetch failed'))
      service.initialize('test-api-key')

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Network error - check your connection')
    })

    it('should return error when not configured', async () => {
      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Gemini API not configured')
    })

    it('should return error for empty response', async () => {
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => '' } })
      service.initialize('test-api-key')

      const result = await service.testConnection()

      expect(result.success).toBe(false)
      expect(result.message).toBe('Empty response from Gemini')
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

    it('should parse a valid Gemini response', async () => {
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
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockResponse) } })
      service.initialize('test-api-key')

      const result = await service.reviewContent({
        content: 'test content',
        guidelines: defaultGuidelines,
        contentType: 'text',
      })

      expect(result.overallScore).toBe(85)
      expect(result.findings).toHaveLength(1)
      expect(result.findings[0].severity).toBe('high')
      expect(result.summary).toBe('Good content overall')
    })

    it('should clamp overallScore to 0-100 range', async () => {
      const mockResponse = {
        findings: [],
        overallScore: 150,
        summary: 'test',
      }
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockResponse) } })
      service.initialize('test-api-key')

      const result = await service.reviewContent({
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
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockResponse) } })
      service.initialize('test-api-key')

      const result = await service.reviewContent({
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
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify(mockResponse) } })
      service.initialize('test-api-key')

      const result = await service.reviewContent({
        content: 'test',
        guidelines: defaultGuidelines,
        contentType: 'text',
      })

      expect(result.findings[0].severity).toBe('medium')
    })

    it('should throw on empty response from Gemini', async () => {
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => '' } })
      service.initialize('test-api-key')

      await expect(
        service.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Empty response from Gemini')
    })

    it('should throw on invalid JSON response', async () => {
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => 'not json' } })
      service.initialize('test-api-key')

      await expect(
        service.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Failed to parse Gemini response as JSON')
    })

    it('should throw on missing findings array', async () => {
      mocks.mockGenerateContent.mockResolvedValueOnce({ response: { text: () => JSON.stringify({ overallScore: 50, summary: 'test' }) } })
      service.initialize('test-api-key')

      await expect(
        service.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Invalid response: missing findings')
    })

    it('should throw when not configured', async () => {
      await expect(
        service.reviewContent({ content: 'test', guidelines: [], contentType: 'text' })
      ).rejects.toThrow('Gemini API not configured')
    })
  })
})
