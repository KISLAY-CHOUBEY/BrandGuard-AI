import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { storage } from '@/services/storage'
import { geminiService } from '@/services/ai/gemini'
import { openDB } from 'idb'
import type { ReviewFinding, ReviewConflict } from '@/types'

vi.mock('idb', () => {
  const stores = new Map<string, Map<string, unknown>>()
  const indexPropMap: Record<string, string | null> = {
    'by-submission': 'submissionId',
    'by-review': 'reviewId',
    'by-category': 'category',
    'by-active': 'isActive',
    'by-status': 'status',
    'by-guideline': 'guidelineId',
    'by-date': null,
  }
  const createMockDB = () => ({
    getAll: vi.fn(async (storeName: string) => {
      const store = stores.get(storeName) || new Map()
      return Array.from(store.values())
    }),
    get: vi.fn(async (storeName: string, id: string) => {
      const store = stores.get(storeName) || new Map()
      return store.get(id)
    }),
    put: vi.fn(async (storeName: string, value: { id: string }) => {
      let store = stores.get(storeName)
      if (!store) { store = new Map(); stores.set(storeName, store) }
      store.set(value.id, value)
    }),
    delete: vi.fn(async (storeName: string, id: string) => {
      const store = stores.get(storeName)
      if (store) store.delete(id)
    }),
    getAllFromIndex: vi.fn(async (_storeName: string, indexName: string, query?: unknown) => {
      const prop = indexPropMap[indexName] || indexName
      const store = stores.get(_storeName) || new Map()
      let results = Array.from(store.values())
      if (query !== undefined && prop) {
        results = results.filter((item: Record<string, unknown>) => item[prop] === query)
      }
      return results
    }),
    getFromIndex: vi.fn(async (_storeName: string, indexName: string, query: unknown) => {
      const prop = indexPropMap[indexName] || indexName
      const store = stores.get(_storeName) || new Map()
      return Array.from(store.values()).find((item: Record<string, unknown>) => item[prop] === query)
    }),
    transaction: vi.fn(() => {
      return {
        store: { put: vi.fn(), clear: vi.fn() },
        objectStore: vi.fn(() => ({ put: vi.fn(), clear: vi.fn() })),
        done: Promise.resolve(),
      }
    }),
  })
  const openDB = vi.fn(async () => createMockDB())
  ;(openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores = stores
  return { openDB }
})

const mockStores = (openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores

// Spies on real module exports (same instances used by AppContext)
const mockSaveSubmission = vi.spyOn(storage, 'saveSubmission')
const mockSaveReview = vi.spyOn(storage, 'saveReview')
const mockSaveConflict = vi.spyOn(storage, 'saveConflict')
const mockSaveFinding = vi.spyOn(storage, 'saveFinding')
const mockDeleteGuideline = vi.spyOn(storage, 'deleteGuideline')
const mockSaveGuideline = vi.spyOn(storage, 'saveGuideline')
const mockUpdateFindingStatus = vi.spyOn(storage, 'updateFindingStatus')
const mockSaveSettings = vi.spyOn(storage, 'saveSettings')
const mockReviewContent = vi.spyOn(geminiService, 'reviewContent')
const mockInitialize = vi.spyOn(geminiService, 'initialize')
const mockSaveEvent = vi.spyOn(storage, 'saveEvent')

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)

function useTestContext() {
  return useApp()
}

const defaultSubmission = {
  id: 'sub-1',
  title: 'Test Submission',
  content: 'Test content for review',
  contentType: 'text' as const,
  selectedGuidelineIds: ['g1'],
  status: 'draft' as const,
  submittedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const defaultGuidelines = [
  {
    id: 'g1',
    name: 'Test Guideline',
    description: 'A test guideline',
    category: 'tone' as const,
    rules: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isActive: true,
  },
]

const defaultAiResponse = {
  findings: [
    {
      guidelineId: 'g1',
      ruleId: 'r1',
      severity: 'medium' as const,
      location: { start: 0, end: 5, context: 'test' },
      explanation: 'Test finding',
      suggestedCorrection: 'Fix this',
      guidelineReference: 'Test guideline rule 1',
    },
  ],
  overallScore: 80,
  summary: 'Test summary',
}

const reviewWithFindings = {
  id: 'review-1',
  submissionId: 'sub-1',
  guidelineIds: ['g1'],
  findings: [
    { id: 'f1', status: 'pending' },
    { id: 'f2', status: 'pending' },
  ],
  conflicts: [],
  overallScore: 0,
  status: 'changes_requested',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('AppContext - review flow bug fix', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    // Don't use vi.clearAllMocks() as it clears the idb mock implementations
    mockSaveSubmission.mockClear()
    mockSaveReview.mockClear()
    mockSaveConflict.mockClear()
    mockDeleteGuideline.mockClear()
    mockSaveGuideline.mockClear()
    mockUpdateFindingStatus.mockClear()
    mockSaveSettings.mockClear()
    mockReviewContent.mockClear()
    mockInitialize.mockClear()
    mockSaveEvent.mockClear()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map([['sub-1', defaultSubmission]]))
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize()
  })

  it('should successfully complete a review and update submission status', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      const review = await result.current.startReview('sub-1')
      expect(review.status).toBe('changes_requested')
      expect(review.findings).toHaveLength(1)
      expect(review.overallScore).toBe(80)
      expect(mockReviewContent).toHaveBeenCalledTimes(1)
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'changes_requested',
      })
    )
  })

  it('should reset submission to draft when Gemini API fails (bug fix)', async () => {
    mockReviewContent.mockRejectedValue(new Error('Gemini API error'))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    let reviewError: Error | null = null
    try {
      await act(async () => {
        await result.current.startReview('sub-1')
      })
    } catch (e) {
      reviewError = e as Error
    }
    expect(reviewError?.message).toContain('Gemini API error')

    const submission = result.current.submissions.find(s => s.id === 'sub-1')
    expect(submission?.status).toBe('draft')

    expect(mockSaveReview.mock.calls.length).toBe(2)
    expect(mockSaveReview.mock.calls[1][0].status).toBe('changes_requested')
  })

  it('should allow retry after a failed review', async () => {
    mockReviewContent
      .mockRejectedValueOnce(new Error('Gemini API error'))
      .mockResolvedValueOnce(defaultAiResponse)

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})

    let reviewError: Error | null = null
    try {
      await act(async () => {
        await result.current.startReview('sub-1')
      })
    } catch (e) {
      reviewError = e as Error
    }
    expect(reviewError?.message).toContain('Gemini API error')

    const submissionAfterFailure = result.current.submissions.find(s => s.id === 'sub-1')
    expect(submissionAfterFailure?.status).toBe('draft')

    await act(async () => {
      const review = await result.current.startReview('sub-1')
      expect(review.status).toBe('changes_requested')
    })

    const submissionAfterRetry = result.current.submissions.find(s => s.id === 'sub-1')
    expect(submissionAfterRetry?.status).toBe('changes_requested')

    // Also verify via storage spy that saveSubmission was called with changes_requested
    const submissionCalls = mockSaveSubmission.mock.calls.filter(
      call => (call[0] as { id?: string })?.id === 'sub-1'
    )
    expect(submissionCalls.length).toBeGreaterThan(0)
    expect(submissionCalls[submissionCalls.length - 1][0].status).toBe('changes_requested')
  })

  it('should approve a review and update submission to approved', async () => {
    mockStores.set('reviews', new Map([['review-1', reviewWithFindings]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.approveReview('review-1')
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'approved',
      })
    )
  })

  it('should request changes and update submission to changes_requested', async () => {
    mockStores.set('reviews', new Map([['review-1', reviewWithFindings]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.requestChanges('review-1')
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'changes_requested',
      })
    )
  })

  it('should create a guideline and save to storage', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    const newGuideline = {
      name: 'New Guideline',
      description: 'A new guideline',
      category: 'tone' as const,
      rules: [],
      isActive: true,
    }

    await act(async () => {
      const guideline = await result.current.createGuideline(newGuideline)
      expect(guideline.id).toBeDefined()
      expect(guideline.name).toBe('New Guideline')
    })

    expect(mockSaveGuideline).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Guideline',
      })
    )
  })

  it('should update a guideline', async () => {
    const existingGuideline = { ...defaultGuidelines[0] }
    mockStores.set('guidelines', new Map([['g1', existingGuideline]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.updateGuideline('g1', { name: 'Updated Name' })
    })

    expect(mockSaveGuideline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'g1',
        name: 'Updated Name',
      })
    )
  })

  it('should delete a guideline', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.deleteGuideline('g1')
    })

    expect(mockDeleteGuideline).toHaveBeenCalledWith('g1')
  })

  it('should create a submission with draft status', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      const submission = await result.current.createSubmission({
        title: 'New Submission',
        content: 'Content',
        contentType: 'text',
        selectedGuidelineIds: ['g1'],
      })
      expect(submission.status).toBe('draft')
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
      })
    )
  })

  it('should update finding status', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.updateFindingStatus('finding-1', 'accepted')
    })

    expect(mockUpdateFindingStatus).toHaveBeenCalledWith('finding-1', 'accepted')
  })

  it('should accept all findings for a review', async () => {
    mockStores.set('reviews', new Map([['review-1', reviewWithFindings]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.acceptAllFindings('review-1')
    })

    expect(mockUpdateFindingStatus).toHaveBeenCalledWith('f1', 'accepted')
    expect(mockUpdateFindingStatus).toHaveBeenCalledWith('f2', 'accepted')
  })

  describe('acceptAllFindings - overlap handling', () => {
    const setupOverlapTest = async (content: string, findings: Partial<ReviewFinding>[]) => {
      const submissionId = 'sub-overlap'
      const reviewId = 'review-overlap'
      const guidelineId = 'g1'

      const submission = {
        id: submissionId,
        title: 'Overlap Test',
        content,
        contentType: 'text' as const,
        selectedGuidelineIds: [guidelineId],
        status: 'in_review' as const,
        submittedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }

      const review = {
        id: reviewId,
        submissionId,
        guidelineIds: [guidelineId],
        findings: findings.map((f, i) => ({
          ...f,
          id: f.id || `f${i + 1}`,
          reviewId,
          guidelineId,
          ruleId: `r${i + 1}`,
          severity: 'medium' as const,
          explanation: 'Test',
          suggestedCorrection: f.suggestedCorrection || f.editedCorrection || 'Fix',
          guidelineReference: 'Test',
          status: f.status || 'pending',
          createdAt: '2026-01-01T00:00:00.000Z',
        })),
        overallScore: 0,
        status: 'changes_requested' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }

      mockStores.set('submissions', new Map([[submissionId, submission]]))
      mockStores.set('reviews', new Map([[reviewId, review]]))
      mockStores.set('findings', new Map(findings.map(f => [f.id || '', f])))

      const { result } = renderHook(() => useTestContext(), { wrapper })
      await act(async () => {})
      return { result, reviewId }
    }

    it('should handle non-overlapping findings correctly', async () => {
      const content = 'AAAA BBBB CCCC DDDD'
      const findings = [
        { id: 'f1', location: { start: 0, end: 4, context: 'AAAA' }, status: 'pending' as const, suggestedCorrection: 'XXXX' },
        { id: 'f2', location: { start: 5, end: 9, context: 'BBBB' }, status: 'pending' as const, suggestedCorrection: 'YYYY' },
        { id: 'f3', location: { start: 10, end: 14, context: 'CCCC' }, status: 'pending' as const, suggestedCorrection: 'ZZZZ' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      expect(updatedReview?.revisedContent).toBe('XXXX YYYY ZZZZ DDDD')
    })

    it('should create conflict when overlapping findings have different corrections', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Overlapping with DIFFERENT corrections should create a conflict
      // No revisedContent should be created, findings should NOT be marked as accepted
      expect(updatedReview?.revisedContent).toBeUndefined()
      expect(updatedReview?.conflicts).toHaveLength(1)
      expect(updatedReview?.conflicts?.[0].conflictType).toBe('overlap')
      expect(updatedReview?.conflicts?.[0].findingIds).toEqual(['f1', 'f2'])
      // Findings should remain pending (not accepted) due to conflict
      expect(updatedReview?.findings[0].status).toBe('pending')
      expect(updatedReview?.findings[1].status).toBe('pending')
    })

    it('should handle adjacent findings (touching boundaries)', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 5, end: 10, context: 'FGHIJ' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Adjacent (end === start) - should NOT merge, apply both
      expect(updatedReview?.revisedContent).toBe('XXXXXYYYYY')
    })

    it('should merge overlapping findings with SAME correction silently', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' }, // Same correction
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Overlapping with SAME correction should merge silently (no conflict)
      // Content[0:8] = 'ABCDEFGH' replaced with 'XXXXX' -> 'XXXXX' + 'IJ'
      expect(updatedReview?.revisedContent).toBe('XXXXXIJ')
      expect(updatedReview?.conflicts).toHaveLength(0)
      expect(updatedReview?.findings[0].status).toBe('accepted')
      expect(updatedReview?.findings[1].status).toBe('accepted')
    })

    it('should create conflict when mixed status findings overlap with different corrections', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'accepted' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Overlapping with DIFFERENT corrections should create a conflict
      // No revisedContent should be created
      expect(updatedReview?.revisedContent).toBeUndefined()
      expect(updatedReview?.conflicts).toHaveLength(1)
      expect(updatedReview?.conflicts?.[0].conflictType).toBe('overlap')
      expect(updatedReview?.conflicts?.[0].findingIds).toEqual(['f1', 'f2'])
    })

    it('should create conflicts for multiple overlapping findings with different corrections', async () => {
      const content = 'ABCDEFGHIJKLMNO'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
        { id: 'f3', location: { start: 6, end: 11, context: 'GHIJK' }, status: 'pending' as const, suggestedCorrection: 'ZZZZZ' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // All three overlap with different corrections: f1-f2 overlap, f2-f3 overlap
      // Should create two conflicts
      expect(updatedReview?.revisedContent).toBeUndefined()
      expect(updatedReview?.conflicts).toHaveLength(2)
      // Conflicts between f1-f2 and f2-f3
      const findingIdPairs = updatedReview?.conflicts?.map(c => c.findingIds.sort()).sort()
      expect(findingIdPairs).toEqual([['f1', 'f2'], ['f2', 'f3']])
    })

    it('should ignore rejected findings', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 5, end: 10, context: 'FGHIJ' }, status: 'rejected' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Only pending/accepted included
      expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJ')
    })

    it('should handle findings without location', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: undefined, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Finding without location is ignored
      expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJ')
    })

    it('should apply corrections in descending order to avoid offset shifts', async () => {
      const content = 'AAAA BBBB CCCC'
      const findings = [
        { id: 'f1', location: { start: 0, end: 4, context: 'AAAA' }, status: 'pending' as const, suggestedCorrection: 'XX' }, // shorter
        { id: 'f2', location: { start: 5, end: 9, context: 'BBBB' }, status: 'pending' as const, suggestedCorrection: 'YYYYYYYY' }, // longer
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Applying in descending order ensures f2's position isn't affected by f1's change
      expect(updatedReview?.revisedContent).toBe('XX YYYYYYYY CCCC')
    })

    it('should not create conflicts when overlapping findings have same correction', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' }, // Same correction
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Overlapping with SAME correction should merge silently (no conflict)
      expect(updatedReview?.revisedContent).toBe('XXXXXIJ')
      expect(updatedReview?.conflicts).toHaveLength(0)
      expect(updatedReview?.findings[0].status).toBe('accepted')
      expect(updatedReview?.findings[1].status).toBe('accepted')
    })

    it('should not mark findings as accepted when conflicts exist', async () => {
      const content = 'ABCDEFGHIJ'
      const findings = [
        { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
        { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      ]

      const { result, reviewId } = await setupOverlapTest(content, findings)
      await act(async () => {
        await result.current.acceptAllFindings(reviewId)
      })

      const updatedReview = result.current.reviews.find(r => r.id === reviewId)
      // Findings should remain pending due to conflict
      expect(updatedReview?.findings[0].status).toBe('pending')
      expect(updatedReview?.findings[1].status).toBe('pending')
      // Review status should not be approved
      expect(updatedReview?.status).not.toBe('approved')
    })

  })
})

