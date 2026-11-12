import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardCheck, Search, Eye, Check, X, Flag,
  AlertCircle, AlertTriangle, CheckCircle, Info, Loader2,
  ChevronUp, ChevronDown,
  LucideIcon
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDistanceToNow } from '@/utils/date'
import { ReviewStatus, ReviewFinding, GuidelineRule, BrandGuideline, Review, ContentSubmission } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

const statusConfig: Record<ReviewStatus, { label: string; color: string; icon: LucideIcon }> = {
  draft: { label: 'Draft', color: 'default', icon: ClipboardCheck },
  in_review: { label: 'In Review', color: 'info', icon: Loader2 },
  changes_requested: { label: 'Changes Requested', color: 'warning', icon: AlertTriangle },
  approved: { label: 'Approved', color: 'success', icon: CheckCircle }
}

const severityConfig = {
  low: { label: 'Low', color: 'info', icon: Info },
  medium: { label: 'Medium', color: 'warning', icon: AlertTriangle },
  high: { label: 'High', color: 'error', icon: Flag },
  critical: { label: 'Critical', color: 'error', icon: Flag }
}

export function Reviews() {
  const { reviews, submissions, guidelines, approveReview, requestChanges, updateFindingStatus, acceptAllFindings } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')
  const [viewingReview, setViewingReview] = useState<string | null>(null)

  const filteredReviews = reviews
    .filter(r => {
      const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submissions.find(s => s.id === r.submissionId)?.title.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const viewingReviewItem = reviews.find(r => r.id === viewingReview)
  const viewingSubmissionItem = viewingReviewItem ? submissions.find(s => s.id === viewingReviewItem.submissionId) : undefined

  return (
    <div className="space-y-6 animate-fade-in">
      <Reveal delay={0}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Reviews</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Review AI findings and approve content</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* Search & Filter */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReviewStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'in_review', label: 'In Review' },
                { value: 'changes_requested', label: 'Changes Requested' },
                { value: 'approved', label: 'Approved' },
                { value: 'draft', label: 'Draft' }
              ]}
              className="w-full sm:w-48"
            />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.2}>
        {/* Reviews List */}
        <Card variant="elevated">
          <CardContent className="p-0">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardCheck className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                {reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}
              </h3>
              <p className="text-[var(--color-text-muted)] mt-1">
                {reviews.length === 0
                  ? 'Submit content for review to see results here.'
                  : 'Try adjusting your search or filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {filteredReviews.map(review => {
                const submission = submissions.find(s => s.id === review.submissionId)
                const status = statusConfig[review.status]
                const StatusIcon = status.icon
                const highFindings = review.findings.filter(f => f.severity === 'high' || f.severity === 'critical').length
                const pendingFindings = review.findings.filter(f => f.status === 'pending').length

                return (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    submission={submission}
                    status={status}
                    StatusIcon={StatusIcon}
                    highFindings={highFindings}
                    pendingFindings={pendingFindings}
                    onView={() => setViewingReview(review.id)}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </Reveal>

      {/* View Review Modal */}
      {viewingReviewItem && viewingSubmissionItem && (
        <ReviewDetailModal
          review={viewingReviewItem}
          submission={viewingSubmissionItem}
          guidelines={guidelines}
          onClose={() => setViewingReview(null)}
          onApprove={approveReview}
          onRequestChanges={requestChanges}
          onUpdateFinding={updateFindingStatus}
          onAcceptAll={acceptAllFindings}
        />
      )}
    </div>
  )
}

