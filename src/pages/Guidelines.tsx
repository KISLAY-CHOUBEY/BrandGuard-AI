import React, { useState, useEffect } from 'react'
import {
  Plus, Filter, Search, Edit, Trash2, Eye,
  BookOpen, Type, Accessibility, Layers, Mic, Scale, Settings
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { generateId } from '@/services/storage'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/Modal'
import { GuidelineCategory, BrandGuideline } from '@/types'
import { Reveal } from '@/components/ui/Reveal'

const categoryIcons: Record<GuidelineCategory, React.ComponentType<{className?: string}>> = {
  tone: Type,
  terminology: BookOpen,
  accessibility: Accessibility,
  formatting: Layers,
  brand_voice: Mic,
  legal: Scale,
  custom: Settings
}

const categoryLabels: Record<GuidelineCategory, string> = {
  tone: 'Tone',
  terminology: 'Terminology',
  accessibility: 'Accessibility',
  formatting: 'Formatting',
  brand_voice: 'Brand Voice',
  legal: 'Legal',
  custom: 'Custom'
}

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'tone', label: 'Tone' },
  { value: 'terminology', label: 'Terminology' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'formatting', label: 'Formatting' },
  { value: 'brand_voice', label: 'Brand Voice' },
  { value: 'legal', label: 'Legal' },
  { value: 'custom', label: 'Custom' }
]

export function Guidelines() {
  const { guidelines, createGuideline, updateGuideline, deleteGuideline, toggleGuidelineActive } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<GuidelineCategory | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGuideline, setEditingGuideline] = useState<BrandGuideline | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const filteredGuidelines = guidelines.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleCreateGuideline = async (data: Omit<BrandGuideline, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createGuideline(data)
    setShowCreateModal(false)
  }

  const handleUpdateGuideline = async (data: Partial<BrandGuideline>) => {
    if (editingGuideline) {
      await updateGuideline(editingGuideline.id, data)
      setEditingGuideline(null)
    }
  }

  const handleDeleteGuideline = async () => {
    if (deleteConfirm) {
      await deleteGuideline(deleteConfirm)
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Reveal delay={0}>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Brand Guidelines</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Create and manage brand consistency rules</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
            Create Guideline
          </Button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* Search & Filter Toolbar */}
        <Card variant="outlined" padding="md">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search guidelines by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1 min-w-0"
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as GuidelineCategory | 'all')}
              options={categoryOptions}
              className="w-full sm:w-52"
            />
            {guidelines.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                className="whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </Card>
      </Reveal>

      <Reveal delay={0.2}>
        {/* Guidelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGuidelines.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={BookOpen}
              title={guidelines.length === 0 ? 'No guidelines yet' : 'No guidelines match your filters'}
              description={guidelines.length === 0
                ? 'Create your first brand guideline to start reviewing content for consistency.'
                : 'Try adjusting your search or filter criteria.'}
              action={guidelines.length === 0 ? (
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
                  Create Your First Guideline
                </Button>
              ) : null}
            />
          </div>
        ) : (
          filteredGuidelines.map(guideline => (
            <GuidelineCard
              key={guideline.id}
              guideline={guideline}
              onEdit={setEditingGuideline}
              onDelete={() => setDeleteConfirm(guideline.id)}
              onToggleActive={() => toggleGuidelineActive(guideline.id)}
            />
          ))
        )}
        </div>
      </Reveal>

      {/* Create/Edit Modal */}
      <GuidelineModal
        isOpen={showCreateModal || !!editingGuideline}
        onClose={() => { setShowCreateModal(false); setEditingGuideline(null); }}
        guideline={editingGuideline}
        onSubmit={editingGuideline ? handleUpdateGuideline : handleCreateGuideline}
        title={editingGuideline ? 'Edit Guideline' : 'Create Guideline'}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteGuideline}
        title="Delete Guideline"
        message="Are you sure you want to delete this guideline? This action cannot be undone."
        variant="danger"
      />
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{className?: string}>;
  title: string;
  description: string;
  action?: React.ReactNode
}) {
  return (
    <Card variant="outlined" className="py-12">
      <div className="text-center">
        <Icon className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
        <p className="text-[var(--color-text-muted)] mt-1 max-w-md mx-auto">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </Card>
  )
}

