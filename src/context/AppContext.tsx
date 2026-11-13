import { useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { AppContext } from './useApp'
import { storage, generateId } from '@/services/storage'
import { demoStorage } from '@/services/storage/demo'
import { DEMO_GUIDELINES, DEMO_SUBMISSIONS, DEMO_REVIEWS, DEMO_FINDINGS, DEMO_EVENTS, DEMO_CONFLICTS } from '@/services/storage/demo-data'
import { geminiService } from '@/services/ai/gemini'
import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, UserSettings, AppState, Toast, NavItem, ReviewEvent, ReviewConflict } from '@/types'

const DEMO_SETTINGS: UserSettings = { geminiApiKey: '', defaultGuidelineIds: [], autoSave: true, theme: 'system' }

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    guidelines: [], submissions: [], reviews: [],
    settings: { geminiApiKey: '', defaultGuidelineIds: [], autoSave: true, theme: 'system' },
    currentView: 'dashboard'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  // User-provided Gemini API key (BYOK) - kept in memory only, never persisted
  const [userGeminiApiKey, setUserGeminiApiKey] = useState<string | null>(null)

  // Route all storage calls through the demo DB when in demo mode, otherwise the normal DB.
  // Demo and normal data live in separate IndexedDB databases and never mix.
  const activeStorage = useMemo(() => (isDemoMode ? demoStorage : storage), [isDemoMode])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration ?? 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [guidelines, submissions, reviews, settings] = await Promise.all([
        activeStorage.getGuidelines(), activeStorage.getSubmissions(), activeStorage.getReviews(), activeStorage.getSettings()
      ])
      // Ensure conflicts array exists on all reviews (migration for existing data)
      const reviewsWithConflicts = reviews.map(r => ({ ...r, conflicts: r.conflicts || [] }))
      setState(prev => ({ ...prev, guidelines, submissions, reviews: reviewsWithConflicts, settings }))
      // Initialize Gemini service with user-provided key (BYOK) if set, otherwise server-side
      geminiService.initialize(userGeminiApiKey ?? undefined)
    } catch (error) { console.error('Failed to load data:', error) }
    finally { setIsLoading(false) }
  }, [activeStorage, userGeminiApiKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  // --- Demo mode controls ---

  const switchToDemo = useCallback(async () => {
    setIsLoading(true)
    try {
      const existing = await demoStorage.getGuidelines()
      // Seed demo data only when the demo DB is empty (preserves user's demo edits across sessions)
      if (existing.length === 0) {
        await demoStorage.importAllData({
          guidelines: DEMO_GUIDELINES,
          submissions: DEMO_SUBMISSIONS,
          reviews: DEMO_REVIEWS,
          findings: DEMO_FINDINGS,
          events: DEMO_EVENTS,
          conflicts: DEMO_CONFLICTS,
          settings: DEMO_SETTINGS,
          exportedAt: new Date().toISOString(),
          version: 1
        })
      }
      const [guidelines, submissions, reviews, settings] = await Promise.all([
        demoStorage.getGuidelines(), demoStorage.getSubmissions(), demoStorage.getReviews(), demoStorage.getSettings()
      ])
      setState(prev => ({ ...prev, guidelines, submissions, reviews: reviews.map(r => ({ ...r, conflicts: r.conflicts || [] })), settings, currentView: 'dashboard' }))
      setIsDemoMode(true)
    } catch (error) {
      console.error('[switchToDemo] Failed to switch to demo:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Loads normal workspace data exclusively from the normal `storage` adapter
  // (never `activeStorage`, which may still point to demoStorage during a mode switch).
  // Errors are not swallowed here: they propagate to `switchToNormal`, which only
  // flips `isDemoMode` to false after a successful load.
  const loadNormalData = useCallback(async () => {
    const [guidelines, submissions, reviews, settings] = await Promise.all([
      storage.getGuidelines(), storage.getSubmissions(), storage.getReviews(), storage.getSettings()
    ])
    const reviewsWithConflicts = reviews.map(r => ({ ...r, conflicts: r.conflicts || [] }))
    setState(prev => ({ ...prev, guidelines, submissions, reviews: reviewsWithConflicts, settings }))
    geminiService.initialize(userGeminiApiKey ?? undefined)
  }, [storage, userGeminiApiKey])

  const switchToNormal = useCallback(async () => {
    setIsLoading(true)
    try {
      await loadNormalData()
      // Only switch modes after normal data has loaded successfully, so a failed
      // load never leaves the app in normal mode with demo data still in state.
      setIsDemoMode(false)
    } catch (error) {
      console.error('Failed to switch to normal:', error)
    } finally {
      setIsLoading(false)
    }
  }, [loadNormalData])

  const resetDemo = useCallback(async () => {
    setIsLoading(true)
    try {
      // Never touch normal user data: clearDemoData only clears demo stores.
      await demoStorage.clearDemoData()
      await switchToDemo()
    } catch (error) {
      console.error('Failed to reset demo:', error)
    } finally {
      setIsLoading(false)
    }
  }, [switchToDemo])

  const createGuideline = useCallback(async (data: Omit<BrandGuideline, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const guideline: BrandGuideline = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    await activeStorage.saveGuideline(guideline)
    setState(prev => ({ ...prev, guidelines: [...prev.guidelines, guideline] }))
    return guideline
  }, [activeStorage])

  const updateGuideline = useCallback(async (id: string, data: Partial<BrandGuideline>) => {
    const guideline = state.guidelines.find(g => g.id === id)
    if (!guideline) return
    const updated = { ...guideline, ...data, updatedAt: new Date().toISOString() }
    await activeStorage.saveGuideline(updated)
    setState(prev => ({ ...prev, guidelines: prev.guidelines.map(g => g.id === id ? updated : g) }))
  }, [activeStorage, state.guidelines])

  const deleteGuideline = useCallback(async (id: string) => {
    await activeStorage.deleteGuideline(id)
    setState(prev => ({ ...prev, guidelines: prev.guidelines.filter(g => g.id !== id) }))
  }, [activeStorage])

  const toggleGuidelineActive = useCallback(async (id: string) => {
    const guideline = state.guidelines.find(g => g.id === id)
    if (!guideline) return
    await updateGuideline(id, { isActive: !guideline.isActive })
  }, [activeStorage, state.guidelines, updateGuideline])

  const createSubmission = useCallback(async (data: Omit<ContentSubmission, 'id' | 'submittedAt' | 'updatedAt' | 'status' | 'reviewId'>) => {
    const now = new Date().toISOString()
    const submission: ContentSubmission = { ...data, id: generateId(), status: 'draft', submittedAt: now, updatedAt: now }
    await activeStorage.saveSubmission(submission)
    setState(prev => ({ ...prev, submissions: [submission, ...prev.submissions] }))
    return submission
  }, [activeStorage])

  const updateSubmission = useCallback(async (id: string, data: Partial<ContentSubmission>) => {
    const submission = state.submissions.find(s => s.id === id)
    if (!submission) return
    const updated = { ...submission, ...data, updatedAt: new Date().toISOString() }
    await activeStorage.saveSubmission(updated)
    setState(prev => ({ ...prev, submissions: prev.submissions.map(s => s.id === id ? updated : s) }))
  }, [activeStorage, state.submissions])

  const deleteSubmission = useCallback(async (id: string) => {
    await activeStorage.deleteSubmission(id)
    setState(prev => ({ ...prev, submissions: prev.submissions.filter(s => s.id !== id) }))
  }, [activeStorage])

  // Event/Audit Trail functions - defined before startReview so they can be used
  const recordEvent = useCallback(async (event: Omit<ReviewEvent, 'id'>) => {
    const fullEvent: ReviewEvent = { ...event, id: generateId() }
    await activeStorage.saveEvent(fullEvent)
    setState(prev => ({
      ...prev,
      reviews: prev.reviews.map(review =>
        review.id === event.reviewId
          ? { ...review, events: [...(review.events || []), fullEvent], updatedAt: new Date().toISOString() }
          : review
      )
    }))
  }, [activeStorage])

  const getEvents = useCallback(async (reviewId: string): Promise<ReviewEvent[]> => {
    return activeStorage.getEvents(reviewId)
  }, [activeStorage])

  // Update conflict status
  const updateConflict = useCallback(async (conflictId: string, status: ReviewConflict['status'], resolution?: string) => {
    const now = new Date().toISOString()
    const review = state.reviews.find(r => r.conflicts?.some(c => c.id === conflictId))
    if (!review) return

    const conflict = review.conflicts!.find(c => c.id === conflictId)
    if (!conflict) return

    const updatedConflict: ReviewConflict = {
      ...conflict,
      status,
      resolution,
      resolvedAt: now
    }

    await activeStorage.saveConflict(updatedConflict)

    // Update the review's conflicts array
    const updatedReview: Review = {
      ...review,
      conflicts: review.conflicts!.map(c => c.id === conflictId ? updatedConflict : c),
      updatedAt: now
    }
    await activeStorage.saveReview(updatedReview)
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === review.id ? updatedReview : r) }))
  }, [activeStorage, state.reviews])

  // Update finding with edited correction
  const updateFindingWithEdit = useCallback(async (findingId: string, editedCorrection: string, reviewerComment?: string) => {
    const now = new Date().toISOString()
    // Find the review and finding first
    const review = state.reviews.find(r => r.findings.some(f => f.id === findingId))
    if (!review) return
    const finding = review.findings.find(f => f.id === findingId)
    if (!finding) return

    const updated = { ...finding, editedCorrection, reviewerComment: reviewerComment ?? finding.reviewerComment }
    await activeStorage.saveFinding(updated)
    await recordEvent({
      reviewId: review.id,
      type: 'suggestion_edited',
      findingId,
      previousValue: finding.suggestedCorrection,
      newValue: editedCorrection,
      reviewerId: 'local-user',
      timestamp: now
    })
    setState(prev => ({
      ...prev,
      reviews: prev.reviews.map(r => r.id === review.id ? {
        ...r,
        findings: r.findings.map(f => f.id === findingId ? { ...f, editedCorrection, reviewerComment: reviewerComment ?? f.reviewerComment } : f)
      } : r)
    }))
  }, [activeStorage, state.reviews, recordEvent])

  // Add reviewer comment to finding
  const addReviewerComment = useCallback(async (findingId: string, comment: string) => {
    const now = new Date().toISOString()
    const review = state.reviews.find(r => r.findings.some(f => f.id === findingId))
    if (review) {
      const finding = review.findings.find(f => f.id === findingId)
      if (finding) {
        const updated = { ...finding, reviewerComment: comment }
        await activeStorage.saveFinding(updated)
        await recordEvent({
          reviewId: review.id,
          type: 'comment_added',
          findingId,
          previousValue: finding.reviewerComment || '',
          newValue: comment,
          reviewerId: 'local-user',
          timestamp: now
        })
        setState(prev => ({
          ...prev,
          reviews: prev.reviews.map(r => r.id === review.id ? {
            ...r,
            findings: r.findings.map(f => f.id === findingId ? { ...f, reviewerComment: comment } : f)
          } : r)
        }))
      }
    }
  }, [activeStorage, state.reviews, recordEvent])

  // Update finding status with event recording
  const updateFindingStatus = useCallback(async (findingId: string, status: ReviewFinding['status']) => {
    await activeStorage.updateFindingStatus(findingId, status)
    const now = new Date().toISOString()
    const review = state.reviews.find(r => r.findings.some(f => f.id === findingId))
    if (review) {
      const finding = review.findings.find(f => f.id === findingId)
      if (finding) {
        const eventType = status === 'accepted' ? 'suggestion_accepted' : 'suggestion_rejected'
        await recordEvent({
          reviewId: review.id,
          type: eventType,
          findingId,
          previousValue: finding.suggestedCorrection,
          newValue: status,
          reviewerId: 'local-user',
          timestamp: now
        })
      }
    }
    setState(prev => ({ ...prev, reviews: prev.reviews.map(review => ({ ...review, findings: review.findings.map(f => f.id === findingId ? { ...f, status, resolvedAt: new Date().toISOString() } : f) })) }))
  }, [activeStorage, state.reviews, recordEvent])

  // Accept all findings and create revised content
  const acceptAllFindings = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return

    const submission = state.submissions.find(s => s.id === review.submissionId)
    if (!submission) return

    // Get findings that are accepted or pending (will be accepted)
    const toAccept = review.findings
      .filter(f => (f.status === 'accepted' || f.status === 'pending') && f.location)
      .sort((a, b) => (a.location?.start || 0) - (b.location?.start || 0))

    // Detect conflicts: overlapping findings with different corrections
    const conflicts: ReviewConflict[] = []
    for (let i = 0; i < toAccept.length; i++) {
      for (let j = i + 1; j < toAccept.length; j++) {
        const a = toAccept[i]
        const b = toAccept[j]
        const aEnd = a.location?.end || 0
        const bStart = b.location?.start || 0

        if (bStart < aEnd) {
          // Overlap detected
          const correctionA = a.editedCorrection || a.suggestedCorrection
          const correctionB = b.editedCorrection || b.suggestedCorrection
          const isCorrectionMismatch = correctionA !== correctionB

          if (isCorrectionMismatch) {
            // Conflict: overlapping findings with different corrections
            const conflictStart = Math.min(a.location?.start || 0, b.location?.start || 0)
            const conflictEnd = Math.max(aEnd, b.location?.end || 0)
            const contextStart = Math.max(0, conflictStart - 20)
            const contextEnd = Math.min(submission.content.length, conflictEnd + 20)
            conflicts.push({
              id: generateId(),
              reviewId,
              findingIds: [a.id, b.id],
              conflictType: 'overlap',
              location: {
                start: conflictStart,
                end: conflictEnd,
                context: submission.content.substring(contextStart, contextEnd)
              },
              status: 'unresolved',
              createdAt: new Date().toISOString()
            })
          }
        }
      }
    }

    const now = new Date().toISOString()

    // If there are unresolved conflicts, don't create revised content and don't mark all as accepted
    if (conflicts.length > 0) {
      // Save conflicts
      await activeStorage.saveConflicts(conflicts)

      // Update review with conflicts, but don't change finding statuses or create revised content
      const updatedReview: Review = {
        ...review,
        conflicts: [...(review.conflicts || []), ...conflicts],
        updatedAt: now
      }
      await activeStorage.saveReview(updatedReview)
      setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
      return
    }

    // No conflicts: proceed with accepting all and creating revised content
    // Merge overlapping findings with the SAME correction (union of ranges, keep first correction)
    const mergedFindings: ReviewFinding[] = []
    for (const finding of toAccept) {
      const lastMerged = mergedFindings[mergedFindings.length - 1]
      if (lastMerged && finding.location && lastMerged.location) {
        const lastEnd = lastMerged.location.end
        const currentStart = finding.location.start
        const lastCorrection = lastMerged.editedCorrection || lastMerged.suggestedCorrection
        const currentCorrection = finding.editedCorrection || finding.suggestedCorrection

        if (currentStart < lastEnd && lastCorrection === currentCorrection) {
          // Overlapping with SAME correction: merge ranges (union), keep first correction
          lastMerged.location = {
            ...lastMerged.location,
            end: Math.max(lastEnd, finding.location.end)
          }
          continue
        }
      }
      mergedFindings.push({ ...finding })
    }

    // Build revised content by applying merged corrections in DESCENDING order
    const revisedContent = mergedFindings
      .slice()
      .sort((a, b) => (b.location?.start || 0) - (a.location?.start || 0))
      .reduce((content, finding) => {
        const correction = finding.editedCorrection || finding.suggestedCorrection
        // Validate offset bounds
        const start = Math.max(0, Math.min(finding.location?.start || 0, content.length))
        const end = Math.max(start, Math.min(finding.location?.end || 0, content.length))
        return content.slice(0, start) + correction + content.slice(end)
      }, submission.content)

    // Update all pending findings to accepted
    for (const finding of review.findings) {
      if (finding.status === 'pending') {
        await activeStorage.updateFindingStatus(finding.id, 'accepted')
        await recordEvent({
          reviewId,
          type: 'suggestion_accepted',
          findingId: finding.id,
          previousValue: finding.suggestedCorrection,
          newValue: finding.editedCorrection || finding.suggestedCorrection,
          reviewerId: 'local-user',
          timestamp: new Date().toISOString()
        })
      }
    }

    const updatedReview: Review = {
      ...review,
      findings: review.findings.map(f => f.status === 'pending' ? { ...f, status: 'accepted' as const, resolvedAt: now } : f),
      revisedContent,
      conflicts: [...(review.conflicts || [])], // Preserve any existing resolved conflicts
      updatedAt: now,
      status: 'changes_requested' // Still needs human approval after accepting all
    }
    await activeStorage.saveReview(updatedReview)
    await updateSubmission(review.submissionId, { revisedContent, status: 'changes_requested' })
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
  }, [activeStorage, state.reviews, state.submissions, recordEvent, updateSubmission])

  const initializeGemini = useCallback(() => { geminiService.initialize(userGeminiApiKey ?? undefined) }, [userGeminiApiKey])

  const clearUserGeminiApiKey = useCallback(() => {
    setUserGeminiApiKey(null)
    geminiService.setUserApiKey(null)
  }, [])

  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    const updated = await activeStorage.saveSettings(settings)
    setState(prev => ({ ...prev, settings: updated }))
    return updated
  }, [activeStorage])

  const startReview = useCallback(async (submissionId: string) => {
    const submission = state.submissions.find(s => s.id === submissionId)
    if (!submission) throw new Error('Submission not found')
    const guidelines = state.guidelines.filter(g => submission.selectedGuidelineIds.includes(g.id) && g.isActive)
    if (guidelines.length === 0) throw new Error('No active guidelines selected for review')
    await updateSubmission(submissionId, { status: 'in_review' })
    const now = new Date().toISOString()
    const review: Review = { id: generateId(), submissionId, guidelineIds: guidelines.map(g => g.id), findings: [], conflicts: [], overallScore: 0, status: 'in_review', createdAt: now, updatedAt: now, events: [] }
    await activeStorage.saveReview(review)
    setState(prev => ({ ...prev, reviews: [review, ...prev.reviews] }))
    try {
      const aiResponse = await geminiService.reviewContent({ content: submission.content, guidelines, contentType: submission.contentType })
      const findings: ReviewFinding[] = aiResponse.findings.map((f) => ({ id: generateId(), reviewId: review.id, guidelineId: f.guidelineId, ruleId: f.ruleId, severity: f.severity, location: f.location, explanation: f.explanation, suggestedCorrection: f.suggestedCorrection, guidelineReference: f.guidelineReference, status: 'pending' as const, createdAt: new Date().toISOString() }))
      await activeStorage.saveFindings(findings)
      // Record AI review completed event
      await recordEvent({
        reviewId: review.id,
        type: 'ai_review_completed',
        previousValue: '',
        newValue: `Found ${findings.length} issues, score: ${aiResponse.overallScore}`,
        reviewerId: 'ai-system',
        timestamp: new Date().toISOString()
      })
      const completedReview: Review = { ...review, findings, overallScore: aiResponse.overallScore, status: findings.length > 0 ? 'changes_requested' : 'approved', updatedAt: new Date().toISOString(), completedAt: new Date().toISOString(), events: [] }
      await activeStorage.saveReview(completedReview)
      await updateSubmission(submissionId, { status: findings.length > 0 ? 'changes_requested' : 'approved', reviewId: review.id })
      setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === review.id ? completedReview : r) }))
      return completedReview
    } catch (error) {
      console.error('Review failed:', error)
      // Reset submission to draft so it can be retried; don't leave it stuck in in_review
      await updateSubmission(submissionId, { status: 'draft' })
      const failedReview: Review = { ...review, status: 'changes_requested', error: error instanceof Error ? error.message : String(error), updatedAt: new Date().toISOString(), events: [] }
      await activeStorage.saveReview(failedReview)
      setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === review.id ? failedReview : r) }))
      throw error
    }
  }, [activeStorage, state.submissions, state.guidelines, updateSubmission, recordEvent])

  const approveReview = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return

    // P0 Safety: Reject approval if any conflict has status 'unresolved'
    // This is enforced in business logic, not just UI
    const hasUnresolvedConflicts = review.conflicts?.some(c => c.status === 'unresolved') ?? false
    if (hasUnresolvedConflicts) {
      // Record the blocked approval attempt for audit trail
      await recordEvent({
        reviewId,
        type: 'review_approval_blocked',
        previousValue: review.status,
        newValue: 'blocked_unresolved_conflicts',
        reviewerId: 'local-user',
        timestamp: new Date().toISOString()
      })
      // Throw to prevent silent failure - callers must handle this
      throw new Error('Cannot approve review: unresolved conflicts exist. Resolve all conflicts before approving.')
    }

    const now = new Date().toISOString()
    const updatedReview: Review = { ...review, status: 'approved', updatedAt: now, completedAt: now, approvedBy: 'current-user', approvedAt: now }
    await activeStorage.saveReview(updatedReview)
    await updateSubmission(review.submissionId, { status: 'approved' })
    await recordEvent({
      reviewId,
      type: 'review_approved',
      previousValue: review.status,
      newValue: 'approved',
      reviewerId: 'local-user',
      timestamp: now
    })
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
  }, [activeStorage, state.reviews, updateSubmission, recordEvent])

  const requestChanges = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return
    const now = new Date().toISOString()
    const updatedReview: Review = { ...review, status: 'changes_requested', updatedAt: now }
    await activeStorage.saveReview(updatedReview)
    await updateSubmission(review.submissionId, { status: 'changes_requested' })
    await recordEvent({
      reviewId,
      type: 'review_rejected',
      previousValue: review.status,
      newValue: 'changes_requested',
      reviewerId: 'local-user',
      timestamp: now
    })
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
  }, [activeStorage, state.reviews, updateSubmission, recordEvent])

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Guidelines', href: '/guidelines', icon: 'BookOpen' },
    { label: 'Submit Content', href: '/submit', icon: 'FileText' },
    { label: 'Reviews', href: '/reviews', icon: 'ClipboardCheck', badge: state.reviews.filter(r => r.status === 'in_review' || r.status === 'changes_requested').length },
    { label: 'History', href: '/history', icon: 'History' },
    { label: 'Governance', href: '/governance', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' }
  ]

  const setCurrentView = useCallback((view: AppState['currentView']) => { setState(prev => ({ ...prev, currentView: view })) }, [])

  return <AppContext.Provider value={{ ...state, isLoading, isDemoMode, toasts, addToast, removeToast, createGuideline, updateGuideline, deleteGuideline, toggleGuidelineActive, createSubmission, updateSubmission, deleteSubmission, startReview, approveReview, requestChanges, updateFindingStatus, acceptAllFindings, updateFindingWithEdit, addReviewerComment, recordEvent, getEvents, updateConflict, updateSettings, initializeGemini, setCurrentView, navItems, switchToDemo, switchToNormal, resetDemo, userGeminiApiKey, setUserGeminiApiKey, clearUserGeminiApiKey }}>{children}</AppContext.Provider>
}
