import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, ReviewConflict, ReviewEvent } from '@/types'

// All IDs, names, and content are fictional sample data for the demo workspace.
// Clearly labelled as SAMPLE DATA in the UI. No fabricated accuracy claims.
const PAST_DAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const PAST_WEEK = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_GUIDELINES: BrandGuideline[] = [
  {
    id: 'demo-guideline-1',
    name: 'Brand Voice & Tone',
    description: 'Guidelines for maintaining a consistent, professional brand voice across all published content.',
    category: 'brand_voice',
    rules: [
      {
        id: 'demo-rule-1',
        title: 'Use active voice',
        description: 'Prefer active voice over passive voice for clarity and impact.',
        examples: { correct: ['We launched the product.'], incorrect: ['The product was launched by our team.'] },
        severity: 'medium'
      },
      {
        id: 'demo-rule-2',
        title: 'Avoid unnecessary jargon',
        description: 'Use plain language instead of technical jargon or acronyms.',
        examples: { correct: ['Use plain language.'], incorrect: ['Leverage synergistic paradigms to drive outcomes.'] },
        severity: 'low'
      }
    ],
    createdAt: PAST_WEEK,
    updatedAt: PAST_WEEK,
    isActive: true
  },
  {
    id: 'demo-guideline-2',
    name: 'Terminology & Style',
    description: 'Approved terminology and style rules for product and marketing copy.',
    category: 'terminology',
    rules: [
      {
        id: 'demo-rule-3',
        title: 'Consistent product naming',
        description: 'Always refer to the product as "BrandGuard AI" (two words, title case).',
        examples: { correct: ['BrandGuard AI helps teams stay on brand.'], incorrect: ['brandguardai helps teams.'] },
        severity: 'high'
      },
      {
        id: 'demo-rule-4',
        title: 'ISO 8601 date format',
        description: 'Write dates in YYYY-MM-DD format.',
        examples: { correct: ['2026-11-11'], incorrect: ['11/11/2026', 'November 11th'] },
        severity: 'medium'
      }
    ],
    createdAt: PAST_WEEK,
    updatedAt: PAST_WEEK,
    isActive: true
  },
  {
    id: 'demo-guideline-3',
    name: 'Accessibility Standards',
    description: 'Accessibility requirements for inclusive content.',
    category: 'accessibility',
    rules: [
      {
        id: 'demo-rule-5',
        title: 'Alt text for images',
        description: 'Every image must include descriptive alt text.',
        examples: { correct: ['Chart showing Q4 growth by region.'], incorrect: ['image', 'chart'] },
        severity: 'high'
      },
      {
        id: 'demo-rule-6',
        title: 'Color contrast',
        description: 'Text must meet WCAG AA contrast ratios against its background.',
        examples: { correct: ['Dark gray text on white background.'], incorrect: ['Light gray text on white background.'] },
        severity: 'medium'
      }
    ],
    createdAt: PAST_WEEK,
    updatedAt: PAST_WEEK,
    isActive: true
  }
]

export const DEMO_SUBMISSIONS: ContentSubmission[] = [
  {
    id: 'demo-submission-1',
    title: 'Q4 Marketing Campaign Copy',
    content: 'Brandguardai helps teams stay on brand. The product was launched by our team last quarter. Results were synergistic.',
    contentType: 'text',
    selectedGuidelineIds: ['demo-guideline-1', 'demo-guideline-2'],
    status: 'in_review',
    submittedAt: PAST_DAY,
    updatedAt: PAST_DAY,
    reviewId: 'demo-review-1'
  },
  {
    id: 'demo-submission-2',
    title: 'Blog Post: Sustainable Packaging',
    content: 'Our new packaging uses recycled materials. Published on 2026-11-11. All images include descriptive alt text for screen readers.',
    contentType: 'markdown',
    selectedGuidelineIds: ['demo-guideline-2', 'demo-guideline-3'],
    status: 'approved',
    submittedAt: PAST_WEEK,
    updatedAt: PAST_WEEK,
    reviewId: 'demo-review-2'
  }
]

