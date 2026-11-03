import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Send, Loader2, AlertCircle,
  Eye, Plus
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

  const activeGuidelines = guidelines.filter(g => g.isActive)

  const handleSubmit = async (data: { title: string; content: string; contentType: 'text' | 'markdown' | 'html'; selectedGuidelineIds: string[] }) => {
    await createSubmission(data)
    setShowSubmitModal(false)
  }

  const handleStartReview = async (submissionId: string) => {
    setReviewingSubmission(submissionId)
    setIsReviewing(true)
    try {
      await startReview(submissionId)
    } catch (error) {
      console.error('Review failed:', error)
    } finally {
      setIsReviewing(false)
      setReviewingSubmission(null)
    }
  }

  const recentSubmissions = [...submissions].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  const viewingSubmissionItem = submissions.find(s => s.id === viewingSubmission)

  return (
    <div className="space-y-6 animate-fade-in">
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
          <Card variant="outlined" className="border-[var(--color-warning)]/50 bg-[var(--color-warning-bg)]">
            <CardContent className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-[var(--color-warning)] flex-shrink-0" />
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">No active guidelines found</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Create at least one active guideline in the <Link to="/guidelines" className="text-[var(--color-accent-primary)] hover:underline">Guidelines</Link> section before submitting content.</p>
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

import { Clock } from 'lucide-react'

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
