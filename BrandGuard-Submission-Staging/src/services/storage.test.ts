import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'

vi.mock('idb', () => {
  const stores = new Map<string, Map<string, unknown>>()

  // Map IndexedDB index names to actual object properties
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
      if (!store) {
        store = new Map()
        stores.set(storeName, store)
      }
      store.set(value.id, value)
    }),
    delete: vi.fn(async (storeName: string, id: string) => {
      const store = stores.get(storeName)
      if (store) store.delete(id)
    }),
    getAllFromIndex: vi.fn(async (storeName: string, indexName: string, query?: unknown) => {
      const prop = indexPropMap[indexName] || indexName
      const store = stores.get(storeName) || new Map()
      let results = Array.from(store.values())
      if (query !== undefined && prop) {
        results = results.filter((item: Record<string, unknown>) => item[prop] === query)
      }
      return results
    }),
    getFromIndex: vi.fn(async (storeName: string, indexName: string, query: unknown) => {
      const prop = indexPropMap[indexName] || indexName
      const store = stores.get(storeName) || new Map()
      return Array.from(store.values()).find((item: Record<string, unknown>) => item[prop] === query)
    }),
    transaction: vi.fn((storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames]
      const txStores: Map<string, Map<string, unknown>> = new Map()
      ;(names as string[]).forEach((name) => {
        if (!stores.has(name)) stores.set(name, new Map())
        txStores.set(name, stores.get(name) ?? new Map())
      })
      return {
        store: {
          put: (value: { id: string }) => {
            const store = txStores.get(names[0] as string) ?? new Map()
            store.set(value.id, value)
          },
          clear: () => {
            const store = txStores.get(names[0] as string) ?? new Map()
            store.clear()
          },
        },
        objectStore: (name: string) => ({
          put: (value: { id: string }) => {
            (txStores.get(name) ?? new Map()).set(value.id, value)
          },
          clear: () => {
            (txStores.get(name) ?? new Map()).clear()
          },
        }),
        done: Promise.resolve(),
      }
    }),
  })

  const openDB = vi.fn(async () => createMockDB())
  ;(openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores = stores
  return { openDB }
})

import { storage, generateId } from './storage/index'

