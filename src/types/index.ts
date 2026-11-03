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
}

export interface Review {
  id: string;
  submissionId: string;
  guidelineIds: string[];
  findings: ReviewFinding[];
  overallScore: number;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
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
  currentView: 'dashboard' | 'guidelines' | 'submit' | 'review' | 'history' | 'settings';
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