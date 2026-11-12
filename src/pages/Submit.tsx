import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Send, Loader2, AlertCircle,
  Eye, Plus, Clock, CheckCircle, Sparkles, Target, Zap
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDistanceToNow } from '@/utils/date'
import { Reveal } from '@/components/ui/Reveal'
import type { ContentSubmission, BrandGuideline, ContentFormData } from '@/types'

export function Submit() {
  const { guidelines, submissions, createSubmission, startReview } = useApp()
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const [reviewingSubmission, setReviewingSubmission] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewProgress, setReviewProgress] = useState<{ step: number; message: string } | null>(null)

  const activeGuidelines = guidelines.filter(g => g.isActive)

  const handleSubmit = async (data: { title: string; content: string; contentType: 'text' | 'markdown' | 'html'; selectedGuidelineIds: string[] }) => {
    await createSubmission(data)
    setShowSubmitModal(false)
  }

  const reviewSteps = [
    { step: 1, message: 'Analyzing content against guidelines...' },
    { step: 2, message: 'Checking tone & voice consistency...' },
    { step: 3, message: 'Validating terminology & formatting...' },
    { step: 4, message: 'Generating findings & suggestions...' },
    { step: 5, message: 'Finalizing review results...' }
  ]

  const handleStartReview = async (submissionId: string) => {
    setReviewingSubmission(submissionId)
    setIsReviewing(true)
    setReviewProgress({ step: 0, message: 'Starting review...' })

    // Simulate progress updates
    let currentStep = 0
    const progressInterval = setInterval(() => {
      if (currentStep < reviewSteps.length - 1) {
        currentStep++
        setReviewProgress(reviewSteps[currentStep])
      }
    }, 800)

    try {
      await startReview(submissionId)
      setReviewProgress({ step: reviewSteps.length, message: 'Review complete!' })
    } catch (error) {
      console.error('Review failed:', error)
      setReviewProgress({ step: -1, message: 'Review failed. Please try again.' })
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setIsReviewing(false)
        setReviewingSubmission(null)
        setReviewProgress(null)
      }, 1000)
    }
  }

  const recentSubmissions = [...submissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  const viewingSubmissionItem = submissions.find(s => s.id === viewingSubmission)

  // Review Progress Component
  const ReviewProgressIndicator = () => {
    if (!reviewProgress) return null
    const isError = reviewProgress.step === -1
    const isComplete = reviewProgress.step === reviewSteps.length
    const progressPercent = isError ? 0 : isComplete ? 100 : (reviewProgress.step / reviewSteps.length) * 100

    return (
      <Card variant="outlined" className={`border-[var(--color-accent-primary)]/50 bg-[var(--color-accent-bg)]/10 animate-slide-up ${isError ? 'border-[var(--color-error)]/50 bg-[var(--color-error-bg)]/10' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-primary)]/20 flex items-center justify-center flex-shrink-0">
              {isError ? (
                <AlertCircle className="w-6 h-6 text-[var(--color-error)]" />
              ) : isComplete ? (
                <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
              ) : (
                <Loader2 className="w-6 h-6 text-[var(--color-accent-primary)] animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-[var(--color-text-primary)]">
                  {isError ? 'Review Failed' : isComplete ? 'Review Complete' : 'AI Review in Progress'}
                </p>
                {!isError && !isComplete && (
                  <span className="text-sm text-[var(--color-text-muted)]">{Math.round(progressPercent)}%</span>
                )}
              </div>
              <p className="text-[var(--color-text-secondary)] text-sm mb-3">{reviewProgress.message}</p>
              <div className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isError ? 'bg-[var(--color-error)]' : isComplete ? 'bg-[var(--color-success)]' : 'bg-[var(--color-accent-primary)]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              {!isError && !isComplete && (
                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  {reviewSteps.map((step, idx) => (
                    <span
                      key={step.step}
                      className={`flex items-center gap-1 transition-colors ${
                        idx < reviewProgress.step ? 'text-[var(--color-success)]' :
                        idx === reviewProgress.step ? 'text-[var(--color-accent-primary)] font-medium' :
                        'text-[var(--color-text-muted)]'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx < reviewProgress.step ? 'bg-[var(--color-success)] text-white' :
                        idx === reviewProgress.step ? 'bg-[var(--color-accent-primary)] text-white' :
                        'bg-[var(--color-bg-tertiary)]'
                      }`}>
                        {step.step}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {reviewProgress && <Reveal delay={0}><ReviewProgressIndicator /></Reveal>}
      <Reveal delay={0}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Submit Content</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Submit content for AI-powered brand consistency review</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowSubmitModal(true)} disabled={activeGuidelines.length === 0}>
            {activeGuidelines.length === 0 ? 'Create Guidelines First' : 'New Submission'}
          </Button>
        </div>
      </Reveal>

      {activeGuidelines.length === 0 && (
        <Reveal delay={0.1}>
          <Card variant="outlined" className="border-[var(--color-accent-primary)]/50 bg-[var(--color-accent-bg)]/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[var(--color-accent-primary)]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <span>Welcome to BrandGuard AI</span>
                    <Badge variant="accent" size="sm">Get Started</Badge>
                  </h3>
                  <p className="text-[var(--color-text-secondary)] mt-2 mb-4">
                    Create your first brand guideline to define the rules for AI-powered content review.
                    Once you have active guidelines, you can submit content for automated consistency checking.
                  </p>
                  <Button leftIcon={<Plus className="w-4 h-4" />} asChild>
                    <Link to="/guidelines">Create First Guideline</Link>
                  </Button>
                </div>
              </div>

              {/* 3-Step Workflow Guide */}
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-text-muted)] mb-4">Your workflow:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Define Guidelines</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">Create rules for tone, terminology, style, and formatting</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-accent-bg)] text-[var(--color-accent-primary)] flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Submit Content</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">Paste your content and select which guidelines to apply</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">Review & Approve</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">AI finds issues, you accept/reject/edit, then approve</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      )}

      {/* Submissions List */}
      <Reveal delay={0.2}>
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>{submissions.length} total submissions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No submissions yet</h3>
              <p className="text-[var(--color-text-muted)] mt-1">Submit your first piece of content for review.</p>
              <Button leftIcon={<Plus className="w-4 h-4" />} className="mt-4" onClick={() => setShowSubmitModal(true)} disabled={activeGuidelines.length === 0}>
                Create Submission
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map(submission => {
                const selectedGuidelines = guidelines.filter(g => submission.selectedGuidelineIds.includes(g.id))

                return (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    selectedGuidelines={selectedGuidelines}
                    onView={() => setViewingSubmission(submission.id)}
                    onReview={() => handleStartReview(submission.id)}
                    isReviewing={isReviewing && reviewingSubmission === submission.id}
                    canReview={submission.status === 'draft' && activeGuidelines.length > 0}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </Reveal>

      {/* Submit Modal */}
      <SubmitModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        guidelines={activeGuidelines}
        onSubmit={handleSubmit}
      />

      {/* View Submission Modal */}
      {viewingSubmissionItem && (
        <ViewSubmissionModal
          submission={viewingSubmissionItem}
          guidelines={guidelines}
          onClose={() => setViewingSubmission(null)}
        />
      )}
    </div>
  )
}

function SubmissionCard({
  submission,
  selectedGuidelines,
  onView,
  onReview,
  isReviewing,
  canReview
}: {
  submission: ContentSubmission
  selectedGuidelines: BrandGuideline[]
  onView: () => void
  onReview: () => void
  isReviewing: boolean
  canReview: boolean
}) {
  const statusStyles = {
    draft: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
    in_review: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
    changes_requested: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    approved: 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-medium text-[var(--color-text-primary)] truncate">{submission.title}</h3>
          <Badge className={statusStyles[submission.status as keyof typeof statusStyles]} size="sm">
            {submission.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-[var(--color-text-muted)] flex-wrap">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {submission.contentType}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {submission.content.length} chars
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDistanceToNow(submission.submittedAt)}
          </span>
        </div>
        {selectedGuidelines.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedGuidelines.slice(0, 3).map(g => (
              <Badge key={g.id} variant="default" size="sm">{g.name}</Badge>
            ))}
            {selectedGuidelines.length > 3 && (
              <Badge variant="default" size="sm">+{selectedGuidelines.length - 3} more</Badge>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={onView} aria-label="View submission">
          <Eye className="w-4 h-4" />
        </Button>
        {canReview && (
          <Button size="sm" onClick={onReview} isLoading={isReviewing} leftIcon={isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}>
            Review
          </Button>
        )}
      </div>
    </div>
  )
}

function SubmitModal({
  isOpen,
  onClose,
  guidelines,
  onSubmit
}: {
  isOpen: boolean
  onClose: () => void
  guidelines: BrandGuideline[]
  onSubmit: (data: ContentFormData) => void
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'text' as 'text' | 'markdown' | 'html',
    selectedGuidelineIds: [] as string[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.content.trim()) newErrors.content = 'Content is required'
    if (formData.selectedGuidelineIds.length === 0) newErrors.guidelines = 'Select at least one guideline'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit(formData)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Submit Content for Review" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g., Q4 Marketing Campaign Copy"
          error={errors.title}
          required
        />
        <Select
          label="Content Type"
          value={formData.contentType}
          onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value as 'text' | 'markdown' | 'html' }))}
          options={[
            { value: 'text', label: 'Plain Text' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'html', label: 'HTML' }
          ]}
        />
        <Textarea
          label="Content"
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          placeholder="Paste your content here..."
          rows={10}
          error={errors.content}
          required
        />
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Select Guidelines ({formData.selectedGuidelineIds.length} selected)
          </label>
          {errors.guidelines && <p className="text-sm text-[var(--color-error)] mb-2">{errors.guidelines}</p>}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {guidelines.map(g => (
              <label key={g.id} className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-border-light)] transition-colors">
                <input
                  type="checkbox"
                  checked={formData.selectedGuidelineIds.includes(g.id)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    selectedGuidelineIds: e.target.checked
                      ? [...prev.selectedGuidelineIds, g.id]
                      : prev.selectedGuidelineIds.filter(id => id !== g.id)
                  }))}
                  className="w-4 h-4 accent-[var(--color-accent-primary)]"
                />
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-text-primary)]">{g.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{g.description}</p>
                </div>
                <Badge variant="accent" size="sm">{g.rules.length} rules</Badge>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" leftIcon={<Send className="w-4 h-4" />}>Submit for Review</Button>
        </div>
      </form>
    </Modal>
  )
}

function ViewSubmissionModal({
  submission,
  guidelines,
  onClose
}: {
  submission: ContentSubmission
  guidelines: BrandGuideline[]
  onClose: () => void
}) {
  const selectedGuidelines = guidelines.filter(g => submission.selectedGuidelineIds.includes(g.id))

  return (
    <Modal isOpen={true} onClose={onClose} title={submission.title} size="xl">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant={submission.status === 'approved' ? 'success' : submission.status === 'changes_requested' ? 'warning' : 'info'} size="sm">
            {submission.status.replace('_', ' ')}
          </Badge>
          <Badge variant="default" size="sm">{submission.contentType}</Badge>
          <Badge variant="default" size="sm">{submission.content.length} characters</Badge>
        </div>

        <div>
          <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Guidelines Applied</h4>
          <div className="flex flex-wrap gap-2">
            {selectedGuidelines.map(g => (
              <Badge key={g.id} variant="accent" size="sm">{g.name}</Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Content</h4>
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
            {submission.content}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