function ReviewRow({
  review,
  submission,
  status,
  StatusIcon,
  highFindings,
  pendingFindings,
  onView
}: {
  review: Review
  submission: ContentSubmission | undefined
  status: { label: string; color: string; icon: LucideIcon }
  StatusIcon: LucideIcon
  highFindings: number
  pendingFindings: number
  onView: () => void
}) {
  return (
    <div className="p-4 hover:bg-[var(--color-bg-tertiary)] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-tertiary)] flex items-center justify-center flex-shrink-0">
            <StatusIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <Link to={`/reviews/${review.id}`} onClick={onView} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors truncate block">
              {submission?.title || 'Untitled Content'}
            </Link>
            <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(review.createdAt)}
              </span>
              <Badge variant={status.color as 'success' | 'error' | 'warning' | 'info' | 'default' | 'accent'} size="sm" dot>
                {status.label}
              </Badge>
              <Badge variant={highFindings > 0 ? 'error' : 'warning'} size="sm">
                {review.findings.length} findings
                {highFindings > 0 && ` (${highFindings} high)`}
              </Badge>
              {pendingFindings > 0 && (
                <Badge variant="info" size="sm" dot>
                  {pendingFindings} pending
                </Badge>
              )}
              <Badge variant="accent" size="sm">
                Score: {review.overallScore}%
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

import { Clock } from 'lucide-react'

function ReviewDetailModal({
  review,
  submission,
  guidelines,
  onClose,
  onApprove,
  onRequestChanges,
  onUpdateFinding,
  onAcceptAll
}: {
  review: Review
  submission: ContentSubmission
  guidelines: BrandGuideline[]
  onClose: () => void
  onApprove: (id: string) => void
  onRequestChanges: (id: string) => void
  onUpdateFinding: (findingId: string, status: ReviewFinding['status']) => void
  onAcceptAll: (reviewId: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'findings' | 'content' | 'guidelines'>('findings')
  const selectedGuidelines = guidelines.filter(g => review.guidelineIds.includes(g.id))

  const handleApprove = async () => {
    await onApprove(review.id)
    onClose()
  }

  const handleRequestChanges = async () => {
    await onRequestChanges(review.id)
    onClose()
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={`${submission.title} - Review Details`} size="full">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{submission.title}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant={statusConfig[review.status as ReviewStatus].color as 'success' | 'error' | 'warning' | 'info' | 'default' | 'accent'} size="md" dot>
                {statusConfig[review.status as ReviewStatus].label}
              </Badge>
              <Badge variant="accent" size="md">Score: {review.overallScore}%</Badge>
              <Badge variant="default" size="sm">{review.findings.length} findings</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {review.status === 'changes_requested' && (
              <>
                <Button variant="outline" onClick={handleRequestChanges} leftIcon={<Flag className="w-4 h-4" />}>
                  Request Changes
                </Button>
                <Button onClick={handleApprove} leftIcon={<Check className="w-4 h-4" />} disabled={!!review.error}>
                  Approve
                </Button>
              </>
            )}
            {review.status === 'in_review' && (
              <Button variant="outline" onClick={handleRequestChanges} leftIcon={<Flag className="w-4 h-4" />}>
                Request Changes
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveTab('findings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'findings' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Findings ({review.findings.length})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'content' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'guidelines' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Guidelines ({selectedGuidelines.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'findings' && (
            <FindingsTab
              findings={review.findings}
              guidelines={guidelines}
              onUpdateFinding={onUpdateFinding}
              error={review.error}
              onAcceptAll={() => onAcceptAll(review.id)}
            />
          )}
          {activeTab === 'content' && (
            <ContentTab content={submission.content} />
          )}
          {activeTab === 'guidelines' && (
            <GuidelinesTab guidelines={selectedGuidelines} />
          )}
        </div>
      </div>
    </Modal>
  )
}

function FindingsTab({
  findings,
  guidelines,
  onUpdateFinding,
  onAcceptAll,
  error
}: {
  findings: ReviewFinding[]
  guidelines: BrandGuideline[]
  onUpdateFinding: (findingId: string, status: ReviewFinding['status']) => void
  onAcceptAll: () => void
  error?: string
}) {
  if (findings.length === 0) {
    if (error) {
      return (
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-[var(--color-error)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Review Failed</h3>
          <p className="text-[var(--color-text-muted)] mt-1">{error}</p>
        </div>
      )
    }
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-16 h-16 text-[var(--color-success)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No issues found!</h3>
        <p className="text-[var(--color-text-muted)] mt-1">This content passes all selected guidelines.</p>
      </div>
    )
  }

  const pendingCount = findings.filter(f => f.status === 'pending').length

  return (
    <div className="space-y-4 p-4">
      {pendingCount > 0 && (
        <Button variant="outline" size="sm" onClick={onAcceptAll} leftIcon={<Check className="w-4 h-4" />}>
          Accept All Findings
        </Button>
      )}
      <div className="space-y-4">
        {findings.map(finding => {
          const guideline = guidelines.find(g => g.id === finding.guidelineId)
          const rule = guideline?.rules.find((r: GuidelineRule) => r.id === finding.ruleId)
          const severity = severityConfig[finding.severity]
          const SeverityIcon = severity.icon

          return (
            <FindingCard
              key={finding.id}
              finding={finding}
              guideline={guideline}
              rule={rule}
              severity={severity}
              SeverityIcon={SeverityIcon}
              onUpdateStatus={onUpdateFinding}
            />
          )
        })}
      </div>
    </div>
  )
}

function FindingCard({
  finding,
  guideline,
  rule,
  severity,
  SeverityIcon,
  onUpdateStatus
}: {
  finding: ReviewFinding
  guideline: BrandGuideline | undefined
  rule: GuidelineRule | undefined
  severity: { label: string; color: string; icon: LucideIcon }
  SeverityIcon: LucideIcon
  onUpdateStatus: (findingId: string, status: ReviewFinding['status']) => void
}) {
  const statusStyles = {
    pending: 'border-[var(--color-warning)]/50 bg-[var(--color-warning-bg)]',
    accepted: 'border-[var(--color-success)]/30 bg-[var(--color-success-bg)]',
    rejected: 'border-[var(--color-error)]/30 bg-[var(--color-error-bg)]'
  }

  return (
    <div className={`p-4 rounded-xl border ${statusStyles[finding.status]} transition-all`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${severity.color === 'error' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : severity.color === 'warning' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : 'bg-[var(--color-info-bg)] text-[var(--color-info)]'}`}>
          <SeverityIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={severity.color as 'success' | 'error' | 'warning' | 'info' | 'default' | 'accent'} size="sm" dot>{severity.label}</Badge>
              {guideline && <Badge variant="accent" size="sm">{guideline.name}</Badge>}
              {rule && <Badge variant="default" size="sm">{rule.title}</Badge>}
              <Badge variant={finding.status === 'pending' ? 'warning' : finding.status === 'accepted' ? 'success' : 'error'} size="sm" dot>
                {finding.status}
              </Badge>
            </div>
          </div>
          <p className="text-[var(--color-text-secondary)] mt-2">{finding.explanation}</p>

          {finding.location.context && (
            <div className="mt-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg font-mono text-sm overflow-x-auto">
              <span className="text-[var(--color-text-muted)]">{finding.location.context.substring(0, finding.location.start - (finding.location.context.length - finding.location.context.indexOf(finding.suggestedCorrection) > 0 ? finding.location.context.indexOf(finding.suggestedCorrection) : 0))}</span>
              <span className="bg-[var(--color-warning-bg)] text-[var(--color-warning)] px-1 rounded">{finding.suggestedCorrection}</span>
              <span className="text-[var(--color-text-muted)]">{finding.location.context.substring(finding.location.start + finding.suggestedCorrection.length)}</span>
            </div>
          )}

          <div className="mt-3 p-3 bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-lg">
            <p className="text-sm font-medium text-[var(--color-success)] mb-1">Suggested Correction:</p>
            <p className="text-[var(--color-text-primary)] font-mono text-sm">{finding.suggestedCorrection}</p>
          </div>

          {finding.guidelineReference && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Reference: {finding.guidelineReference}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {finding.status === 'pending' && (
            <>
              <Button size="sm" variant="primary" onClick={() => onUpdateStatus(finding.id, 'accepted')} leftIcon={<Check className="w-3.5 h-3.5" />}>
                Accept
              </Button>
              <Button size="sm" variant="danger" onClick={() => onUpdateStatus(finding.id, 'rejected')} leftIcon={<X className="w-3.5 h-3.5" />}>
                Reject
              </Button>
            </>
          )}
          {finding.status !== 'pending' && (
            <Badge variant={finding.status === 'accepted' ? 'success' : 'error'} size="sm" dot>
              {finding.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function ContentTab({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLarge = content.length > 5000
  const displayContent = expanded || !isLarge ? content : content.substring(0, 5000)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--color-text-muted)]">
          {content.length.toLocaleString()} characters
        </span>
        {isLarge && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            leftIcon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        )}
      </div>
      <div className="relative">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 max-h-[60vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap text-[var(--color-text-primary)]">
          {displayContent}
          {isLarge && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--color-bg-secondary)] to-transparent pointer-events-none" />
          )}
        </div>
        {isLarge && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 flex items-end justify-center p-4 pointer-events-none">
            <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm px-3 py-1 rounded-full">
              Content truncated. Click "Show More" to view full content.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GuidelinesTab({ guidelines }: { guidelines: BrandGuideline[] }) {
  return (
    <div className="p-4 space-y-4">
      {guidelines.map(g => (
        <Card key={g.id} variant="outlined">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-[var(--color-text-primary)]">{g.name}</h4>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">{g.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {g.rules.map((r: GuidelineRule) => (
                    <Badge key={r.id} variant="default" size="sm">{r.title} ({r.severity})</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
