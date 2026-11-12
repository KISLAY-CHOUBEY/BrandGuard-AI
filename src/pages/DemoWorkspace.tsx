import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Save, LogOut, RefreshCw, FileText, ClipboardCheck,
  BookOpen, BarChart3, ChevronRight, X, ShieldCheck, Watch
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { formatDistanceToNow } from '@/utils/date'
import { Reveal } from '@/components/ui/Reveal'
import type { BrandGuideline, ContentSubmission, Review, ReviewFinding, ReviewConflict } from '@/types'
import { jsPDF } from 'jspdf'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved'
}

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success'> = {
  draft: 'info',
  in_review: 'warning',
  changes_requested: 'warning',
  approved: 'success'
}

export function DemoWorkspace() {
  const {
    isDemoMode, guidelines, submissions, reviews, settings,
    switchToNormal, resetDemo, updateFindingStatus, updateConflict,
    approveReview, requestChanges, addToast
  } = useApp()
  const navigate = useNavigate()

  const [openReviewId, setOpenReviewId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  // Redirect to the normal workspace when not in demo mode (kept out of render
  // to avoid calling navigate() during render, which can cause redirect loops).
  useEffect(() => {
    if (!isDemoMode) {
      navigate('/')
    }
  }, [isDemoMode, navigate])

  const totalFindings = reviews.reduce((sum, r) => sum + r.findings.length, 0)
  const pendingFindings = reviews.reduce((sum, r) => sum + r.findings.filter(f => f.status === 'pending').length, 0)
  const approvedReviews = reviews.filter(r => r.status === 'approved').length
  const pendingReviews = reviews.filter(r => r.status === 'changes_requested' || r.status === 'in_review').length
  const unresolvedConflicts = reviews.reduce((sum, r) => sum + r.conflicts.filter(c => c.status === 'unresolved').length, 0)

  const exportPdf = useCallback(async () => {
    setPdfLoading(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(30, 40, 50)
      doc.text('BrandGuard AI — Demo Workspace Export', 20, 22)
      doc.setFontSize(12)
      doc.setTextColor(100, 110, 120)
      doc.text('SAMPLE DATA — Fictional demonstration data, isolated from your real workspace', 20, 36)

      let y = 54
      doc.setFontSize(13)
      doc.setTextColor(30, 40, 50)
      doc.text('Summary', 20, y)
      y += 10
      doc.setFontSize(11)
      doc.text(`Guidelines: ${guidelines.length}`, 20, y); y += 8
      doc.text(`Content Submissions: ${submissions.length}`, 20, y); y += 8
      doc.text(`Reviews: ${reviews.length}`, 20, y); y += 8
      doc.text(`Approved Reviews: ${approvedReviews}`, 20, y); y += 8
      doc.text(`Pending Reviews: ${pendingReviews}`, 20, y); y += 8
      doc.text(`Findings: ${totalFindings} (${pendingFindings} pending)`, 20, y); y += 8
      doc.text(`Unresolved Conflicts: ${unresolvedConflicts}`, 20, y); y += 14

      doc.text('Guidelines', 20, y); y += 10
      for (const g of guidelines) {
        doc.setFontSize(11)
        doc.text(`• ${g.name} (${g.category}) — ${g.rules.length} rules`, 20, y)
        y += 8
        if (y > 270) { doc.addPage(); y = 30 }
      }
      y += 6

      doc.text('Submissions', 20, y); y += 10
      for (const s of submissions) {
        doc.setFontSize(11)
        doc.text(`• ${s.title} — ${STATUS_LABEL[s.status] ?? s.status}`, 20, y)
        y += 8
        if (y > 270) { doc.addPage(); y = 30 }
      }
      y += 6

      doc.text('Reviews', 20, y); y += 10
      for (const r of reviews) {
        const submission = submissions.find(s => s.id === r.submissionId)
        doc.setFontSize(11)
        doc.text(`• ${submission?.title ?? 'Untitled'} — Score ${r.overallScore}/100 — ${STATUS_LABEL[r.status] ?? r.status}`, 20, y)
        y += 8
        for (const f of r.findings) {
          doc.setFontSize(9)
          doc.text(`   - [${f.severity}] ${f.explanation}`, 24, y)
          y += 6
        }
        if (y > 270) { doc.addPage(); y = 30 }
      }

      doc.save('brandguard-demo-export.pdf')
      addToast({ type: 'success', message: 'Demo data exported to PDF' })
    } catch (error) {
      console.error('PDF export failed:', error)
      addToast({ type: 'error', message: 'PDF export failed' })
    } finally {
      setPdfLoading(false)
    }
  }, [guidelines, submissions, reviews, totalFindings, pendingFindings, approvedReviews, pendingReviews, unresolvedConflicts, addToast])

  const handleAcceptFinding = useCallback(async (reviewId: string, findingId: string) => {
    await updateFindingStatus(findingId, 'accepted')
    addToast({ type: 'success', message: 'Finding accepted' })
  }, [updateFindingStatus, addToast])

  const handleRejectFinding = useCallback(async (findingId: string) => {
    await updateFindingStatus(findingId, 'rejected')
    addToast({ type: 'info', message: 'Finding rejected' })
  }, [updateFindingStatus, addToast])

  const handleResolveConflict = useCallback(async (conflictId: string, status: ReviewConflict['status'], resolution?: string) => {
    await updateConflict(conflictId, status, resolution)
    addToast({ type: 'success', message: `Conflict ${status.replace('resolved_', '')}` })
  }, [updateConflict, addToast])

  const handleApproveReview = useCallback(async (reviewId: string) => {
    try {
      await approveReview(reviewId)
      addToast({ type: 'success', message: 'Review approved' })
    } catch (error) {
      addToast({ type: 'error', message: (error as Error).message || 'Cannot approve: unresolved conflicts' })
    }
  }, [approveReview, addToast])

  // Guard: never render the demo workspace while demo mode is inactive.
  // All hooks above are called unconditionally; this only affects what renders.
  if (!isDemoMode) return null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Demo header with SAMPLE DATA banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[var(--color-accent-primary)]" aria-hidden="true" />
            Demo Workspace
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            Isolated demonstration environment — sample data only, no AI or network calls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={pdfLoading} leftIcon={<Save className="w-4 h-4" />}>
            {pdfLoading ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Reset Demo
          </Button>
          <Button variant="secondary" size="sm" onClick={switchToNormal} leftIcon={<LogOut className="w-4 h-4" />}>
            Exit Demo
          </Button>
        </div>
      </div>

      {/* SAMPLE DATA callout banner */}
      <Reveal delay={0}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/50">
          <AlertTriangle className="w-5 h-5 mt-0.5 text-[var(--color-warning)] flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1">
              <span>SAMPLE DATA</span>
              <Badge variant="warning" size="sm">Fictional</Badge>
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              All guidelines, submissions, reviews and findings below are fictional sample data for
              demonstration. They are stored in a separate demo IndexedDB database and never touch
              your normal workspace data.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Stat cards */}
      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Guidelines</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{guidelines.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Submissions</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{submissions.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-bg)] text-[var(--color-accent-primary)] flex items-center justify-center">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Reviews</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{reviews.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">Unresolved Conflicts</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{unresolvedConflicts}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[var(--color-warning-bg)] text-[var(--color-warning)] flex items-center justify-center">
                <Watch className="w-5 h-5" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      {/* Guidelines section */}
      <Reveal delay={0.1}>
        <Card variant="elevated">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Guidelines</CardTitle>
              <CardDescription>Brand rules used for demo reviews</CardDescription>
            </div>
            <Link to="/guidelines" className="text-sm text-[var(--color-accent-primary)] hover:underline">
              Manage in Guidelines <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guidelines.map(g => (
                <div key={g.id} className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[var(--color-text-primary)]">{g.name}</h3>
                    <Badge size="sm">{g.category}</Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mb-3">{g.description}</p>
                  <div className="flex gap-2">
                    {g.rules.map(r => (
                      <Badge key={r.id} size="sm" className="text-[var(--color-text-secondary)]">
                        {r.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              {guidelines.length === 0 && (
                <p className="text-[var(--color-text-muted)] text-center py-8">No guidelines available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Submissions section */}
      <Reveal delay={0.15}>
        <Card variant="elevated">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Content Submissions</CardTitle>
              <CardDescription>Sample content submitted for review</CardDescription>
            </div>
            <Link to="/submit" className="text-sm text-[var(--color-accent-primary)] hover:underline">
              Manage in Submit <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.map(s => {
                const review = reviews.find(r => r.submissionId === s.id)
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--color-text-primary)]">{s.title}</h4>
                      <p className="text-sm text-[var(--color-text-muted)] truncate max-w-xs">{s.content.slice(0, 90)}…</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                        <span>{s.contentType}</span>
                        <Badge variant={STATUS_VARIANT[s.status] ?? 'info'} size="sm">
                          {STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                        {review && (
                          <Badge size="sm">Score {review.overallScore}/100</Badge>
                                                    )}
                      </div>
                    </div>
                    <Link to={`/reviews/${review?.id}`} className="text-[var(--color-accent-primary)] hover:underline text-sm">
                      View Review<ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                )
              })}
              {submissions.length === 0 && (
                <p className="text-[var(--color-text-muted)] text-center py-8">No submissions available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* Reviews section */}
      <Reveal delay={0.2}>
        <Card variant="elevated">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>Inspect findings, resolve conflicts, and approve</CardDescription>
            </div>
            <Link to="/reviews" className="text-sm text-[var(--color-accent-primary)] hover:underline">
              Manage in Reviews <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-[var(--color-text-muted)] text-center py-8">No reviews available.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(review => {
                  const submission = submissions.find(s => s.id === review.submissionId)
                  const pendingCount = review.findings.filter(f => f.status === 'pending').length
                  const hasUnresolved = review.conflicts.some(c => c.status === 'unresolved')
                  return (
                    <div key={review.id} className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-[var(--color-text-primary)]">{submission?.title ?? 'Untitled Content'}</h4>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            Score {review.overallScore}/100 • {review.findings.length} finding{review.findings.length !== 1 ? 's' : ''}
                            {pendingCount > 0 && ` • ${pendingCount} pending`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_VARIANT[review.status] ?? 'info'} size="sm">
                            {STATUS_LABEL[review.status] ?? review.status}
                          </Badge>
                          {hasUnresolved && <Badge variant="warning" size="sm">Unresolved Conflicts</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {formatDistanceToNow(review.createdAt)} ago
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setOpenReviewId(review.id)}>
                            Inspect
                          </Button>
                          {hasUnresolved ? (
                            <Button size="sm" variant="danger" disabled onClick={undefined}>
                              Approve Blocked
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleApproveReview(review.id)}>
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>

      {/* Review detail modal */}
      <Modal isOpen={!!openReviewId} onClose={() => setOpenReviewId(null)} size="lg" title="Review Details">
        {openReviewId && (() => {
          const review = reviews.find(r => r.id === openReviewId)
          const submission = submissions.find(s => s.id === review?.submissionId)
          if (!review) return null
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{submission?.title ?? 'Untitled Content'}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Score: {review.overallScore}/100 • {STATUS_LABEL[review.status] ?? review.status}</p>
                </div>
                <div className="flex gap-2">
                  {review.status === 'changes_requested' && !review.conflicts.some(c => c.status === 'unresolved') && (
                    <Button onClick={() => { handleApproveReview(review.id); setOpenReviewId(null) }}>Approve Review</Button>
                  )}
                  <Button variant="outline" onClick={() => { requestChanges(review.id); setOpenReviewId(null) }}>Request Changes</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Original Content</p>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap break-words">{submission?.content ?? ''}</p>
                </div>
                {review.revisedContent && (
                  <div className="bg-[var(--color-success-bg)]/50 border border-[var(--color-success)]/30 rounded-lg p-4">
                    <p className="text-xs font-medium text-[var(--color-success)] mb-1">Revised Content (after accepted changes)</p>
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap break-words">{review.revisedContent}</p>
                  </div>
                )}
              </div>

              {/* Findings */}
              <div>
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Findings ({review.findings.length})</h4>
                <div className="space-y-3">
                  {review.findings.map(f => (
                    <div key={f.id} className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--color-text-primary)]">{f.severity.toUpperCase()}</span>
                        <Badge variant={f.status === 'accepted' ? 'success' : f.status === 'rejected' ? 'error' : 'warning'} size="sm">
                          {f.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] mb-1">{f.explanation}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mb-2">
                        <span className="font-medium">Suggested:</span> {' ' + f.suggestedCorrection}
                      </p>
                      <div className="flex gap-2">
                        {f.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleAcceptFinding(review.id, f.id)}>Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejectFinding(f.id)}>Reject</Button>
                          </>
                        )}
                        {f.status !== 'pending' && (
                          <span className="text-xs text-[var(--color-text-muted)]">{f.status.charAt(0).toUpperCase() + f.status.slice(1)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {review.findings.length === 0 && (
                    <p className="text-[var(--color-text-muted)] text-center py-4">No findings.</p>
                  )}
                </div>
              </div>

              {/* Conflicts */}
              {review.conflicts.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Conflicts ({review.conflicts.filter(c => c.status === 'unresolved').length} unresolved)</h4>
                  <div className="space-y-3">
                    {review.conflicts.map(c => (
                      <div key={c.id} className="p-3 bg-[var(--color-warning-bg)]/50 border border-[var(--color-warning)]/30 rounded-lg">
                        <p className="text-sm text-[var(--color-text-primary)] mb-2">{c.location.context}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[var(--color-text-muted)]">Overlapping findings require resolution before approval</span>
                          <div className="flex gap-2 ml-auto">
                            <Button size="sm" onClick={() => handleResolveConflict(c.id, 'resolved_keep_first', 'Keep first correction')}>Keep First</Button>
                            <Button size="sm" onClick={() => handleResolveConflict(c.id, 'resolved_keep_second', 'Keep second correction')}>Keep Second</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit events */}
              {review.events.length > 0 && (
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Audit Trail</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {review.events.slice().reverse().map(e => (
                      <div key={e.id} className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                        <span className="w-16">{e.type.replace(/_/g, ' ')}</span>
                        <span>{e.newValue ?? ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}</Modal>

      {/* Confirm reset dialog */}
      <ConfirmDialog
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false)
          await resetDemo()
          addToast({ type: 'success', message: 'Demo data reset to sample state' })
        }}
        title="Reset Demo Workspace"
        message="This will clear all demo data and restore the original sample data. Your normal workspace data will not be affected."
        confirmText="Reset Demo"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Governance insights mini-card */}
      <Reveal delay={0.25}>
        <Card variant="outlined" className="border-[var(--color-accent-primary)]/50 bg-[var(--color-accent-bg)]/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-[var(--color-accent-primary)]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--color-text-primary)]">Governance Insights</h3>
                <p className="text-[var(--color-text-secondary)] mt-1 mb-4">
                  Review the full governance metrics in the normal workspace. Demo shows:
                  {reviews.length} reviews with {totalFindings} findings and {unresolvedConflicts} unresolved conflict(s).
                </p>
                <Link to="/governance" className="text-sm text-[var(--color-accent-primary)] hover:underline">
                  View Governance Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}
