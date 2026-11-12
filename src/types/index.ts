// Core type definitions for ThroneCaptures

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type ReviewStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved';

export type GuidelineCategory = 'tone' | 'terminology' | 'accessibility' | 'formatting' | 'brand_voice' | 'legal' | 'custom';

export interface BrandGuideline {
  id: string;
  name: string;
  description: string;
  category: GuidelineCategory;
  rules: GuidelineRule[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface GuidelineRule {
  id: string;
  title: string;
  description: string;
  pattern?: string;
  examples: {
    correct: string[];
    incorrect: string[];
  };
  severity: Severity;
}

export interface ContentSubmission {
  id: string;
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  selectedGuidelineIds: string[];
  status: ReviewStatus;
  submittedAt: string;
  updatedAt: string;
  reviewId?: string;
  revisedContent?: string; // Track revised draft separately from original
}

export interface ReviewFinding {
  id: string;
  reviewId: string;
  guidelineId: string;
  ruleId: string;
  severity: Severity;
  location: {
    start: number;
    end: number;
    context: string;
  };
  explanation: string;
  suggestedCorrection: string;
  guidelineReference: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
  reviewerComment?: string; // Reviewer comment on this finding
  editedCorrection?: string; // If suggestion was edited before accepting
}

export interface ReviewConflict {
  id: string;
  reviewId: string;
  findingIds: string[];
  conflictType: 'overlap' | 'correction_mismatch';
  location: {
    start: number;
    end: number;
    context: string;
  };
  status: 'unresolved' | 'resolved_keep_first' | 'resolved_keep_second' | 'resolved_custom';
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ReviewEvent {
  id: string;
  reviewId: string;
  type: 'review_created' | 'ai_review_completed' | 'suggestion_accepted' | 'suggestion_rejected' | 'suggestion_edited' | 'comment_added' | 'draft_updated' | 'review_approved' | 'review_rejected' | 'review_approval_blocked';
  timestamp: string;
  findingId?: string;
  previousValue?: string;
  newValue?: string;
  reviewerId: string; // 'local-user' or future auth user
  details?: Record<string, unknown>;
}

export interface Review {
  id: string;
  submissionId: string;
  guidelineIds: string[];
  findings: ReviewFinding[];
  conflicts: ReviewConflict[];
  overallScore: number;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  error?: string;
  events: ReviewEvent[]; // Audit trail
  revisedContent?: string; // Final revised draft after all accepted changes
}

export interface UserSettings {
  geminiApiKey: string;
  defaultGuidelineIds: string[];
  autoSave: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface AppState {
  guidelines: BrandGuideline[];
  submissions: ContentSubmission[];
  reviews: Review[];
  settings: UserSettings;
  currentView: 'dashboard' | 'guidelines' | 'submit' | 'review' | 'history' | 'settings' | 'governance';
}

export interface GeminiReviewRequest {
  content: string;
  guidelines: BrandGuideline[];
  contentType: 'text' | 'markdown' | 'html';
}

export interface GeminiFinding {
  guidelineId: string;
  ruleId: string;
  severity: Severity;
  location: {
    start: number;
    end: number;
    context: string;
  };
  explanation: string;
  suggestedCorrection: string;
  guidelineReference: string;
}

export interface GeminiReviewResponse {
  findings: GeminiFinding[];
  overallScore: number;
  summary: string;
}

export interface GuidelineFormData {
  name: string;
  description: string;
  category: GuidelineCategory;
  rules: Omit<GuidelineRule, 'id'>[];
}

export interface ContentFormData {
  title: string;
  content: string;
  contentType: 'text' | 'markdown' | 'html';
  selectedGuidelineIds: string[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Governance Insights Types
export interface GovernanceMetrics {
  totalReviews: number;
  totalFindings: number;
  findingsBySeverity: Record<Severity, number>;
  findingsByCategory: Record<string, number>;
  acceptanceRate: number;
  rejectionRate: number;
  pendingReviews: number;
  approvedReviews: number;
  topViolatedRules: Array<{ ruleId: string; ruleTitle: string; guidelineName: string; count: number }>;
  reviewActivity: Array<{ date: string; count: number }>;
  averageScore: number;
}