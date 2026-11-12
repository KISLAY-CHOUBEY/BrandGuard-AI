import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Search, Eye, Check, X, Flag,
  AlertCircle, AlertTriangle, CheckCircle, Info, Loader2,
  ChevronUp, ChevronDown, Edit, MessageSquare, History, Save, X as XIcon,
  LucideIcon, Download, FileText, GitCompare, ArrowRight, Gavel
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDistanceToNow } from '@/utils/date'
import { ReviewStatus, ReviewFinding, GuidelineRule, BrandGuideline, Review, ContentSubmission, ReviewConflict, ReviewEvent } from '@/types'
import { Reveal } from '@/components/ui/Reveal'
import { jsPDF } from 'jspdf'
import { storage } from '@/services/storage'

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
  const { reviews, submissions, guidelines, approveReview, requestChanges, updateFindingStatus, acceptAllFindings, updateFindingWithEdit, addReviewerComment, createSubmission, updateConflict } = useApp() as ReturnType<typeof useApp>
  const params = useParams<{ id?: string }>()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all')
  const [viewingReview, setViewingReview] = useState<string | null>(null)

  // Auto-open review detail modal when navigating to /reviews/:id
  useEffect(() => {
    if (params.id) {
      const reviewExists = reviews.some(r => r.id === params.id)
      if (reviewExists) {
        setViewingReview(params.id)
      }
    }
  }, [params.id, reviews])

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
          onUpdateFindingWithEdit={updateFindingWithEdit}
          onAddReviewerComment={addReviewerComment}
          createSubmission={createSubmission}
          onUpdateConflict={updateConflict}
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
  onAcceptAll,
  onUpdateFindingWithEdit,
  onAddReviewerComment,
  createSubmission,
  onUpdateConflict
}: {
  review: Review
  submission: ContentSubmission
  guidelines: BrandGuideline[]
  onClose: () => void
  onApprove: (id: string) => void
  onRequestChanges: (id: string) => void
  onUpdateFinding: (findingId: string, status: ReviewFinding['status']) => void
  onAcceptAll: (reviewId: string) => void
  onUpdateFindingWithEdit: (findingId: string, editedCorrection: string, reviewerComment?: string) => void
  onAddReviewerComment: (findingId: string, comment: string) => void
  createSubmission: (data: Omit<ContentSubmission, 'id' | 'submittedAt' | 'updatedAt' | 'status' | 'reviewId'>) => Promise<ContentSubmission>
  onUpdateConflict: (conflictId: string, status: ReviewConflict['status'], resolution?: string) => void
}) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'findings' | 'content' | 'diff' | 'guidelines' | 'events' | 'conflicts'>('findings')
  const selectedGuidelines = guidelines.filter(g => review.guidelineIds.includes(g.id))
  const contentRef = useRef<HTMLDivElement>(null)
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null)

  // Export review report as PDF
  const handleExportReport = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    // Title
    doc.setFontSize(20)
    doc.setTextColor(30, 30, 30)
    doc.text(submission.title, 20, y)
    y += 10

    // Metadata
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Review ID: ${review.id}`, 20, y)
    y += 5
    doc.text(`Status: ${statusConfig[review.status as ReviewStatus].label}`, 20, y)
    y += 5
    doc.text(`Overall Score: ${review.overallScore}%`, 20, y)
    y += 5
    doc.text(`Date: ${new Date(review.createdAt).toLocaleString()}`, 20, y)
    y += 5
    doc.text(`Guidelines: ${selectedGuidelines.map(g => g.name).join(', ')}`, 20, y)
    y += 10

    // Summary
    doc.setFontSize(12)
    doc.setTextColor(30, 30, 30)
    doc.text('Summary', 20, y)
    y += 7
    doc.setFontSize(10)
    const summaryLines = doc.splitTextToSize(`This review found ${review.findings.length} issue(s) across ${selectedGuidelines.length} guideline(s). ${review.findings.filter(f => f.status === 'accepted').length} accepted, ${review.findings.filter(f => f.status === 'rejected').length} rejected, ${review.findings.filter(f => f.status === 'pending').length} pending.`, pageWidth - 40)
    doc.text(summaryLines, 20, y)
    y += summaryLines.length * 5 + 5

    // Findings
    doc.setFontSize(12)
    doc.text('Findings', 20, y)
    y += 7

    review.findings.forEach((finding, index) => {
      const guideline = guidelines.find(g => g.id === finding.guidelineId)
      const rule = guideline?.rules.find((r: GuidelineRule) => r.id === finding.ruleId)
      const severity = severityConfig[finding.severity]

      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.text(`${index + 1}. [${severity.label}] ${finding.explanation}`, 20, y)
      y += 5

      if (guideline) {
        doc.setTextColor(100, 100, 100)
        doc.text(`Guideline: ${guideline.name} | Rule: ${rule?.title || 'N/A'}`, 25, y)
        y += 5
      }

      doc.setTextColor(30, 30, 30)
      const correctionLabel = finding.editedCorrection ? 'Edited Correction' : 'Suggested Correction'
      const correction = finding.editedCorrection || finding.suggestedCorrection
      const corrLines = doc.splitTextToSize(`${correctionLabel}: ${correction}`, pageWidth - 50)
      doc.text(corrLines, 25, y)
      y += corrLines.length * 5

      if (finding.reviewerComment) {
        const commentLines = doc.splitTextToSize(`Reviewer Comment: ${finding.reviewerComment}`, pageWidth - 50)
        doc.text(commentLines, 25, y)
        y += commentLines.length * 5
      }

      doc.setTextColor(100, 100, 100)
      doc.text(`Status: ${finding.status}`, 25, y)
      y += 8
    })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Generated by BrandGuard AI', pageWidth / 2, 290, { align: 'center' })

    doc.save(`${submission.title.replace(/[^a-z0-9]/gi, '_')}_review_report.pdf`)
  }

  const handleApprove = async () => {
    await onApprove(review.id)
    onClose()
    navigate('/')
  }

  const handleRequestChanges = async () => {
    await onRequestChanges(review.id)
    onClose()
  }

  const handleSaveRevisedDraft = async () => {
    if (!review.revisedContent) return
    await createSubmission({
      title: `${submission.title} (Revised)`,
      content: review.revisedContent,
      contentType: submission.contentType,
      selectedGuidelineIds: review.guidelineIds,
    })
    onClose()
  }

  // Scroll to finding in content tab
  const scrollToFinding = (finding: ReviewFinding) => {
    setHighlightedFindingId(finding.id)
    setActiveTab('content')
    setTimeout(() => {
      if (contentRef.current) {
        const selector = `[data-finding-id="${finding.id}"]`
        const el = contentRef.current.querySelector(selector)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add a temporary highlight class
          el.classList.add('finding-highlight')
          setTimeout(() => el.classList.remove('finding-highlight'), 3000)
        }
      }
    }, 100)
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportReport} leftIcon={<Download className="w-4 h-4" />}>
              Export Report
            </Button>
            {review.status === 'changes_requested' && (
              <>
                <Button variant="outline" size="sm" onClick={handleRequestChanges} leftIcon={<Flag className="w-4 h-4" />}>
                  Request Changes
                </Button>
                {review.revisedContent && (
                  <Button variant="outline" size="sm" onClick={handleSaveRevisedDraft} leftIcon={<Save className="w-4 h-4" />}>
                    Save Revised Draft
                  </Button>
                )}
                <Button size="sm" onClick={handleApprove} leftIcon={<Check className="w-4 h-4" />} disabled={!!review.error || (review.conflicts?.some(c => c.status === 'unresolved') ?? false)}>
                  Approve
                  {(review.conflicts?.some(c => c.status === 'unresolved') ?? false) && <AlertTriangle className="w-3.5 h-3.5 ml-1" />}
                </Button>
              </>
            )}
            {review.status === 'in_review' && (
              <Button variant="outline" size="sm" onClick={handleRequestChanges} leftIcon={<Flag className="w-4 h-4" />}>
                Request Changes
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1 mb-4 flex-wrap">
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
            onClick={() => setActiveTab('diff')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'diff' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            <GitCompare className="w-4 h-4 inline mr-1" /> Diff
          </button>
          {(review.conflicts?.some(c => c.status === 'unresolved')) && (
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'conflicts' ? 'bg-[var(--color-warning)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-1" /> Conflicts ({review.conflicts?.filter(c => c.status === 'unresolved').length || 0})
            </button>
          )}
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'guidelines' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Guidelines ({selectedGuidelines.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'events' ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            Events ({review.events?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'findings' && (
            <FindingsTab
              findings={review.findings}
              guidelines={guidelines}
              onUpdateFinding={onUpdateFinding}
              onUpdateFindingWithEdit={onUpdateFindingWithEdit}
              onAddReviewerComment={onAddReviewerComment}
              error={review.error}
              onAcceptAll={() => onAcceptAll(review.id)}
              onScrollToFinding={scrollToFinding}
            />
          )}
          {activeTab === 'content' && (
            <ContentTab content={submission.content} findings={review.findings} ref={contentRef} highlightedFindingId={highlightedFindingId} />
          )}
          {activeTab === 'diff' && (
            <DiffTab content={submission.content} findings={review.findings} guidelines={guidelines} />
          )}
          {activeTab === 'conflicts' && (
            <ConflictsTab
              review={review}
              submission={submission}
              guidelines={guidelines}
              onUpdateFindingWithEdit={onUpdateFindingWithEdit}
              onUpdateFinding={onUpdateFinding}
              onAcceptAll={() => onAcceptAll(review.id)}
              onUpdateConflict={onUpdateConflict}
            />
          )}
          {activeTab === 'guidelines' && (
            <GuidelinesTab guidelines={selectedGuidelines} />
          )}
          {activeTab === 'events' && (
            <EventsTab events={review.events || []} />
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
  onUpdateFindingWithEdit,
  onAddReviewerComment,
  onAcceptAll,
  error,
  onScrollToFinding
}: {
  findings: ReviewFinding[]
  guidelines: BrandGuideline[]
  onUpdateFinding: (findingId: string, status: ReviewFinding['status']) => void
  onUpdateFindingWithEdit: (findingId: string, editedCorrection: string, reviewerComment?: string) => void
  onAddReviewerComment: (findingId: string, comment: string) => void
  onAcceptAll: () => void
  error?: string
  onScrollToFinding?: (finding: ReviewFinding) => void
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
              onUpdateWithEdit={onUpdateFindingWithEdit}
              onAddComment={onAddReviewerComment}
              onScrollToFinding={onScrollToFinding}
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
  onUpdateStatus,
  onUpdateWithEdit,
  onAddComment,
  onScrollToFinding
}: {
  finding: ReviewFinding
  guideline: BrandGuideline | undefined
  rule: GuidelineRule | undefined
  severity: { label: string; color: string; icon: LucideIcon }
  SeverityIcon: LucideIcon
  onUpdateStatus: (findingId: string, status: ReviewFinding['status']) => void
  onUpdateWithEdit: (findingId: string, editedCorrection: string, reviewerComment?: string) => void
  onAddComment: (findingId: string, comment: string) => void
  onScrollToFinding?: (finding: ReviewFinding) => void
}) {
  const statusStyles = {
    pending: 'border-[var(--color-warning)]/50 bg-[var(--color-warning-bg)]',
    accepted: 'border-[var(--color-success)]/30 bg-[var(--color-success-bg)]',
    rejected: 'border-[var(--color-error)]/30 bg-[var(--color-error-bg)]'
  }

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(finding.editedCorrection || finding.suggestedCorrection)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [commentValue, setCommentValue] = useState(finding.reviewerComment || '')

  const handleSaveEdit = () => {
    onUpdateWithEdit(finding.id, editValue, finding.reviewerComment)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(finding.editedCorrection || finding.suggestedCorrection)
    setIsEditing(false)
  }

  const handleAddComment = () => {
    if (commentValue.trim()) {
      onAddComment(finding.id, commentValue.trim())
      setIsAddingComment(false)
      setCommentValue('')
    }
  }

  const currentCorrection = finding.editedCorrection || finding.suggestedCorrection

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
              <span className="text-[var(--color-text-muted)]">{finding.location.context.substring(0, Math.max(0, finding.location.start))}</span>
              <span className="bg-[var(--color-error-bg)] text-[var(--color-error)] px-1 rounded underline decoration-wavy">{finding.location.context.substring(Math.max(0, finding.location.start), Math.min(finding.location.context.length, finding.location.end))}</span>
              <span className="text-[var(--color-text-muted)]">{finding.location.context.substring(Math.min(finding.location.context.length, finding.location.end))}</span>
            </div>
          )}

          <div className="mt-3 p-3 bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-[var(--color-success)]">Suggested Correction:</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} leftIcon={<Edit className="w-3.5 h-3.5" />} aria-label="Edit suggestion">
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsAddingComment(true)} leftIcon={<MessageSquare className="w-3.5 h-3.5" />} aria-label="Add comment">
                  Comment
                </Button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded font-mono text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  rows={3}
                  placeholder="Enter edited correction..."
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveEdit} leftIcon={<Save className="w-3.5 h-3.5" />}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} leftIcon={<XIcon className="w-3.5 h-3.5" />}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text-primary)] font-mono text-sm">{currentCorrection}</p>
            )}

            {finding.editedCorrection && finding.editedCorrection !== finding.suggestedCorrection && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                <span className="font-medium">Original:</span> {finding.suggestedCorrection}
              </p>
            )}
          </div>

          {finding.reviewerComment && (
            <div className="mt-3 p-3 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg">
              <p className="text-sm font-medium text-[var(--color-info)] mb-1">Reviewer Comment:</p>
              <p className="text-[var(--color-text-primary)] text-sm">{finding.reviewerComment}</p>
            </div>
          )}

          {isAddingComment && !finding.reviewerComment && (
            <div className="mt-3 space-y-2">
              <textarea
                value={commentValue}
                onChange={(e) => setCommentValue(e.target.value)}
                className="w-full p-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                rows={2}
                placeholder="Add a comment for the team..."
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAddComment} leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Add Comment
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAddingComment(false); setCommentValue('') }} leftIcon={<XIcon className="w-3.5 h-3.5" />}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {finding.guidelineReference && (
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Reference: {finding.guidelineReference}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-col">
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
          {onScrollToFinding && finding.location && (
            <Button size="sm" variant="ghost" onClick={() => onScrollToFinding(finding)} leftIcon={<ArrowRight className="w-3.5 h-3.5" />} aria-label="View in content">
              View in Content
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const ContentTab = React.forwardRef<HTMLDivElement, { content: string; findings: ReviewFinding[]; highlightedFindingId: string | null }>(({ content, findings, highlightedFindingId }, ref) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const isLarge = content.length > 5000
  const displayContent = expanded || !isLarge ? content : content.substring(0, 5000)

  // Expose scrollToFinding via imperative handle
  useEffect(() => {
    if (ref && typeof ref === 'object' && 'current' in ref) {
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = contentRef.current
    }
  }, [ref])

  // Build content with highlighted findings
  const renderContentWithHighlights = () => {
    if (!findings || findings.length === 0) return displayContent

    // Sort findings by location start position
    const sortedFindings = [...findings].filter(f => f.location).sort((a, b) => (a.location?.start || 0) - (b.location?.start || 0))

    let result: React.ReactNode[] = []
    let lastEnd = 0

    sortedFindings.forEach((finding) => {
      const start = finding.location?.start || 0
      const end = finding.location?.end || 0
      const clampedStart = Math.max(0, Math.min(start, displayContent.length))
      const clampedEnd = Math.max(clampedStart, Math.min(end, displayContent.length))

      // Add text before this finding
      if (clampedStart > lastEnd) {
        result.push(displayContent.substring(lastEnd, clampedStart))
      }

      // Add highlighted finding
      const findingText = displayContent.substring(clampedStart, clampedEnd)
      const isHighlighted = finding.id === highlightedFindingId
      result.push(
        <span
          key={finding.id}
          data-finding-id={finding.id}
          className={`finding-marker ${isHighlighted ? 'finding-highlight' : ''}`}
          style={{
            backgroundColor: isHighlighted ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
            color: isHighlighted ? 'var(--color-warning)' : 'var(--color-error)',
            padding: '0 2px',
            borderRadius: '2px',
            textDecoration: 'underline',
            textDecorationStyle: 'wavy',
            fontWeight: 500,
            transition: 'all 0.3s ease'
          }}
        >
          {findingText}
        </span>
      )

      lastEnd = clampedEnd
    })

    // Add remaining text
    if (lastEnd < displayContent.length) {
      result.push(displayContent.substring(lastEnd))
    }

    return result.length > 0 ? result : displayContent
  }

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
        <div
          ref={contentRef}
          className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-6 max-h-[60vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap text-[var(--color-text-primary)]"
        >
          {renderContentWithHighlights()}
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
})

function DiffTab({ content, findings, guidelines }: { content: string; findings: ReviewFinding[]; guidelines: BrandGuideline[] }) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side')

  // Helper: merge overlapping accepted findings to prevent corrupted output
  // Returns a new array of findings with overlapping ranges merged (union of ranges, first correction kept)
  const mergeOverlappingAcceptedFindings = (findings: ReviewFinding[]): ReviewFinding[] => {
    const accepted = findings
      .filter(f => f.status === 'accepted' && f.location)
      .sort((a, b) => (a.location?.start || 0) - (b.location?.start || 0))

    if (accepted.length <= 1) return accepted

    const merged: ReviewFinding[] = []
    let current = { ...accepted[0] }

    for (let i = 1; i < accepted.length; i++) {
      const next = accepted[i]
      const currentEnd = current.location?.end || 0
      const nextStart = next.location?.start || 0

      // Check for overlap (strict: adjacent boundaries do not merge)
      if (nextStart < currentEnd) {
        // Overlap detected: merge ranges (union), keep first finding's correction
        current = {
          ...current,
          location: {
            ...current.location!,
            end: Math.max(currentEnd, next.location?.end || 0)
          }
        }
        // Log overlap for debugging (non-throwing, per requirement to not silently discard)
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[DiffTab] Overlapping accepted findings merged:', current.id, 'with', next.id)
        }
      } else {
        // No overlap: push current and move to next
        merged.push(current)
        current = { ...next }
      }
    }
    merged.push(current)
    return merged
  }

  // Build revised content by applying merged accepted corrections in DESCENDING order
  // (highest start first) so earlier edits don't invalidate later offsets
  const mergedFindings = useMemo(() => mergeOverlappingAcceptedFindings(findings), [findings])
  const revisedContent = useMemo(() => {
    return mergedFindings
      .slice()
      .sort((a, b) => (b.location?.start || 0) - (a.location?.start || 0))
      .reduce((acc, finding) => {
        const correction = finding.editedCorrection || finding.suggestedCorrection
        return acc.slice(0, finding.location!.start) + correction + acc.slice(finding.location!.end)
      }, content)
  }, [content, mergedFindings])

  // Generate unified diff using merged findings
  const generateDiff = useMemo(() => {
    const diffs: Array<{ type: 'equal' | 'insert' | 'delete'; value: string; finding?: ReviewFinding }> = []
    let contentIdx = 0

    const sortedMerged = mergedFindings
      .slice()
      .sort((a, b) => (a.location?.start || 0) - (b.location?.start || 0))

    sortedMerged.forEach((finding) => {
      const start = finding.location?.start || 0
      const end = finding.location?.end || 0
      const correction = finding.editedCorrection || finding.suggestedCorrection

      // Equal content before change
      if (start > contentIdx) {
        diffs.push({ type: 'equal', value: content.substring(contentIdx, start) })
      }

      // Deleted content
      if (end > start) {
        diffs.push({ type: 'delete', value: content.substring(start, end), finding })
      }

      // Inserted content
      if (correction) {
        diffs.push({ type: 'insert', value: correction, finding })
      }

      contentIdx = end
    })

    // Remaining equal content
    if (contentIdx < content.length) {
      diffs.push({ type: 'equal', value: content.substring(contentIdx) })
    }

    return diffs
  }, [content, mergedFindings])

  const diffs = generateDiff
  const hasChanges = diffs.some(d => d.type !== 'equal')

  if (!hasChanges) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-16 h-16 text-[var(--color-success)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No changes to display</h3>
        <p className="text-[var(--color-text-muted)] mt-1">All findings were rejected or no corrections were suggested.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-[var(--color-text-primary)]">Diff View</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'side-by-side' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('side-by-side')}
            leftIcon={<GitCompare className="w-3.5 h-3.5" />}
          >
            Side by Side
          </Button>
          <Button
            variant={viewMode === 'unified' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('unified')}
          >
            Unified
          </Button>
        </div>
      </div>

      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original */}
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[var(--color-error-bg)]/30 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium text-[var(--color-error)] flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Original
              </span>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {diffs.map((diff: { type: 'equal' | 'insert' | 'delete'; value: string; finding?: ReviewFinding }, i: number) => (
                <span
                  key={i}
                  className={diff.type === 'delete' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)] line-through' : 'text-[var(--color-text-primary)]'}
                >
                  {diff.value}
                </span>
              ))}
            </div>
          </div>

          {/* Revised */}
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-[var(--color-success-bg)]/30 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium text-[var(--color-success)] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Revised
              </span>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {diffs.map((diff: { type: 'equal' | 'insert' | 'delete'; value: string; finding?: ReviewFinding }, i: number) => (
                <span
                  key={i}
                  className={diff.type === 'insert' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] underline' : 'text-[var(--color-text-primary)]'}
                >
                  {diff.value}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'unified' && (
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <div className="p-4 max-h-[70vh] overflow-y-auto font-mono text-sm whitespace-pre-wrap">
            {diffs.map((diff: { type: 'equal' | 'insert' | 'delete'; value: string; finding?: ReviewFinding }, i: number) => (
              <div
                key={i}
                className={`py-0.5 px-2 ${diff.type === 'delete' ? 'bg-[var(--color-error-bg)]/50 text-[var(--color-error)] line-through' : diff.type === 'insert' ? 'bg-[var(--color-success-bg)]/50 text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}
              >
                <span className="mr-2 select-none">
                  {diff.type === 'delete' ? '-' : diff.type === 'insert' ? '+' : ' '}
                </span>
                {diff.value.split('\n').map((line: string, li: number) => (
                  <span key={li} className="block">{line}{li < diff.value.split('\n').length - 1 ? '\n' : ''}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[var(--color-error-bg)] border border-[var(--color-error)] rounded" />
          <span className="text-sm text-[var(--color-text-secondary)]">Removed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[var(--color-success-bg)] border border-[var(--color-success)] rounded" />
          <span className="text-sm text-[var(--color-text-secondary)]">Added</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-transparent border border-[var(--color-border)] rounded" />
          <span className="text-sm text-[var(--color-text-secondary)]">Unchanged</span>
        </div>
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

function EventsTab({ events }: { events: Array<{ id: string; type: string; timestamp: string; findingId?: string; previousValue?: string; newValue?: string; reviewerId: string; details?: Record<string, unknown> }> }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No events recorded</h3>
        <p className="text-[var(--color-text-muted)] mt-1">Audit trail will appear here as actions are taken.</p>
      </div>
    )
  }

  const eventTypeLabels: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    review_created: { label: 'Review Created', color: 'info', icon: ClipboardCheck },
    ai_review_completed: { label: 'AI Review Completed', color: 'accent', icon: CheckCircle },
    suggestion_accepted: { label: 'Suggestion Accepted', color: 'success', icon: Check },
    suggestion_rejected: { label: 'Suggestion Rejected', color: 'error', icon: X },
    suggestion_edited: { label: 'Suggestion Edited', color: 'warning', icon: Edit },
    comment_added: { label: 'Comment Added', color: 'info', icon: MessageSquare },
    draft_updated: { label: 'Draft Updated', color: 'accent', icon: Save },
    review_approved: { label: 'Review Approved', color: 'success', icon: CheckCircle },
    review_rejected: { label: 'Changes Requested', color: 'warning', icon: Flag }
  }

  return (
    <div className="p-4 space-y-3">
      {events
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(event => {
          const config = eventTypeLabels[event.type] || { label: event.type, color: 'default', icon: Info }
          const Icon = config.icon
          return (
            <Card key={event.id} variant="outlined" className="p-4">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : config.color === 'error' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : config.color === 'warning' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : config.color === 'accent' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-primary)]' : 'bg-[var(--color-info-bg)] text-[var(--color-info)]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[var(--color-text-primary)]">{config.label}</h4>
                    <span className="text-xs text-[var(--color-text-muted)]">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">By: {event.reviewerId}</p>
                  {event.findingId && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Finding: {event.findingId.substring(0, 12)}...</p>
                  )}
                  {event.previousValue && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-[var(--color-text-muted)]">Previous: <span className="font-mono text-[var(--color-error)] line-through">{String(event.previousValue).substring(0, 100)}</span></p>
                      <p className="text-xs text-[var(--color-text-muted)]">New: <span className="font-mono text-[var(--color-success)]">{String(event.newValue).substring(0, 100)}</span></p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
    </div>
  )
}

function ConflictsTab({
  review,
  submission,
  guidelines,
  onUpdateFindingWithEdit,
  onUpdateFinding,
  onAcceptAll,
  onUpdateConflict
}: {
  review: Review
  submission: ContentSubmission
  guidelines: BrandGuideline[]
  onUpdateFindingWithEdit: (findingId: string, editedCorrection: string, reviewerComment?: string) => void
  onUpdateFinding: (findingId: string, status: ReviewFinding['status']) => void
  onAcceptAll: () => void
  onUpdateConflict: (conflictId: string, status: ReviewConflict['status'], resolution?: string) => void
}) {
  const conflicts = review.conflicts?.filter(c => c.status === 'unresolved') || []

  if (conflicts.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle className="w-16 h-16 text-[var(--color-success)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No conflicts to resolve</h3>
        <p className="text-[var(--color-text-muted)] mt-1">All overlapping findings have been resolved or have matching corrections.</p>
      </div>
    )
  }

  const getConflictFindings = (conflict: ReviewConflict) => {
    return conflict.findingIds.map(id => review.findings.find(f => f.id === id)).filter(Boolean) as ReviewFinding[]
  }

  const handleResolveConflict = async (conflict: ReviewConflict, resolution: 'keep_first' | 'keep_second' | 'custom', customCorrection?: string) => {
    const findings = getConflictFindings(conflict)
    if (findings.length < 2) return

    const firstFinding = findings[0]
    const secondFinding = findings[1]

    let acceptedFindingId: string
    let rejectedFindingId: string
    let finalCorrection: string
    let conflictResolution: ReviewConflict['status']

    if (resolution === 'keep_first') {
      acceptedFindingId = firstFinding.id
      rejectedFindingId = secondFinding.id
      finalCorrection = firstFinding.editedCorrection || firstFinding.suggestedCorrection
      conflictResolution = 'resolved_keep_first'
    } else if (resolution === 'keep_second') {
      acceptedFindingId = secondFinding.id
      rejectedFindingId = firstFinding.id
      finalCorrection = secondFinding.editedCorrection || secondFinding.suggestedCorrection
      conflictResolution = 'resolved_keep_second'
    } else {
      // Custom resolution - accept first with custom correction
      acceptedFindingId = firstFinding.id
      rejectedFindingId = secondFinding.id
      finalCorrection = customCorrection || firstFinding.editedCorrection || firstFinding.suggestedCorrection
      conflictResolution = 'resolved_custom'
    }

    // Update the accepted finding with the final correction
    await onUpdateFindingWithEdit(acceptedFindingId, finalCorrection)
    // Accept the chosen finding
    await onUpdateFinding(acceptedFindingId, 'accepted')
    // Reject the other finding
    await onUpdateFinding(rejectedFindingId, 'rejected')
    // Mark conflict as resolved
    await onUpdateConflict(conflict.id, conflictResolution, finalCorrection)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-4">
        <AlertTriangle className="w-6 h-6 text-[var(--color-warning)]" />
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} need resolution
        </h3>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Overlapping findings with different corrections were detected. Choose how to resolve each conflict.
      </p>

      <div className="space-y-4">
        {conflicts.map(conflict => {
          const conflictFindings = getConflictFindings(conflict)
          const firstFinding = conflictFindings[0]
          const secondFinding = conflictFindings[1]

          return (
            <Card key={conflict.id} variant="outlined" className="border-[var(--color-warning)]/50 bg-[var(--color-warning-bg)]">
              <CardContent className="p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-[var(--color-warning)] mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Conflict in characters {conflict.location.start}–{conflict.location.end}</span>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 font-mono text-sm overflow-x-auto">
                    <span className="text-[var(--color-text-muted)]">{conflict.location.context}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {conflictFindings.map((finding, idx) => (
                    <div key={finding.id} className={`p-3 rounded-lg border ${idx === 0 ? 'border-[var(--color-success)]/50 bg-[var(--color-success-bg)]' : 'border-[var(--color-error)]/50 bg-[var(--color-error-bg)]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={idx === 0 ? 'success' : 'error'} size="sm" dot>
                          Option {idx + 1}
                        </Badge>
                        <Badge variant="default" size="sm">{finding.severity}</Badge>
                        {finding.guidelineId && (
                          <Badge variant="accent" size="sm">
                            {guidelines.find(g => g.id === finding.guidelineId)?.name || 'Unknown'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">{finding.explanation}</p>
                      <div className="bg-[var(--color-bg-secondary)] p-2 rounded font-mono text-sm">
                        <div className="text-[var(--color-text-muted)]">Current text:</div>
                        <div className="text-[var(--color-error)] line-through">{submission.content.substring(finding.location?.start || 0, finding.location?.end || 0)}</div>
                        <div className="text-[var(--color-success)] mt-1">Suggested:</div>
                        <div className="text-[var(--color-success)] underline">{finding.editedCorrection || finding.suggestedCorrection}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleResolveConflict(conflict, 'keep_first')}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Keep Option 1
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleResolveConflict(conflict, 'keep_second')}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Keep Option 2
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const custom = prompt('Enter custom correction:', firstFinding.editedCorrection || firstFinding.suggestedCorrection)
                      if (custom !== null) {
                        handleResolveConflict(conflict, 'custom', custom)
                      }
                    }}
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Custom Resolution
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