export const DEMO_FINDINGS: ReviewFinding[] = [
  {
    id: 'demo-finding-1',
    reviewId: 'demo-review-1',
    guidelineId: 'demo-guideline-2',
    ruleId: 'demo-rule-3',
    severity: 'high',
    location: { start: 0, end: 11, context: 'Brandguardai helps teams' },
    explanation: 'Product name is written as "Brandguardai" instead of the approved "BrandGuard AI".',
    suggestedCorrection: 'BrandGuard AI',
    guidelineReference: 'Terminology & Style: Consistent product naming',
    status: 'pending',
    createdAt: PAST_DAY
  },
  {
    id: 'demo-finding-2',
    reviewId: 'demo-review-1',
    guidelineId: 'demo-guideline-1',
    ruleId: 'demo-rule-1',
    severity: 'medium',
    location: { start: 42, end: 65, context: 'The product was launched by our team' },
    explanation: 'Passive voice construction ("was launched") reduces clarity. Use active voice.',
    suggestedCorrection: 'Our team launched the product.',
    guidelineReference: 'Brand Voice & Tone: Use active voice',
    status: 'pending',
    createdAt: PAST_DAY
  },
  {
    id: 'demo-finding-3',
    reviewId: 'demo-review-2',
    guidelineId: 'demo-guideline-2',
    ruleId: 'demo-rule-4',
    severity: 'low',
    location: { start: 39, end: 52, context: 'Published on 2026-11-11' },
    explanation: 'Date follows ISO 8601 format correctly. No action needed.',
    suggestedCorrection: '2026-11-11',
    guidelineReference: 'Terminology & Style: ISO 8601 date format',
    status: 'accepted',
    createdAt: PAST_WEEK,
    resolvedAt: PAST_WEEK
  }
]

export const DEMO_REVIEWS: Review[] = [
  {
    id: 'demo-review-1',
    submissionId: 'demo-submission-1',
    guidelineIds: ['demo-guideline-1', 'demo-guideline-2'],
    findings: [DEMO_FINDINGS[0], DEMO_FINDINGS[1]],
    conflicts: [
      {
        id: 'demo-conflict-1',
        reviewId: 'demo-review-1',
        findingIds: ['demo-finding-1', 'demo-finding-2'],
        conflictType: 'overlap',
        location: { start: 0, end: 65, context: 'Brandguardai helps teams stay on brand. The product was launched by our team.' },
        status: 'unresolved',
        createdAt: PAST_DAY
      }
    ],
    overallScore: 72,
    status: 'changes_requested',
    createdAt: PAST_DAY,
    updatedAt: PAST_DAY,
    events: [
      {
        id: 'demo-event-1',
        reviewId: 'demo-review-1',
        type: 'ai_review_completed',
        timestamp: PAST_DAY,
        previousValue: '',
        newValue: 'Found 2 issues, score: 72',
        reviewerId: 'demo-system'
      }
    ],
    revisedContent: undefined
  },
  {
    id: 'demo-review-2',
    submissionId: 'demo-submission-2',
    guidelineIds: ['demo-guideline-2', 'demo-guideline-3'],
    findings: [DEMO_FINDINGS[2]],
    conflicts: [],
    overallScore: 94,
    status: 'approved',
    createdAt: PAST_WEEK,
    updatedAt: PAST_WEEK,
    completedAt: PAST_WEEK,
    approvedBy: 'demo-reviewer',
    approvedAt: PAST_WEEK,
    events: [
      {
        id: 'demo-event-2',
        reviewId: 'demo-review-2',
        type: 'ai_review_completed',
        timestamp: PAST_WEEK,
        previousValue: '',
        newValue: 'Found 1 issue, score: 94',
        reviewerId: 'demo-system'
      },
      {
        id: 'demo-event-3',
        reviewId: 'demo-review-2',
        type: 'suggestion_accepted',
        timestamp: PAST_WEEK,
        previousValue: '11/11/2026',
        newValue: '2026-11-11',
        findingId: 'demo-finding-3',
        reviewerId: 'demo-reviewer'
      },
      {
        id: 'demo-event-4',
        reviewId: 'demo-review-2',
        type: 'review_approved',
        timestamp: PAST_WEEK,
        previousValue: 'changes_requested',
        newValue: 'approved',
        reviewerId: 'demo-reviewer'
      }
    ],
    revisedContent: 'Our new packaging uses recycled materials. Published on 2026-11-11. All images include descriptive alt text for screen readers.'
  }
]

export const DEMO_CONFLICTS: ReviewConflict[] = [
  DEMO_REVIEWS[0].conflicts[0]
]

export const DEMO_EVENTS: ReviewEvent[] = [
  ...DEMO_REVIEWS[0].events,
  ...DEMO_REVIEWS[1].events
]
