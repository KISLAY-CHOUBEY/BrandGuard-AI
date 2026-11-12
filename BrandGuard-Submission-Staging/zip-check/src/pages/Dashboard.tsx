import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, ClipboardCheck, BookOpen,
  ArrowRight, Plus, Clock, CheckCircle, Settings, History
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from '@/utils/date'
import { Reveal } from '@/components/ui/Reveal'

const statCards = [
  { label: 'Total Guidelines', icon: BookOpen, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-bg)]' },
  { label: 'Content Submitted', icon: FileText, color: 'text-[var(--color-accent-primary)]', bg: 'bg-[var(--color-accent-primary)]/10' },
  { label: 'Reviews Completed', icon: ClipboardCheck, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]' },
  { label: 'Pending Approvals', icon: Clock, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]' }
]

export function Dashboard() {
  const { guidelines, submissions, reviews } = useApp()
  const [recentActivity, setRecentActivity] = useState<Array<{id: string; type: string; title: string; time: string; status?: string}>>([])

  useEffect(() => {
    const activities = [
      ...submissions.slice(0, 3).map(s => ({
        id: s.id,
        type: 'submission',
        title: s.title,
        time: s.submittedAt,
        status: s.status
      })),
      ...reviews.slice(0, 3).map(r => ({
        id: r.id,
        type: 'review',
        title: `Review #${r.id.slice(-6)}`,
        time: r.createdAt,
        status: r.status
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    setRecentActivity(activities.slice(0, 5))
  }, [submissions, reviews])

  const stats = [
    { value: guidelines.length, ...statCards[0] },
    { value: submissions.length, ...statCards[1] },
    { value: reviews.filter(r => r.status === 'approved').length, ...statCards[2] },
    { value: reviews.filter(r => r.status === 'changes_requested' || r.status === 'in_review').length, ...statCards[3] }
  ]

  const pendingReviews = reviews.filter(r => r.status === 'changes_requested' || r.status === 'in_review')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Overview of your brand consistency workflow</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" leftIcon={<Plus className="w-4 h-4" />} asChild>
            <Link to="/guidelines">Create Guideline</Link>
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} asChild>
            <Link to="/submit">Submit Content</Link>
          </Button>
        </div>
      </div>

      <Reveal delay={0}>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Reviews</CardTitle>
                  <CardDescription>Content awaiting your approval or changes</CardDescription>
                </div>
                {pendingReviews.length > 0 && <Badge variant="warning" size="sm">{pendingReviews.length} pending</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              {pendingReviews.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-[var(--color-success)] mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">All caught up!</h3>
                  <p className="text-[var(--color-text-muted)] mt-1">No pending reviews at the moment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.map(review => {
                    const submission = submissions.find(s => s.id === review.submissionId)
                    const highFindings = review.findings.filter(f => f.severity === 'high' || f.severity === 'critical').length

                    return (
                      <div key={review.id} className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition-colors">
                        <div className="flex-1 min-w-0">
                          <Link to={`/reviews/${review.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] transition-colors">
                            {submission?.title || 'Untitled Content'}
                          </Link>
                          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDistanceToNow(review.createdAt)}
                            </span>
                            <Badge variant={highFindings > 0 ? 'error' : 'warning'} size="sm">
                              {review.findings.length} findings
                              {highFindings > 0 && ` (${highFindings} high)`}
                            </Badge>
                            <Badge variant={review.status === 'in_review' ? 'info' : 'warning'} size="sm">
                              {review.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {review.status === 'changes_requested' && (
                            <Button size="sm" asChild>
                              <Link to={`/reviews/${review.id}`}>Review</Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/reviews/${review.id}`}>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/submit" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent-primary)]/50 transition-all duration-200 hover:-translate-y-1">
                <Plus className="w-5 h-5 mb-2 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-secondary)] transition-colors" aria-hidden="true" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Submit Content</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1 text-center">Send content for AI review</span>
              </Link>
              <Link to="/guidelines" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent-primary)]/50 transition-all duration-200 hover:-translate-y-1">
                <BookOpen className="w-5 h-5 mb-2 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-secondary)] transition-colors" aria-hidden="true" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Create Guideline</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1 text-center">Set brand consistency rules</span>
              </Link>
              <Link to="/reviews" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent-primary)]/50 transition-all duration-200 hover:-translate-y-1">
                <ClipboardCheck className="w-5 h-5 mb-2 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-secondary)] transition-colors" aria-hidden="true" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">View Reviews</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1 text-center">Check pending approvals</span>
              </Link>
              <Link to="/history" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent-primary)]/50 transition-all duration-200 hover:-translate-y-1">
                <History className="w-5 h-5 mb-2 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-secondary)] transition-colors" aria-hidden="true" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Review History</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1 text-center">See past submissions</span>
              </Link>
              <Link to="/settings" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-accent-primary)]/50 transition-all duration-200 hover:-translate-y-1">
                <Settings className="w-5 h-5 mb-2 text-[var(--color-accent-primary)] group-hover:text-[var(--color-accent-secondary)] transition-colors" aria-hidden="true" />
                <span className="font-medium text-[var(--color-text-primary)] text-sm">Configure Settings</span>
                <span className="text-xs text-[var(--color-text-muted)] mt-1 text-center">Manage API keys & themes</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest submissions and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4" />
                <p className="text-[var(--color-text-muted)]">No recent activity. Start by submitting content or creating guidelines.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.type === 'submission' ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' : 'bg-[var(--color-success-bg)] text-[var(--color-success)]'}`}>
                        {activity.type === 'submission' ? <FileText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text-primary)]">{activity.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {activity.type === 'submission' ? 'Content submitted' : 'Review completed'}
                          {activity.status && ` • ${activity.status.replace('_', ' ')}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">{formatDistanceToNow(activity.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  )
}