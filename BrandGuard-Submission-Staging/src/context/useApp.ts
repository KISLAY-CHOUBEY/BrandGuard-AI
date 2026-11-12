import { createContext, useContext } from 'react'
import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, UserSettings, AppState, NavItem, Toast } from '@/types'

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
  updateSettings: (settings: Partial<UserSettings>) => Promise<UserSettings>
  initializeGemini: () => void
  setCurrentView: (view: AppState['currentView']) => void
  navItems: NavItem[]
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

export { AppContext }
