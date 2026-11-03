import { useState, useEffect, useCallback, ReactNode } from 'react'
import { AppContext } from './useApp'
import { storage, generateId } from '@/services/storage'
import { geminiService } from '@/services/ai/gemini'
import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, UserSettings, AppState, Toast, NavItem } from '@/types'

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    guidelines: [], submissions: [], reviews: [],
    settings: { geminiApiKey: '', defaultGuidelineIds: [], autoSave: true, theme: 'system' },
    currentView: 'dashboard'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), toast.duration ?? 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    async function loadData() {
      try {
        const [guidelines, submissions, reviews, settings] = await Promise.all([
          storage.getGuidelines(), storage.getSubmissions(), storage.getReviews(), storage.getSettings()
        ])
        setState(prev => ({ ...prev, guidelines, submissions, reviews, settings }))
        if (settings.geminiApiKey) geminiService.initialize(settings.geminiApiKey)
      } catch (error) { console.error('Failed to load data:', error) }
      finally { setIsLoading(false) }
    }
    loadData()
  }, [])

  const createGuideline = useCallback(async (data: Omit<BrandGuideline, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString()
    const guideline: BrandGuideline = { ...data, id: generateId(), createdAt: now, updatedAt: now }
    await storage.saveGuideline(guideline)
    setState(prev => ({ ...prev, guidelines: [...prev.guidelines, guideline] }))
    return guideline
  }, [])

  const updateGuideline = useCallback(async (id: string, data: Partial<BrandGuideline>) => {
    const guideline = state.guidelines.find(g => g.id === id)
    if (!guideline) return
    const updated = { ...guideline, ...data, updatedAt: new Date().toISOString() }
    await storage.saveGuideline(updated)
    setState(prev => ({ ...prev, guidelines: prev.guidelines.map(g => g.id === id ? updated : g) }))
  }, [state.guidelines])

  const deleteGuideline = useCallback(async (id: string) => {
    await storage.deleteGuideline(id)
    setState(prev => ({ ...prev, guidelines: prev.guidelines.filter(g => g.id !== id) }))
  }, [])

  const toggleGuidelineActive = useCallback(async (id: string) => {
    const guideline = state.guidelines.find(g => g.id === id)
    if (!guideline) return
    await updateGuideline(id, { isActive: !guideline.isActive })
  }, [state.guidelines, updateGuideline])

  const createSubmission = useCallback(async (data: Omit<ContentSubmission, 'id' | 'submittedAt' | 'updatedAt' | 'status' | 'reviewId'>) => {
    const now = new Date().toISOString()
    const submission: ContentSubmission = { ...data, id: generateId(), status: 'draft', submittedAt: now, updatedAt: now }
    await storage.saveSubmission(submission)
    setState(prev => ({ ...prev, submissions: [submission, ...prev.submissions] }))
    return submission
  }, [])

  const updateSubmission = useCallback(async (id: string, data: Partial<ContentSubmission>) => {
    const submission = state.submissions.find(s => s.id === id)
    if (!submission) return
    const updated = { ...submission, ...data, updatedAt: new Date().toISOString() }
    await storage.saveSubmission(updated)
    setState(prev => ({ ...prev, submissions: prev.submissions.map(s => s.id === id ? updated : s) }))
  }, [state.submissions])

  const deleteSubmission = useCallback(async (id: string) => {
    await storage.deleteSubmission(id)
    setState(prev => ({ ...prev, submissions: prev.submissions.filter(s => s.id !== id) }))
  }, [])

  const startReview = useCallback(async (submissionId: string) => {
    const submission = state.submissions.find(s => s.id === submissionId)
    if (!submission) throw new Error('Submission not found')
    const guidelines = state.guidelines.filter(g => submission.selectedGuidelineIds.includes(g.id) && g.isActive)
    if (guidelines.length === 0) throw new Error('No active guidelines selected for review')
    await updateSubmission(submissionId, { status: 'in_review' })
    const now = new Date().toISOString()
    const review: Review = { id: generateId(), submissionId, guidelineIds: guidelines.map(g => g.id), findings: [], overallScore: 0, status: 'in_review', createdAt: now, updatedAt: now }
    await storage.saveReview(review)
    setState(prev => ({ ...prev, reviews: [review, ...prev.reviews] }))
    try {
      const aiResponse = await geminiService.reviewContent({ content: submission.content, guidelines, contentType: submission.contentType })
      const findings: ReviewFinding[] = aiResponse.findings.map((f) => ({ id: generateId(), reviewId: review.id, guidelineId: f.guidelineId, ruleId: f.ruleId, severity: f.severity, location: f.location, explanation: f.explanation, suggestedCorrection: f.suggestedCorrection, guidelineReference: f.guidelineReference, status: 'pending' as const, createdAt: new Date().toISOString() }))
      await storage.saveFindings(findings)
      const completedReview: Review = { ...review, findings, overallScore: aiResponse.overallScore, status: findings.length > 0 ? 'changes_requested' : 'approved', updatedAt: new Date().toISOString(), completedAt: new Date().toISOString() }
      await storage.saveReview(completedReview)
      await updateSubmission(submissionId, { status: findings.length > 0 ? 'changes_requested' : 'approved', reviewId: review.id })
      setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === review.id ? completedReview : r) }))
      return completedReview
    } catch (error) {
      console.error('Review failed:', error)
      // Reset submission to draft so it can be retried; don't leave it stuck in in_review
      await updateSubmission(submissionId, { status: 'draft' })
      const failedReview: Review = { ...review, status: 'changes_requested', updatedAt: new Date().toISOString() }
      await storage.saveReview(failedReview)
      setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === review.id ? failedReview : r) }))
      throw error
    }
  }, [state.submissions, state.guidelines, updateSubmission])

  const approveReview = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return
    const updatedReview: Review = { ...review, status: 'approved', updatedAt: new Date().toISOString(), completedAt: new Date().toISOString(), approvedBy: 'current-user', approvedAt: new Date().toISOString() }
    await storage.saveReview(updatedReview)
    await updateSubmission(review.submissionId, { status: 'approved' })
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
  }, [state.reviews, updateSubmission])

  const requestChanges = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return
    const updatedReview: Review = { ...review, status: 'changes_requested', updatedAt: new Date().toISOString() }
    await storage.saveReview(updatedReview)
    await updateSubmission(review.submissionId, { status: 'changes_requested' })
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? updatedReview : r) }))
  }, [state.reviews, updateSubmission])

  const updateFindingStatus = useCallback(async (findingId: string, status: ReviewFinding['status']) => {
    await storage.updateFindingStatus(findingId, status)
    setState(prev => ({ ...prev, reviews: prev.reviews.map(review => ({ ...review, findings: review.findings.map(f => f.id === findingId ? { ...f, status, resolvedAt: new Date().toISOString() } : f) })) }))
  }, [])

  const acceptAllFindings = useCallback(async (reviewId: string) => {
    const review = state.reviews.find(r => r.id === reviewId)
    if (!review) return
    for (const finding of review.findings) if (finding.status === 'pending') await storage.updateFindingStatus(finding.id, 'accepted')
    setState(prev => ({ ...prev, reviews: prev.reviews.map(r => r.id === reviewId ? { ...r, findings: r.findings.map(f => f.status === 'pending' ? { ...f, status: 'accepted' as const, resolvedAt: new Date().toISOString() } : f) } : r) }))
  }, [state.reviews])

  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    const updated = await storage.saveSettings(settings)
    setState(prev => ({ ...prev, settings: updated }))
    if (settings.geminiApiKey) geminiService.initialize(settings.geminiApiKey)
    return updated
  }, [])

  const initializeGemini = useCallback(() => { if (state.settings.geminiApiKey) geminiService.initialize(state.settings.geminiApiKey) }, [state.settings.geminiApiKey])

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
    { label: 'Guidelines', href: '/guidelines', icon: 'BookOpen' },
    { label: 'Submit Content', href: '/submit', icon: 'FileText' },
    { label: 'Reviews', href: '/reviews', icon: 'ClipboardCheck', badge: state.reviews.filter(r => r.status === 'in_review' || r.status === 'changes_requested').length },
    { label: 'History', href: '/history', icon: 'History' },
    { label: 'Settings', href: '/settings', icon: 'Settings' }
  ]

  const setCurrentView = useCallback((view: AppState['currentView']) => { setState(prev => ({ ...prev, currentView: view })) }, [])

  return <AppContext.Provider value={{ ...state, isLoading, toasts, addToast, removeToast, createGuideline, updateGuideline, deleteGuideline, toggleGuidelineActive, createSubmission, updateSubmission, deleteSubmission, startReview, approveReview, requestChanges, updateFindingStatus, acceptAllFindings, updateSettings, initializeGemini, setCurrentView, navItems }}>{children}</AppContext.Provider>
}