const mockStores = (openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores

const makeGuideline = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'guideline-1',
  name: 'Test Guideline',
  description: 'A test guideline',
  category: 'tone' as const,
  rules: [
    {
      id: 'rule-1',
      title: 'Test Rule',
      description: 'A test rule',
      examples: { correct: ['good'], incorrect: ['bad'] },
      severity: 'medium' as const,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  ...overrides,
})

const makeSubmission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'submission-1',
  title: 'Test Submission',
  content: 'Test content',
  contentType: 'text' as const,
  selectedGuidelineIds: ['guideline-1'],
  status: 'draft' as const,
  submittedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const makeReview = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'review-1',
  submissionId: 'submission-1',
  guidelineIds: ['guideline-1'],
  findings: [],
  overallScore: 0,
  status: 'in_review' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const makeFinding = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'finding-1',
  reviewId: 'review-1',
  guidelineId: 'guideline-1',
  ruleId: 'rule-1',
  severity: 'medium' as const,
  location: { start: 0, end: 5, context: 'test' },
  explanation: 'Test explanation',
  suggestedCorrection: 'Test correction',
  guidelineReference: 'Test reference',
  status: 'pending' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

beforeEach(() => {
  mockStores.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('storage - guidelines', () => {
  it('should save and retrieve a guideline', async () => {
    const guideline = makeGuideline()
    await storage.saveGuideline(guideline)
    const retrieved = await storage.getGuideline(guideline.id)
    expect(retrieved).toEqual(guideline)
  })

  it('should return undefined for missing guideline', async () => {
    const result = await storage.getGuideline('non-existent')
    expect(result).toBeUndefined()
  })

  it('should get all guidelines', async () => {
    await storage.saveGuideline(makeGuideline({ id: 'g1' }))
    await storage.saveGuideline(makeGuideline({ id: 'g2' }))
    const guidelines = await storage.getGuidelines()
    expect(guidelines).toHaveLength(2)
  })

  it('should update an existing guideline', async () => {
    const guideline = makeGuideline()
    await storage.saveGuideline(guideline)
    await storage.saveGuideline({ ...guideline, name: 'Updated Name' })
    const retrieved = await storage.getGuideline(guideline.id)
    expect(retrieved?.name).toBe('Updated Name')
  })

  it('should delete a guideline', async () => {
    const guideline = makeGuideline()
    await storage.saveGuideline(guideline)
    await storage.deleteGuideline(guideline.id)
    const retrieved = await storage.getGuideline(guideline.id)
    expect(retrieved).toBeUndefined()
  })

})

describe('storage - submissions', () => {
  it('should save and retrieve a submission', async () => {
    const submission = makeSubmission()
    await storage.saveSubmission(submission)
    const retrieved = await storage.getSubmission(submission.id)
    expect(retrieved).toEqual(submission)
  })

  it('should return undefined for missing submission', async () => {
    const result = await storage.getSubmission('non-existent')
    expect(result).toBeUndefined()
  })

  it('should get all submissions', async () => {
    await storage.saveSubmission(makeSubmission({ id: 's1' }))
    await storage.saveSubmission(makeSubmission({ id: 's2' }))
    const submissions = await storage.getSubmissions()
    expect(submissions).toHaveLength(2)
  })

  it('should update a submission', async () => {
    const submission = makeSubmission()
    await storage.saveSubmission(submission)
    await storage.saveSubmission({ ...submission, status: 'in_review' })
    const retrieved = await storage.getSubmission(submission.id)
    expect(retrieved?.status).toBe('in_review')
  })

  it('should delete a submission', async () => {
    const submission = makeSubmission()
    await storage.saveSubmission(submission)
    await storage.deleteSubmission(submission.id)
    const retrieved = await storage.getSubmission(submission.id)
    expect(retrieved).toBeUndefined()
  })

})

describe('storage - reviews', () => {
  it('should save and retrieve a review', async () => {
    const review = makeReview()
    await storage.saveReview(review)
    const retrieved = await storage.getReview(review.id)
    expect(retrieved).toEqual(review)
  })

  it('should return undefined for missing review', async () => {
    const result = await storage.getReview('non-existent')
    expect(result).toBeUndefined()
  })

  it('should get all reviews', async () => {
    await storage.saveReview(makeReview({ id: 'r1' }))
    await storage.saveReview(makeReview({ id: 'r2' }))
    const reviews = await storage.getReviews()
    expect(reviews).toHaveLength(2)
  })

  it('should get review by submission ID', async () => {
    const review = makeReview({ submissionId: 'sub-1' })
    await storage.saveReview(review)
    const found = await storage.getReviewBySubmission('sub-1')
    expect(found?.id).toBe('review-1')
  })

  it('should return undefined for review by submission when none exists', async () => {
    const found = await storage.getReviewBySubmission('non-existent')
    expect(found).toBeUndefined()
  })

  it('should update a review', async () => {
    const review = makeReview()
    await storage.saveReview(review)
    await storage.saveReview({ ...review, status: 'approved' })
    const retrieved = await storage.getReview(review.id)
    expect(retrieved?.status).toBe('approved')
  })

  it('should delete a review', async () => {
    const review = makeReview()
    await storage.saveReview(review)
    await storage.deleteReview(review.id)
    const retrieved = await storage.getReview(review.id)
    expect(retrieved).toBeUndefined()
  })

})

describe('storage - findings', () => {
  it('should save and retrieve findings for a review', async () => {
    const finding = makeFinding()
    await storage.saveFinding(finding)
    const findings = await storage.getFindings('review-1')
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('finding-1')
  })

  it('should return empty array for review with no findings', async () => {
    const findings = await storage.getFindings('non-existent')
    expect(findings).toEqual([])
  })

  it('should save multiple findings at once', async () => {
    const findings = [
      makeFinding({ id: 'f1' }),
      makeFinding({ id: 'f2' }),
    ]
    await storage.saveFindings(findings)
    const retrieved = await storage.getFindings('review-1')
    expect(retrieved).toHaveLength(2)
  })

  it('should update finding status', async () => {
    const finding = makeFinding()
    await storage.saveFinding(finding)
    await storage.updateFindingStatus('finding-1', 'accepted')
    const updated = await storage.getFindings('review-1')
    expect(updated[0].status).toBe('accepted')
    expect(updated[0].resolvedAt).toBeDefined()
  })

  it('should update finding status to rejected', async () => {
    const finding = makeFinding()
    await storage.saveFinding(finding)
    await storage.updateFindingStatus('finding-1', 'rejected')
    const updated = await storage.getFindings('review-1')
    expect(updated[0].status).toBe('rejected')
  })

  it('should not throw when updating non-existent finding status', async () => {
    await expect(storage.updateFindingStatus('non-existent', 'accepted')).resolves.toBeUndefined()
  })

})

describe('storage - settings', () => {
  it('should return default settings when none saved', async () => {
    const settings = await storage.getSettings()
    expect(settings.geminiApiKey).toBe('')
    expect(settings.autoSave).toBe(true)
    expect(settings.theme).toBe('system')
  })

  it('should save and retrieve settings', async () => {
    await storage.saveSettings({ geminiApiKey: 'test-key', theme: 'dark' })
    const settings = await storage.getSettings()
    expect(settings.geminiApiKey).toBe('test-key')
    expect(settings.theme).toBe('dark')
    expect(settings.autoSave).toBe(true)
  })

  it('should merge settings when partially updating', async () => {
    await storage.saveSettings({ geminiApiKey: 'key-1' })
    await storage.saveSettings({ theme: 'light' })
    const settings = await storage.getSettings()
    expect(settings.geminiApiKey).toBe('key-1')
    expect(settings.theme).toBe('light')
  })
})

describe('storage - clearAllData', () => {
  it('should clear all data stores except settings', async () => {
    await storage.saveGuideline(makeGuideline())
    await storage.saveSubmission(makeSubmission())
    await storage.saveReview(makeReview())
    await storage.saveFinding(makeFinding())

    await storage.clearAllData()

    expect(await storage.getGuidelines()).toHaveLength(0)
    expect(await storage.getSubmissions()).toHaveLength(0)
    expect(await storage.getReviews()).toHaveLength(0)
    expect(await storage.getFindings('review-1')).toHaveLength(0)
  })

  it('should preserve settings after clearAllData', async () => {
    await storage.saveSettings({ geminiApiKey: 'preserved-key' })
    await storage.clearAllData()
    const settings = await storage.getSettings()
    expect(settings.geminiApiKey).toBe('preserved-key')
  })
})

describe('storage - generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/\d+-.*/)
    expect(id2).toMatch(/\d+-.*/)
  })
})
