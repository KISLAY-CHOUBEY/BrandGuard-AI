import { createContext, useContext } from 'react'
import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, UserSettings, AppState, NavItem, Toast, ReviewEvent, ReviewConflict } from '@/types'

interface AppContextType extends AppState {
  isLoading: boolean
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  createGuideline: (data: Omit<BrandGuideline, 'id' | 'createdAt' | 'updatedAt'>) => Promise<BrandGuideline>
  updateGuideline: (id: string, data: Partial<BrandGuideline>) => Promise<void>
  deleteGuideline: (id: string) => Promise<void>
  toggleGuidelineActive: (id: string) => Promise<void>
  createSubmission: (data: Omit<ContentSubmission, 'id' | 'submittedAt' | 'updatedAt' | 'status' | 'reviewId'>) => Promise<ContentSubmission>
  updateSubmission: (id: string, data: Partial<ContentSubmission>) => Promise<void>
  deleteSubmission: (id: string) => Promise<void>
  startReview: (submissionId: string) => Promise<Review>
  approveReview: (reviewId: string) => Promise<void>
  requestChanges: (reviewId: string) => Promise<void>
  updateFindingStatus: (findingId: string, status: ReviewFinding['status']) => Promise<void>
  acceptAllFindings: (reviewId: string) => Promise<void>
  updateFindingWithEdit: (findingId: string, editedCorrection: string, reviewerComment?: string) => Promise<void>
  addReviewerComment: (findingId: string, comment: string) => Promise<void>
  recordEvent: (event: Omit<ReviewEvent, 'id'>) => Promise<void>
  getEvents: (reviewId: string) => Promise<ReviewEvent[]>
  updateConflict: (conflictId: string, status: ReviewConflict['status'], resolution?: string) => Promise<void>
  updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>
  initializeGemini: () => void
  setCurrentView: (view: AppState['currentView']) => void
  navItems: NavItem[]
  isDemoMode: boolean
  switchToDemo: () => Promise<void>
  switchToNormal: () => Promise<void>
  resetDemo: () => Promise<void>
  // BYOK (Bring Your Own Key) - User-provided Gemini API key
  userGeminiApiKey: string | null
  setUserGeminiApiKey: (key: string | null) => void
  clearUserGeminiApiKey: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp(): AppContextType {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

export { AppContext }
