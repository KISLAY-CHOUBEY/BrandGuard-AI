import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { AppProvider } from './AppContext'
import { useApp } from './useApp'
import { storage } from '@/services/storage'
import { geminiService } from '@/services/ai/gemini'
import { openDB } from 'idb'

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
const mockDeleteGuideline = vi.spyOn(storage, 'deleteGuideline')
const mockSaveGuideline = vi.spyOn(storage, 'saveGuideline')
const mockUpdateFindingStatus = vi.spyOn(storage, 'updateFindingStatus')
const mockSaveSettings = vi.spyOn(storage, 'saveSettings')
const mockReviewContent = vi.spyOn(geminiService, 'reviewContent')
const mockInitialize = vi.spyOn(geminiService, 'initialize')

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
  overallScore: 0,
  status: 'changes_requested',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('AppContext - review flow bug fix', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    vi.clearAllMocks()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map([['sub-1', defaultSubmission]]))
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize('test-key')
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

  it('should update settings and initialize Gemini', async () => {
    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await act(async () => {
      await result.current.updateSettings({ geminiApiKey: 'new-key' })
    })

    expect(mockSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ geminiApiKey: 'new-key' })
    )
    expect(mockInitialize).toHaveBeenCalledWith('new-key')
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

    const { result } = renderHook(() => useTestContext(), { wrapper })

    await act(async () => {})
    expect(result.current.isLoading).toBe(false)

    await expect(
      act(async () => {
        await result.current.startReview('sub-1')
      })
    ).rejects.toThrow('No active guidelines selected for review')
  })
})

describe('AppContext - guideline CRUD', () => {
  beforeEach(async () => {
    mockReviewContent.mockReset()
    vi.clearAllMocks()
    mockStores.clear()

    mockStores.set('guidelines', new Map([['g1', defaultGuidelines[0]]]))
    mockStores.set('submissions', new Map())
    mockStores.set('reviews', new Map())
    mockStores.set('settings', new Map())
    mockStores.set('findings', new Map())

    mockReviewContent.mockResolvedValue(defaultAiResponse)
    geminiService.initialize('test-key')
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
})