describe('approveReview - P0 Safety: unresolved conflicts block approval', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    vi.clearAllMocks()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map([['sub-1', defaultSubmission]]))
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())
    mockStores.set('conflicts', new Map())
    mockStores.set('events', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize()
  })

  it('should reject approval when review has unresolved conflicts (direct call)', async () => {
    const conflictId = 'conflict-1'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }
    const reviewWithUnresolvedConflict = { ...reviewWithFindings, conflicts: [conflict] }

    mockStores.set('reviews', new Map([[reviewId, reviewWithUnresolvedConflict]]))
    mockStores.set('conflicts', new Map([[conflictId, conflict]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Direct call to approveReview should throw
    await expect(
      act(async () => {
        await result.current.approveReview(reviewId)
      })
    ).rejects.toThrow('Cannot approve review: unresolved conflicts exist')

    // Submission status should NOT be updated to approved
    const submissionCalls = mockSaveSubmission.mock.calls.filter(
      call => (call[0] as { id?: string })?.id === 'sub-1'
    )
    expect(submissionCalls.length).toBe(0)

    // Review status should NOT be updated to approved
    expect(mockSaveReview).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    )
  })

  it('should reject approval when review has multiple unresolved conflicts', async () => {
    const conflictId1 = 'conflict-1'
    const conflictId2 = 'conflict-2'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict1 = { id: conflictId1, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }
    const conflict2 = { id: conflictId2, reviewId, findingIds: ['f2', 'f3'], conflictType: 'overlap' as const, location: { start: 5, end: 15, context: 'test context 2' }, status: 'unresolved' as const, createdAt: now }
    const reviewWithMultipleConflicts = { ...reviewWithFindings, conflicts: [conflict1, conflict2] }

    mockStores.set('reviews', new Map([[reviewId, reviewWithMultipleConflicts]]))
    mockStores.set('conflicts', new Map([[conflictId1, conflict1], [conflictId2, conflict2]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Direct call to approveReview should throw
    await expect(
      act(async () => {
        await result.current.approveReview(reviewId)
      })
    ).rejects.toThrow('Cannot approve review: unresolved conflicts exist')
  })

  it('should allow approval after all conflicts are resolved', async () => {
    const conflictId = 'conflict-1'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'resolved_keep_first' as const, createdAt: now, resolvedAt: now, resolution: 'keep_first' }
    const reviewWithResolvedConflict = { ...reviewWithFindings, conflicts: [conflict] }

    mockStores.set('reviews', new Map([[reviewId, reviewWithResolvedConflict]]))
    mockStores.set('conflicts', new Map([[conflictId, conflict]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Approve should succeed
    await act(async () => {
      await result.current.approveReview(reviewId)
    })

    // Submission status should be updated to approved
    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'approved',
      })
    )

    // Review status should be updated to approved
    expect(mockSaveReview).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    )
  })

  it('should allow approval when review has no conflicts array', async () => {
    const reviewId = 'review-1'
    const reviewWithoutConflicts = { ...reviewWithFindings } // No conflicts property

    mockStores.set('reviews', new Map([[reviewId, reviewWithoutConflicts]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Approve should succeed (no conflicts = no block)
    await act(async () => {
      await result.current.approveReview(reviewId)
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'approved',
      })
    )
  })

  it('should allow approval when review has empty conflicts array', async () => {
    const reviewId = 'review-1'
    const reviewWithEmptyConflicts = { ...reviewWithFindings, conflicts: [] }

    mockStores.set('reviews', new Map([[reviewId, reviewWithEmptyConflicts]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Approve should succeed (empty conflicts = no block)
    await act(async () => {
      await result.current.approveReview(reviewId)
    })

    expect(mockSaveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sub-1',
        status: 'approved',
      })
    )
  })

  it('should record approval_blocked event when approval is rejected', async () => {
    const conflictId = 'conflict-1'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }
    const reviewWithUnresolvedConflict = { ...reviewWithFindings, conflicts: [conflict] }

    mockStores.set('reviews', new Map([[reviewId, reviewWithUnresolvedConflict]]))
    mockStores.set('conflicts', new Map([[conflictId, conflict]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    // Attempt approval - should throw
    await expect(
      act(async () => {
        await result.current.approveReview(reviewId)
      })
    ).rejects.toThrow('Cannot approve review: unresolved conflicts exist')

    // Verify audit event was recorded and persisted
    expect(mockSaveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId,
        type: 'review_approval_blocked',
        previousValue: 'changes_requested',
        newValue: 'blocked_unresolved_conflicts',
        reviewerId: 'local-user',
      })
    )

    // Verify review and submission remain unapproved
    const submissionCalls = mockSaveSubmission.mock.calls.filter(
      call => (call[0] as { id?: string })?.id === 'sub-1'
    )
    expect(submissionCalls.length).toBe(0)

    expect(mockSaveReview).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    )
  })
})

describe('updateConflict', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    vi.clearAllMocks()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map([['sub-1', defaultSubmission]]))
    mockStores.set('reviews', new Map([['review-1', reviewWithFindings]]))
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())
    mockStores.set('conflicts', new Map())
    mockStores.set('events', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize()
  })

  it('should update conflict status to resolved_keep_first and persist to storage', async () => {
    const conflictId = 'conflict-1'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }

    mockStores.set('conflicts', new Map([[conflictId, conflict]]))
    // Also add conflict to the review's conflicts array
    mockStores.set('reviews', new Map([['review-1', { ...reviewWithFindings, conflicts: [conflict] }]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.updateConflict(conflictId, 'resolved_keep_first')
    })

    expect(mockSaveConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        id: conflictId,
        status: 'resolved_keep_first',
        resolvedAt: expect.any(String)
      })
    )

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    const updatedConflict = updatedReview?.conflicts?.find(c => c.id === conflictId)
    expect(updatedConflict?.status).toBe('resolved_keep_first')
  })

  it('should update conflict status to resolved_keep_second and persist to storage', async () => {
    const conflictId = 'conflict-2'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }

    mockStores.set('conflicts', new Map([[conflictId, conflict]]))
    mockStores.set('reviews', new Map([['review-1', { ...reviewWithFindings, conflicts: [conflict] }]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.updateConflict(conflictId, 'resolved_keep_second')
    })

    expect(mockSaveConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        id: conflictId,
        status: 'resolved_keep_second',
        resolvedAt: expect.any(String)
      })
    )

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    const updatedConflict = updatedReview?.conflicts?.find(c => c.id === conflictId)
    expect(updatedConflict?.status).toBe('resolved_keep_second')
  })

  it('should update conflict status to resolved_custom with custom resolution text', async () => {
    const conflictId = 'conflict-3'
    const reviewId = 'review-1'
    const now = new Date().toISOString()

    const conflict = { id: conflictId, reviewId, findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 10, context: 'test context' }, status: 'unresolved' as const, createdAt: now }

    mockStores.set('conflicts', new Map([[conflictId, conflict]]))
    mockStores.set('reviews', new Map([['review-1', { ...reviewWithFindings, conflicts: [conflict] }]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})

    await act(async () => {
      await result.current.updateConflict(conflictId, 'resolved_custom', 'CUSTOM')
    })

    expect(mockSaveConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        id: conflictId,
        status: 'resolved_custom',
        resolution: 'CUSTOM',
        resolvedAt: expect.any(String)
      })
    )

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    const updatedConflict = updatedReview?.conflicts?.find(c => c.id === conflictId)
    expect(updatedConflict?.status).toBe('resolved_custom')
    expect(updatedConflict?.resolution).toBe('CUSTOM')
  })

  it('should not throw when updating non-existent conflict', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})

    await expect(
      act(async () => {
        await result.current.updateConflict('non-existent', 'resolved_keep_first')
      })
    ).resolves.toBeUndefined()
  })

  it('should not throw when updating conflict in non-existent review', async () => {
    // Add a conflict to a review that doesn't exist in state
    const conflictId = 'orphan-conflict'
    mockStores.set('conflicts', new Map([[
      conflictId,
      { id: conflictId, reviewId: 'non-existent-review', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 5, context: 'test' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    await act(async () => {})

    await expect(
      act(async () => {
        await result.current.updateConflict(conflictId, 'resolved_keep_first')
      })
    ).resolves.toBeUndefined()
  })
})

describe('Conflict Resolution - Actual Output Verification', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    // Don't use vi.clearAllMocks() as it clears the idb mock implementations
    // Instead reset individual spies
    mockSaveSubmission.mockClear()
    mockSaveReview.mockClear()
    mockSaveConflict.mockClear()
    mockSaveFinding.mockClear()
    mockDeleteGuideline.mockClear()
    mockSaveGuideline.mockClear()
    mockUpdateFindingStatus.mockClear()
    mockSaveSettings.mockClear()
    mockReviewContent.mockClear()
    mockInitialize.mockClear()
    mockSaveEvent.mockClear()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map())
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())
    mockStores.set('conflicts', new Map())
    mockStores.set('events', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize()
  })

  const setupConflictReview = async (content: string, findings: Partial<ReviewFinding>[], conflicts: any[]) => {
    const submissionId = 'sub-conflict-test'
    const reviewId = 'review-conflict-test'
    const guidelineId = 'g1'

    const submission = {
      id: submissionId,
      title: 'Conflict Test',
      content,
      contentType: 'text' as const,
      selectedGuidelineIds: [guidelineId],
      status: 'in_review' as const,
      submittedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const review = {
      id: reviewId,
      submissionId,
      guidelineIds: [guidelineId],
      findings: findings.map((f, i) => ({
        ...f,
        id: f.id || `f${i + 1}`,
        reviewId,
        guidelineId,
        ruleId: `r${i + 1}`,
        severity: 'medium' as const,
        explanation: 'Test finding',
        suggestedCorrection: f.suggestedCorrection || f.editedCorrection || 'Fix',
        guidelineReference: 'Test',
        status: f.status || 'pending',
        createdAt: '2026-01-01T00:00:00.000Z',
      })),
      conflicts: conflicts,
      overallScore: 0,
      status: 'changes_requested' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      events: [],
    }

    mockStores.set('submissions', new Map([[submissionId, submission]]))
    mockStores.set('reviews', new Map([[reviewId, review]]))
    mockStores.set('findings', new Map(findings.map((f, i) => [f.id || `f${i + 1}`, f])))
    mockStores.set('conflicts', new Map(conflicts.map(c => [c.id, c])))

    const { result } = renderHook(() => useTestContext(), { wrapper })
    // Wait for AppContext to finish loading data
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    return { result, reviewId, submissionId }
  }

  it('Keep First: should apply first finding correction and reject second', async () => {
    const content = 'ABCDEFGHIJ'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Resolve conflict: Keep First
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_keep_first', 'XXXXX')
    })

    // Update finding statuses as ConflictsTab would do
    await act(async () => {
      await result.current.updateFindingStatus('f1', 'accepted')
      await result.current.updateFindingStatus('f2', 'rejected')
    })

    // Now accept all to generate revised content
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    // Keep First: f1 correction 'XXXXX' applied at 0-5, f2 rejected
    // Original: ABCDEFGHIJ, f1 at 0-5 -> XXXXX, remaining FGHIJ
    // But f2 was at 3-8 (DEFGH) and is rejected, so no change from f2
    // Result: XXXXXFGHIJ
    expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJ')
  })

  it('Keep Second: should apply second finding correction and reject first', async () => {
    const content = 'ABCDEFGHIJ'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Resolve conflict: Keep Second
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_keep_second', 'YYYYY')
    })

    // Update finding statuses as ConflictsTab would do
    await act(async () => {
      await result.current.updateFindingStatus('f1', 'rejected')
      await result.current.updateFindingStatus('f2', 'accepted')
    })

    // Now accept all to generate revised content
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    // Keep Second: f1 rejected, f2 correction 'YYYYY' applied at 3-8
    // Original: ABCDEFGHIJ, f2 at 3-8 -> ABC + YYYYY + IJ
    expect(updatedReview?.revisedContent).toBe('ABCYYYYYIJ')
  })

  it('Custom: should apply custom correction to accepted finding', async () => {
    const content = 'ABCDEFGHIJ'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Resolve conflict: Custom correction
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_custom', 'CUSTOM_FIX')
    })

    // Update finding with custom correction and statuses as ConflictsTab would do
    await act(async () => {
      await result.current.updateFindingWithEdit('f1', 'CUSTOM_FIX')
      await result.current.updateFindingStatus('f1', 'accepted')
      await result.current.updateFindingStatus('f2', 'rejected')
    })

    // Now accept all to generate revised content
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    // Custom: f1 gets custom correction 'CUSTOM_FIX' at 0-5, f2 rejected
    expect(updatedReview?.revisedContent).toBe('CUSTOM_FIXFGHIJ')
  })

  it('Multiple independent conflicts: each resolved independently', async () => {
    const content = 'ABCDEFGHIJKLMNO'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
      { id: 'f3', location: { start: 9, end: 14, context: 'KLMNO' }, status: 'pending' as const, suggestedCorrection: 'ZZZZZ' },
      { id: 'f4', location: { start: 12, end: 17, context: 'NOPQR' }, status: 'pending' as const, suggestedCorrection: 'QQQQQ' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'conflict-2', reviewId: 'review-conflict-test', findingIds: ['f3', 'f4'], conflictType: 'overlap' as const, location: { start: 9, end: 17, context: 'KLMNOPQR' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Resolve first conflict: Keep First
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_keep_first', 'XXXXX')
    })
    await act(async () => {
      await result.current.updateFindingStatus('f1', 'accepted')
      await result.current.updateFindingStatus('f2', 'rejected')
    })

    // Resolve second conflict: Keep Second
    await act(async () => {
      await result.current.updateConflict('conflict-2', 'resolved_keep_second', 'QQQQQ')
    })
    await act(async () => {
      await result.current.updateFindingStatus('f3', 'rejected')
      await result.current.updateFindingStatus('f4', 'accepted')
    })

    // Now accept all to generate revised content
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    // Conflict 1: Keep First -> f1 'XXXXX' at 0-5
    // Conflict 2: Keep Second -> f4 'QQQQQ' at 12-17
    // Original: ABCDEFGHIJKLMNO
    // f1 at 0-5 -> XXXXX, remaining FGHIJKLMNO
    // f4 at 12-17 (relative to original) -> but after f1 change, positions shift
    // Since corrections applied in descending order:
    // f4 at 12-17: KLMNO -> QQQQQ (wait, f4 is at 12-17 which is NOPQR in original)
    // f1 at 0-5: ABCDE -> XXXXX
    // Applying f4 first (descending): position 12-17 -> QQQQQ
    // Then f1 at 0-5 -> XXXXX
    // Result: XXXXXFGHIJKLQQQQQ (but original only goes to O at 14)
    // Let me recalculate: original length 15 (0-14)
    // f3 at 9-14 (KLMNO), f4 at 12-17 (but original only 0-14, so 12-14 = NO)
    // Actually f4 location is 12-17 but content is only 15 chars (0-14)
    // The bounds checking in acceptAllFindings clamps to content.length
    // So f4 at 12-15 (NOP) -> QQQQQ
    // f1 at 0-5 (ABCDE) -> XXXXX
    // Descending: f4 first (12), then f1 (0)
    // Start: ABCDEFGHIJKLMNO
    // After f4 (12-15 NOP -> QQQQQ): ABCDEFGHIJKLQQQQQ
    // After f1 (0-5 ABCDE -> XXXXX): XXXXXFGHIJKLQQQQQ
    expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJKLQQQQQ')
  })

  it('Reload after resolution: should persist conflict resolution and approval', async () => {
    const content = 'ABCDEFGHIJ'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Debug: check what storage returns
    const reviewsFromStorage = await storage.getReviews()
    console.log('Reviews from storage:', reviewsFromStorage.map(r => ({ id: r.id, conflicts: r.conflicts?.map(c => c.status) })))

    // Resolve conflict: Keep First
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_keep_first', 'XXXXX')
    })
    await act(async () => {
      await result.current.updateFindingStatus('f1', 'accepted')
      await result.current.updateFindingStatus('f2', 'rejected')
    })

    // Verify conflict is resolved in state
    let updatedReview = result.current.reviews.find(r => r.id === reviewId)
    expect(updatedReview?.conflicts?.[0].status).toBe('resolved_keep_first')

    // Now accept all to generate revised content
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    updatedReview = result.current.reviews.find(r => r.id === reviewId)
    expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJ')

    // Verify approval now works (no unresolved conflicts)
    await act(async () => {
      await result.current.approveReview(reviewId)
    })

    const approvedReview = result.current.reviews.find(r => r.id === reviewId)
    expect(approvedReview?.status).toBe('approved')
  })

  it('Rejected corrections are NOT applied, accepted corrections applied exactly once', async () => {
    const content = 'ABCDEFGHIJ'
    const findings = [
      { id: 'f1', location: { start: 0, end: 5, context: 'ABCDE' }, status: 'pending' as const, suggestedCorrection: 'XXXXX' },
      { id: 'f2', location: { start: 3, end: 8, context: 'DEFGH' }, status: 'pending' as const, suggestedCorrection: 'YYYYY' },
    ]
    const conflicts = [
      { id: 'conflict-1', reviewId: 'review-conflict-test', findingIds: ['f1', 'f2'], conflictType: 'overlap' as const, location: { start: 0, end: 8, context: 'ABCDEFGH' }, status: 'unresolved' as const, createdAt: '2026-01-01T00:00:00.000Z' }
    ]

    const { result, reviewId, submissionId } = await setupConflictReview(content, findings, conflicts)

    // Resolve: Keep First (f1 accepted, f2 rejected)
    await act(async () => {
      await result.current.updateConflict('conflict-1', 'resolved_keep_first', 'XXXXX')
    })
    await act(async () => {
      await result.current.updateFindingStatus('f1', 'accepted')
      await result.current.updateFindingStatus('f2', 'rejected')
    })

    // acceptAllFindings should only apply f1 correction
    await act(async () => {
      await result.current.acceptAllFindings(reviewId)
    })

    const updatedReview = result.current.reviews.find(r => r.id === reviewId)
    // f1 correction 'XXXXX' at 0-5 applied once
    // f2 is rejected, its correction 'YYYYY' should NOT appear
    expect(updatedReview?.revisedContent).toBe('XXXXXFGHIJ')
    expect(updatedReview?.revisedContent).not.toContain('YYYYY')
  })
})