function GuidelineCard({
  guideline,
  onEdit,
  onDelete,
  onToggleActive
}: {
  guideline: BrandGuideline
  onEdit: (g: BrandGuideline) => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const CategoryIcon = categoryIcons[guideline.category]
  const totalRules = guideline.rules.length
  const highSeverityRules = guideline.rules.filter(r => r.severity === 'high' || r.severity === 'critical').length

  return (
    <Card variant="elevated" hoverable>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-primary)]/10 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-[var(--color-accent-primary)]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[var(--color-text-primary)] truncate">{guideline.name}</h3>
              <Badge variant={guideline.isActive ? 'success' : 'default'} size="sm" dot>
                {guideline.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <Badge variant="accent" size="sm" className="flex-shrink-0">{categoryLabels[guideline.category]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[var(--color-text-secondary)] text-sm mb-4 line-clamp-2">{guideline.description}</p>
        <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {totalRules} rule{totalRules !== 1 ? 's' : ''}
          </span>
          {highSeverityRules > 0 && (
            <span className="flex items-center gap-1 text-[var(--color-warning)]">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/></svg>
              {highSeverityRules} high severity
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={() => onEdit(guideline)} aria-label="Edit guideline">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleActive} aria-label={guideline.isActive ? 'Deactivate' : 'Activate'}>
            {guideline.isActive ? <Eye className="w-4 h-4" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete guideline" className="text-[var(--color-error)] hover:bg-[var(--color-error-bg)] ml-auto">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

function GuidelineModal({
  isOpen,
  onClose,
  guideline,
  onSubmit,
  title
}: {
  isOpen: boolean
  onClose: () => void
  guideline: BrandGuideline | null
  onSubmit: (data: Omit<BrandGuideline, 'id' | 'createdAt' | 'updatedAt'>) => void
  title: string
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'tone' as GuidelineCategory,
    rules: [] as Array<{title: string; description: string; severity: 'low' | 'medium' | 'high' | 'critical'; correctExamples: string; incorrectExamples: string}>
  })

  useEffect(() => {
    if (guideline) {
      setFormData({
        name: guideline.name,
        description: guideline.description,
        category: guideline.category,
        rules: guideline.rules.map(r => ({
          title: r.title,
          description: r.description,
          severity: r.severity,
          correctExamples: r.examples.correct.join('\n'),
          incorrectExamples: r.examples.incorrect.join('\n')
        }))
      })
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'tone',
        rules: [{ title: '', description: '', severity: 'medium', correctExamples: '', incorrectExamples: '' }]
      })
    }
  }, [guideline, isOpen])

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, { title: '', description: '', severity: 'medium', correctExamples: '', incorrectExamples: '' }]
    }))
  }

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }))
  }

  const updateRule = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((r, i) => i === index ? { ...r, [field]: value } : r)
    })
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const rules = formData.rules.map(r => ({
      id: generateId(),
      title: r.title,
      description: r.description,
      severity: r.severity,
      examples: {
        correct: r.correctExamples.split('\n').filter(Boolean),
        incorrect: r.incorrectExamples.split('\n').filter(Boolean)
      }
    }))
    onSubmit({ ...formData, rules, isActive: true })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Brand Voice Guidelines" required />
          <Select label="Category" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as GuidelineCategory }))} options={Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))} />
        </div>
        <div className="w-full">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this guideline covers..."
            rows={3}
            className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent resize-y min-h-[100px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-[var(--color-text-primary)]">Rules</h4>
            <Button type="button" variant="outline" size="sm" onClick={addRule} leftIcon={<Plus className="w-4 h-4" />}>
              Add Rule
            </Button>
          </div>
          <div className="space-y-4">
            {formData.rules.map((rule, index) => (
              <div key={index} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-text-primary)]">Rule #{index + 1}</span>
                  {formData.rules.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeRule(index)} className="text-[var(--color-error)]">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Title" value={rule.title} onChange={(e) => updateRule(index, 'title', e.target.value)} placeholder="e.g., Avoid passive voice" required />
                  <Select label="Severity" value={rule.severity} onChange={(e) => updateRule(index, 'severity', e.target.value)} options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' }
                  ]} />
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Description</label>
                  <textarea
                    value={rule.description}
                    onChange={(e) => updateRule(index, 'description', e.target.value)}
                    placeholder="Explain the rule..."
                    rows={2}
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent resize-y min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Correct Examples (one per line)</label>
                    <textarea
                      value={rule.correctExamples}
                      onChange={(e) => updateRule(index, 'correctExamples', e.target.value)}
                      placeholder="We actively develop solutions.\nOur team creates innovative products."
                      rows={3}
                      className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent resize-y min-h-[100px]"
                    />
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Incorrect Examples (one per line)</label>
                    <textarea
                      value={rule.incorrectExamples}
                      onChange={(e) => updateRule(index, 'incorrectExamples', e.target.value)}
                      placeholder="Solutions are developed by us.\nInnovative products are created by our team."
                      rows={3}
                      className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:border-transparent resize-y min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" leftIcon={<Plus className="w-4 h-4" />}>{guideline ? 'Save Changes' : 'Create Guideline'}</Button>
        </div>
      </form>
    </Modal>
  )
}

