import React, { useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, FileText, Clock, Users } from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDistanceToNow } from '@/utils/date'
import { Severity, GovernanceMetrics, Review, ReviewFinding, BrandGuideline } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

export function Governance() {
  const { reviews, submissions, guidelines } = useApp()

  const metrics = useMemo((): GovernanceMetrics => {
    const allFindings = reviews.flatMap(r => r.findings)
    const pendingReviews = reviews.filter(r => r.status === 'in_review' || r.status === 'changes_requested').length
    const approvedReviews = reviews.filter(r => r.status === 'approved').length

    // Findings by severity
    const findingsBySeverity: Record<Severity, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    }
    allFindings.forEach(f => { findingsBySeverity[f.severity]++ })

    // Findings by category
    const findingsByCategory: Record<string, number> = {}
    allFindings.forEach(f => {
      const guideline = guidelines.find(g => g.id === f.guidelineId)
      if (guideline) {
        findingsByCategory[guideline.category] = (findingsByCategory[guideline.category] || 0) + 1
      }
    })

    // Top violated rules
    const ruleCounts: Record<string, { count: number; ruleTitle: string; guidelineName: string }> = {}
    allFindings.forEach(f => {
      const guideline = guidelines.find(g => g.id === f.guidelineId)
      const rule = guideline?.rules.find(r => r.id === f.ruleId)
      if (guideline && rule) {
        const key = f.ruleId
        if (!ruleCounts[key]) {
          ruleCounts[key] = { count: 0, ruleTitle: rule.title, guidelineName: guideline.name }
        }
        ruleCounts[key].count++
      }
    })
    const topViolatedRules = Object.entries(ruleCounts)
      .map(([ruleId, data]) => ({ ruleId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Review activity (last 30 days)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentReviews = reviews.filter(r => new Date(r.createdAt) >= thirtyDaysAgo)
    const activityMap: Record<string, number> = {}
    recentReviews.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0]
      activityMap[date] = (activityMap[date] || 0) + 1
    })
    const reviewActivity = Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Acceptance/Rejection rates
    const resolvedFindings = allFindings.filter(f => f.status !== 'pending')
    const acceptedCount = resolvedFindings.filter(f => f.status === 'accepted').length
    const rejectedCount = resolvedFindings.filter(f => f.status === 'rejected').length
    const totalResolved = resolvedFindings.length
    const acceptanceRate = totalResolved > 0 ? Math.round((acceptedCount / totalResolved) * 100) : 0
    const rejectionRate = totalResolved > 0 ? Math.round((rejectedCount / totalResolved) * 100) : 0

    // Average score
    const scoresSum = reviews.reduce((sum, r) => sum + r.overallScore, 0)
    const averageScore = reviews.length > 0 ? Math.round(scoresSum / reviews.length) : 0

    return {
      totalReviews: reviews.length,
      totalFindings: allFindings.length,
      findingsBySeverity,
      findingsByCategory,
      acceptanceRate,
      rejectionRate,
      pendingReviews,
      approvedReviews,
      topViolatedRules,
      reviewActivity,
      averageScore
    }
  }, [reviews, submissions, guidelines])

  const statCards = [
    { label: 'Total Reviews', value: metrics.totalReviews, icon: FileText, color: 'info' },
    { label: 'Total Findings', value: metrics.totalFindings, icon: AlertTriangle, color: 'warning' },
    { label: 'Pending Reviews', value: metrics.pendingReviews, icon: Clock, color: 'warning' },
    { label: 'Approved Reviews', value: metrics.approvedReviews, icon: CheckCircle, color: 'success' },
    { label: 'Acceptance Rate', value: `${metrics.acceptanceRate}%`, icon: TrendingUp, color: 'success' },
    { label: 'Rejection Rate', value: `${metrics.rejectionRate}%`, icon: TrendingDown, color: 'error' },
    { label: 'Avg Score', value: `${metrics.averageScore}%`, icon: BarChart3, color: 'accent' },
    { label: 'Active Guidelines', value: guidelines.filter(g => g.isActive).length, icon: Users, color: 'info' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <Reveal delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Governance Insights</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Track brand compliance trends and review performance</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {statCards.map((stat, index) => (
            <Card key={stat.label} variant="elevated" className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : stat.color === 'error' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' : stat.color === 'warning' ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]' : stat.color === 'accent' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent-primary)]' : 'bg-[var(--color-info-bg)] text-[var(--color-info)]'}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        {/* Findings by Severity */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Findings by Severity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(metrics.findingsBySeverity) as [Severity, number][]).map(([severity, count]) => {
              const severityConfig = {
                low: { color: 'info', label: 'Low' },
                medium: { color: 'warning', label: 'Medium' },
                high: { color: 'error', label: 'High' },
                critical: { color: 'error', label: 'Critical' }
              }[severity]
              return (
                <div key={severity} className="text-center p-4 bg-[var(--color-bg-secondary)] rounded-lg">
                  <p className="text-3xl font-bold text-[var(--color-text-primary)]">{count}</p>
                  <Badge variant={severityConfig.color as 'success' | 'error' | 'warning' | 'info' | 'default' | 'accent'} size="sm" className="mt-1">
                    {severityConfig.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.3}>
        {/* Findings by Category */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Findings by Category</h2>
          {Object.entries(metrics.findingsByCategory).length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No findings yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(metrics.findingsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="accent" size="sm" className="capitalize">{category}</Badge>
                      <span className="text-[var(--color-text-secondary)]">{count} findings</span>
                    </div>
                    <div className="w-48 h-2 bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent-primary)] transition-all duration-500"
                        style={{ width: `${(count / Math.max(...Object.values(metrics.findingsByCategory))) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal delay={0.4}>
        {/* Top Violated Rules */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Top Violated Rules</h2>
          {metrics.topViolatedRules.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No violations yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.topViolatedRules.map((rule, index) => (
                <div key={rule.ruleId} className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent-primary)] text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">{rule.ruleTitle}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{rule.guidelineName}</p>
                    </div>
                  </div>
                  <Badge variant="warning" size="md">{rule.count} violations</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Reveal>

      <Reveal delay={0.5}>
        {/* Review Activity (Last 30 Days) */}
        <Card variant="elevated" padding="lg">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Review Activity (Last 30 Days)</h2>
          {metrics.reviewActivity.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.reviewActivity
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(({ date, count }) => (
                  <div key={date} className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">{new Date(date).toLocaleDateString()}</span>
                    <Badge variant="accent" size="sm">{count} review{count !== 1 ? 's' : ''}</Badge>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  )
}