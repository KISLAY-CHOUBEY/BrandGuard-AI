import React, { useState, useMemo, useEffect } from 'react'
import {
  History as HistoryIcon, Search, Calendar, Download, Eye,
  FileText, ClipboardCheck, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { formatDistanceToNow, formatDate } from '@/utils/date'
import { Reveal } from '@/components/ui/Reveal'
import type { BrandGuideline, ContentSubmission, Review, ReviewEvent } from '@/types'

type HistoryItem =
  | (ContentSubmission & { type: 'submission' })
  | (Review & { type: 'review' })

export function History() {
  const { submissions, reviews, guidelines } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'changes_requested' | 'draft'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [viewingItem, setViewingItem] = useState<{type: 'submission' | 'review', id: string} | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const filteredHistory = useMemo(() => {
    const now = new Date()
    let cutoff: Date | null = null

    if (dateFilter === 'week') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (dateFilter === 'month') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    else if (dateFilter === 'year') cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const items = [
      ...submissions.map(s => ({ ...s, type: 'submission' as const })),
      ...reviews.map(r => ({ ...r, type: 'review' as const }))
    ]

    return items
      .filter(item => {
        const itemDate = new Date(item.type === 'submission' ? item.submittedAt : item.createdAt)
        if (cutoff && itemDate < cutoff) return false

        const matchesSearch = item.type === 'submission'
          ? item.title.toLowerCase().includes(searchTerm.toLowerCase())
          : submissions.find(s => s.id === item.submissionId)?.title.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const dateA = new Date(a.type === 'submission' ? a.submittedAt : a.createdAt).getTime()
        const dateB = new Date(b.type === 'submission' ? b.submittedAt : b.createdAt).getTime()
        return dateB - dateA
      })
  }, [submissions, reviews, searchTerm, statusFilter, dateFilter])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFilter])

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredHistory.slice(start, start + itemsPerPage)
  }, [filteredHistory, currentPage])

  // Stats
  const stats = useMemo(() => {
    const totalSubmissions = submissions.length
    const totalReviews = reviews.length
    const approvedReviews = reviews.filter(r => r.status === 'approved').length
    const avgScore = reviews.length > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length)
      : 0

    return [
      { label: 'Total Submissions', value: totalSubmissions, icon: FileText, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-bg)]' },
      { label: 'Total Reviews', value: totalReviews, icon: ClipboardCheck, color: 'text-[var(--color-accent-primary)]', bg: 'bg-[var(--color-accent-primary)]/10' },
      { label: 'Approved', value: approvedReviews, icon: CheckCircle, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]' },
      { label: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]' }
    ]
  }, [submissions, reviews])

  return (
    <div className="space-y-6 animate-fade-in">
      <Reveal delay={0}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">History</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">View all submissions and review history</p>
          </div>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export History
          </Button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} variant="elevated" hoverable>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        {/* Filters */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'approved' | 'changes_requested' | 'draft')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'approved', label: 'Approved' },
                { value: 'changes_requested', label: 'Changes Requested' },
                { value: 'draft', label: 'Draft' }
              ]}
              className="w-full sm:w-40"
            />
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month' | 'year')}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'week', label: 'Last Week' },
                { value: 'month', label: 'Last Month' },
                { value: 'year', label: 'Last Year' }
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.3}>
        {/* History List */}
        <Card variant="elevated">
          <CardContent className="p-0">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16">
              <HistoryIcon className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                {submissions.length === 0 && reviews.length === 0 ? 'No history yet' : 'No items match your filters'}
              </h3>
              <p className="text-[var(--color-text-muted)] mt-1">
                {submissions.length === 0 && reviews.length === 0
                  ? 'Submit content and run reviews to build your history.'
                  : 'Try adjusting your search or filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-[var(--color-border)]">
                {paginatedHistory.map((item) => (
                  <HistoryRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    submissions={submissions}
                    onView={() => setViewingItem({ type: item.type, id: item.id })}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-[var(--color-border)]">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Page {currentPage} of {totalPages} • {filteredHistory.length} items
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </Reveal>

      {/* Detail Modal */}
      {viewingItem && (
        <HistoryDetailModal
          item={viewingItem.type === 'submission'
            ? (submissions.find(s => s.id === viewingItem.id) as HistoryItem | undefined)
            : (reviews.find(r => r.id === viewingItem.id) as HistoryItem | undefined)}
          submissions={submissions}
          guidelines={guidelines}
          onClose={() => setViewingItem(null)}
        />
      )}
    </div>
  )
}

function HistoryRow({
  item,
  submissions,
  onView
}: {
  item: HistoryItem
  submissions: ContentSubmission[]
  onView: () => void
}) {
  const isSubmission = item.type === 'submission'
  const date = isSubmission ? item.submittedAt : item.createdAt
  const title = isSubmission ? item.title : submissions.find(s => s.id === item.submissionId)?.title || 'Unknown'

  const statusStyles = {
    draft: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
    in_review: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
    changes_requested: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    approved: 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
  }

  return (
    <div className="p-4 hover:bg-[var(--color-bg-tertiary)] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isSubmission ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' : 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]'}`}>
            {isSubmission ? <FileText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[var(--color-text-primary)] truncate">{title}</p>
            <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
              <Badge className={statusStyles[item.status as keyof typeof statusStyles]} size="sm">
                {item.status.replace('_', ' ')}
              </Badge>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDistanceToNow(date)}
              </span>
              {!isSubmission && (
                <Badge variant="accent" size="sm">Score: {item.overallScore}%</Badge>
              )}
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

import type { LucideIcon } from 'lucide-react'
import { Clock, CheckCircle, Check, History as HistoryIcon2, FileText as FileTextIcon, List, X, Edit, MessageSquare, Save, Flag } from 'lucide-react'

function HistoryDetailModal({
  item,
  submissions,
  guidelines,
  onClose
}: {
  item: HistoryItem | undefined
  submissions: ContentSubmission[]
  guidelines: BrandGuideline[]
  onClose: () => void
}) {
  if (!item) return null

  const isSubmission = item.type === 'submission'
  const date = isSubmission ? item.submittedAt : item.createdAt
  const title = isSubmission ? item.title : submissions.find(s => s.id === item.submissionId)?.title || 'Unknown'
  const selectedGuidelines = guidelines.filter(g => (isSubmission ? item.selectedGuidelineIds : item.guidelineIds).includes(g.id))
  const [activeTab, setActiveTab] = useState<'overview' | 'findings' | 'events' | 'content'>('overview')

  const tabs = isSubmission
    ? [
        { id: 'overview', label: 'Overview', icon: FileTextIcon },
        { id: 'content', label: 'Content', icon: List }
      ]
    : [
        { id: 'overview', label: 'Overview', icon: FileTextIcon },
        { id: 'findings', label: `Findings (${item.findings.length})`, icon: List },
        { id: 'events', label: `Events (${item.events?.length || 0})`, icon: HistoryIcon2 }
      ]

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
    <Modal isOpen={true} onClose={onClose} title={`${isSubmission ? 'Submission' : 'Review'} Details`} size="xl">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant={isSubmission ? 'info' : 'accent'} size="md">
                {isSubmission ? 'Submission' : 'Review'}
              </Badge>
              <Badge variant={item.status === 'approved' ? 'success' : item.status === 'changes_requested' ? 'warning' : 'info'} size="sm" dot>
                {item.status.replace('_', ' ')}
              </Badge>
              {!isSubmission && <Badge variant="accent" size="sm">Score: {item.overallScore}%</Badge>}
            </div>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            <p>Created: {formatDate(date)}</p>
            <p>{formatDistanceToNow(date)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--color-bg-secondary)] rounded-lg p-1 mb-4">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-inverse)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Guidelines Applied ({selectedGuidelines.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGuidelines.map(g => (
                      <Badge key={g.id} variant="accent" size="sm">{g.name}</Badge>
                    ))}
                    {selectedGuidelines.length === 0 && (
                      <span className="text-[var(--color-text-muted)] text-sm">No guidelines</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Details</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-muted)]">Type</dt>
                      <dd className="text-[var(--color-text-primary)] font-mono">{isSubmission ? item.contentType : 'AI Review'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-text-muted)]">Characters</dt>
                      <dd className="text-[var(--color-text-primary)]">{isSubmission ? item.content.length : '-'} chars</dd>
                    </div>
                    {!isSubmission && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-[var(--color-text-muted)]">Findings</dt>
                          <dd className="text-[var(--color-text-primary)]">{item.findings.length}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--color-text-muted)]">Pending</dt>
                          <dd className="text-[var(--color-warning)]">{item.findings.filter((f) => f.status === 'pending').length}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--color-text-muted)]">Accepted</dt>
                          <dd className="text-[var(--color-success)]">{item.findings.filter((f) => f.status === 'accepted').length}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--color-text-muted)]">Rejected</dt>
                          <dd className="text-[var(--color-error)]">{item.findings.filter((f) => f.status === 'rejected').length}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              </div>

              {isSubmission && (
                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Content Preview</h4>
                  <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                    {item.content.substring(0, 2000)}
                    {item.content.length > 2000 && '... (truncated)'}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSubmission && activeTab === 'findings' && item.findings.length > 0 && (
            <div className="space-y-2">
              {item.findings.map((finding) => {
                const guideline = guidelines.find(g => g.id === finding.guidelineId)
                const severity = finding.severity
                const severityColors = {
                  low: 'info',
                  medium: 'warning',
                  high: 'error',
                  critical: 'error'
                }
                return (
                  <div key={finding.id} className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
                    <Badge variant={severityColors[severity] as 'success' | 'error' | 'warning' | 'info' | 'default' | 'accent'} size="sm" dot>
                      {severity}
                    </Badge>
                    <span className="flex-1 text-sm text-[var(--color-text-secondary)]">{finding.explanation}</span>
                    {guideline && <Badge variant="accent" size="sm">{guideline.name}</Badge>}
                    <Badge variant={finding.status === 'accepted' ? 'success' : finding.status === 'rejected' ? 'error' : 'warning'} size="sm">
                      {finding.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}

          {!isSubmission && activeTab === 'events' && (
            <div className="space-y-3">
              {(item.events || []).length === 0 ? (
                <div className="text-center py-16">
                  <HistoryIcon2 className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">No events recorded</h3>
                  <p className="text-[var(--color-text-muted)] mt-1">Audit trail will appear here as actions are taken.</p>
                </div>
              ) : (
                (item.events || [])
                  .slice()
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map(event => {
                    const config = eventTypeLabels[event.type] || { label: event.type, color: 'default', icon: FileTextIcon }
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
                  })
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}