describe('AppContext - guideline CRUD', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    // vi.clearAllMocks() - removed because it clears idb mock implementations
    mockSaveReview.mockClear()
    mockSaveFinding.mockClear()
    mockSaveConflict.mockClear()
    mockSaveEvent.mockClear()
    mockSaveSettings.mockClear()
    mockSaveSubmission.mockClear()
    mockSaveGuideline.mockClear()
    mockInitialize.mockClear()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map())
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize()
    // Flush any pending promises from initialization
    await act(async () => {})
  })

  it('should throw when starting review for non-existent submission', async () => {
    mockStores.set('submissions', new Map())

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await expect(
      act(async () => {
        await result.current.startReview('non-existent')
      })
    ).rejects.toThrow('Submission not found')
  })

  it('should throw when starting review with no active guidelines', async () => {
    mockStores.set('guidelines', new Map([
      ['g1', { ...defaultGuidelines[0], isActive: false }],
    ]))
    mockStores.set('submissions', new Map([['sub-1', defaultSubmission]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await expect(
      act(async () => {
        await result.current.startReview('sub-1')
      })
    ).rejects.toThrow('No active guidelines selected for review')
  })

  it('should toggle guideline active status', async () => {
    const guideline = { ...defaultGuidelines[0], isActive: true }
    mockStores.set('guidelines', new Map([['g1', guideline]]))

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.toggleGuidelineActive('g1')
    })

    expect(mockSaveGuideline).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'g1',
        isActive: false,
      })
    )
  })

  it('should update settings and initialize Gemini', async () => {
    // Explicitly set up submissions store (matches pattern from passing test)
    mockStores.set('submissions', new Map())

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.updateSettings({ geminiApiKey: 'new-key' })
    })

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ geminiApiKey: 'new-key' })
    )
    expect(mockInitialize).toHaveBeenCalledWith()
  })
})
