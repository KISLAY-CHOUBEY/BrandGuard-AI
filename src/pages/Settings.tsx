import React, { useState, useCallback } from 'react'
import {
  Key, Shield, Database, Trash2,
  Check, AlertCircle, Info, RotateCcw, ExternalLink,
  Download, Upload, FileText
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { storage, type ExportData } from '@/services/storage'
import { Reveal } from '@/components/ui/Reveal'

export function Settings() {
  const { settings, updateSettings, initializeGemini } = useApp()
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'connected' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [exportData, setExportData] = useState<ExportData | null>(null)

  const handleTestApiKey = useCallback(async () => {
    setTestResult({ status: 'testing', message: 'Testing connection...' })

    try {
      // Test connection via API endpoint (uses server-side configured key)
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setTestResult({ status: 'connected', message: result.message })
      } else {
        setTestResult({ status: 'error', message: result.message })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      let message = 'Failed to validate server configuration'
      if (err.message.includes('Server configuration error')) message = 'Server not configured - GEMINI_API_KEY missing'
      else if (err.message.includes('quota') || err.message.includes('429')) message = 'Rate limited - please try again later'
      else if (err.message.includes('network') || err.message.includes('fetch')) message = 'Network error - check your connection'
      else message = err.message
      setTestResult({ status: 'error', message })
    }
  }, [])

  const handleExport = useCallback(async () => {
    try {
      const data = await storage.exportAllData()
      setExportData(data)
      setShowExportConfirm(true)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [])

  const handleDownloadExport = useCallback(() => {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `thronecaptures-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportConfirm(false)
    setExportData(null)
  }, [exportData])

  const handleImportFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setImportFile(file)
    setImportResult({ status: 'idle', message: '' })
  }, [])

  const handleImport = useCallback(async () => {
    if (!importFile) return
    setImportResult({ status: 'idle', message: 'Importing...' })
    try {
      const text = await importFile.text()
      const data = JSON.parse(text) as ExportData
      await storage.importAllData(data)
      setImportResult({ status: 'success', message: 'Data imported successfully. Reloading...' })
      setImportFile(null)
      // Reload the page to reflect imported data
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setImportResult({ status: 'error', message: error instanceof Error ? error.message : 'Import failed' })
    }
  }, [importFile])

  const getConnectionStatus = () => {
    switch (testResult.status) {
      case 'connected': return { label: 'Connected', variant: 'success' as const, icon: Check }
      case 'testing': return { label: 'Testing...', variant: 'info' as const, icon: RotateCcw }
      case 'error': return { label: 'Error', variant: 'error' as const, icon: AlertCircle }
      default: return { label: 'Not tested', variant: 'default' as const, icon: AlertCircle }
    }
  }

  const getStatusClass = (variant: string) => {
    switch (variant) {
      case 'success': return 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30 text-[var(--color-success)]'
      case 'error': return 'bg-[var(--color-error-bg)] border-[var(--color-error)]/30 text-[var(--color-error)]'
      case 'info': return 'bg-[var(--color-info-bg)] border-[var(--color-info)]/30 text-[var(--color-info)]'
      default: return 'bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-muted)]'
    }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <div className="space-y-6 animate-fade-in">
      <Reveal delay={0}>
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Settings</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Configure your preferences and API integrations</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        {/* AI Integration - Google Gemini */}
        <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>AI Integration â€” Google Gemini</CardTitle>
              <CardDescription>AI reviews are powered by a server-side Gemini API key configured in Vercel environment variables</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleTestApiKey} isLoading={testResult.status === 'testing'} leftIcon={<RotateCcw className="w-4 h-4" />}>
                Test Connection
              </Button>
            </div>

            {/* Connection Status */}
            <div className={`p-4 rounded-lg border flex items-center gap-3 ${getStatusClass(status.variant)}`}>
              <StatusIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm capitalize">{status.label}</p>
                {testResult.message && testResult.status !== 'idle' && (
                  <p className="text-sm mt-1 opacity-80">{testResult.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border)]">
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Security & Configuration</h4>
              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <div className="p-3 bg-[var(--color-info-bg)] border border-[var(--color-info)]/30 rounded-lg">
                  <p className="font-medium text-[var(--color-info)] flex items-center gap-2"><Shield className="w-4 h-4" /> How it works</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>The Gemini API key is configured <strong>server-side only</strong> — never in the browser.</li>
                    <li>Requests go through the server proxy (<code className="px-1 bg-[var(--color-bg-tertiary)] rounded">/api/gemini</code>) — the key never leaves the server.</li>
                    <li>No API key is stored in localStorage, IndexedDB, or sent from the frontend.</li>
                    <li>Only your content and guidelines are sent to the server for review.</li>
                  </ul>
                </div>

                <div className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30 rounded-lg">
                  <p className="font-medium text-[var(--color-warning)] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Local Development Setup</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>For local testing, add <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">GEMINI_API_KEY</code> to <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">.env.local</code> (gitignored).</li>
                    <li>Or: Set it in Vercel Dashboard → Project Settings → Environment Variables, then run <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">vercel env pull</code>.</li>
                    <li>Start the full-stack dev server: <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">vercel dev</code> (not <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">npm run dev</code>).</li>
                  </ul>
                </div>

                <div className="p-3 bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-lg">
                  <p className="font-medium text-[var(--color-success)] flex items-center gap-2"><Check className="w-4 h-4" /> Production (Vercel)</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Set <code className="px-1 bg-[var(--color-bg-tertiary)] rounded">GEMINI_API_KEY</code> in Vercel Project Settings → Environment Variables.</li>
                    <li>Deploy — the serverless function reads it automatically.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </Reveal>


      <Reveal delay={0.3}>
        {/* Data Management */}
        <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning-bg)] text-[var(--color-warning)] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Manage your local data storage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">Clear All Data</p>
              <p className="text-sm text-[var(--color-text-muted)]">Permanently delete all guidelines, submissions, reviews, and settings</p>
            </div>
            <Button variant="danger" onClick={() => setShowClearConfirm(true)} leftIcon={<Trash2 className="w-4 h-4" />}>
              Clear All Data
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-[var(--color-accent-primary)]" />
                <p className="font-medium text-[var(--color-text-primary)]">Export Data</p>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">Download a backup of all your guidelines, submissions, reviews, and audit trail</p>
            </div>
            <Button variant="outline" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
              Export Data
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-[var(--color-accent-primary)]" />
                <p className="font-medium text-[var(--color-text-primary)]">Import Data</p>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">Restore from a previously exported backup file (JSON format)</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="flex-1 text-sm"
                style={{ display: 'none' }}
                id="import-file-input"
                ref={(el) => { if (el) el.style.display = 'none' }}
              />
              <label htmlFor="import-file-input" className="flex-1">
                <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>
                  Choose File
                </Button>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Storage Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <StorageStat label="Guidelines" value="0" />
              <StorageStat label="Submissions" value="0" />
              <StorageStat label="Reviews" value="0" />
            </div>
          </div>
        </CardContent>
      </Card>
      </Reveal>

      <Reveal delay={0.4}>
        {/* Keyboard Shortcuts */}
        <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>Navigate ThroneCaptures faster with keyboard shortcuts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ShortcutRow keys="Ctrl + K" label="Open search" />
            <ShortcutRow keys="Ctrl + S" label="Save changes" />
            <ShortcutRow keys="Ctrl + /" label="Show shortcuts" />
            <ShortcutRow keys="Esc" label="Close modal / cancel" />
            <ShortcutRow keys="Ctrl + N" label="New submission" />
            <ShortcutRow keys="Ctrl + H" label="View history" />
          </div>
        </CardContent>
      </Card>
      </Reveal>

      <Reveal delay={0.5}>
        {/* About */}
        <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-info-bg)] text-[var(--color-info)] flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>About ThroneCaptures</CardTitle>
              <CardDescription>Version information and credits</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Version</span>
              <span className="font-mono text-[var(--color-text-primary)]">1.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Team</span>
              <span className="text-[var(--color-text-primary)]">ThroneCaptures</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Members</span>
              <span className="text-[var(--color-text-primary)]">Kislay Choubey, Aman Sapra</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Event</span>
              <span className="text-[var(--color-text-primary)]">CodeNexus Hackathon</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </Reveal>

      {/* Clear Data Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          await storage.clearAllData()
          await updateSettings({ defaultGuidelineIds: [] })
          setShowClearConfirm(false)
        }}
        title="Clear All Data"
        message="This will permanently delete all your guidelines, submissions, reviews, and settings. This action cannot be undone."
        variant="danger"
        confirmText="Clear Everything"
      />

      {/* Export Data Confirmation */}
      <ConfirmDialog
        isOpen={showExportConfirm}
        onClose={() => { setShowExportConfirm(false); setExportData(null) }}
        onConfirm={handleDownloadExport}
        title="Export Data"
        message="Download a complete backup of all your guidelines, submissions, reviews, findings, and audit trail as a JSON file. Your API key is NOT included in the export for security."
        variant="primary"
        confirmText="Download Backup"
      />

      {/* Import Data Confirmation */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        onClose={() => { setShowImportConfirm(false); setImportFile(null); setImportResult({ status: 'idle', message: '' }) }}
        onConfirm={handleImport}
        title="Import Data"
        message="This will replace all your current data with the imported backup. Your current API key will be preserved. This action cannot be undone."
        variant="danger"
        confirmText="Import Data"
        isLoading={importResult.status === 'idle' && importFile !== null}
      />
    </div>
  )
}

function StorageStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
      <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">{label}</p>
    </div>
  )
}

function ShortcutRow({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-xs font-mono font-medium text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded border border-[var(--color-border)]">{keys}</span>
    </div>
  )
}
