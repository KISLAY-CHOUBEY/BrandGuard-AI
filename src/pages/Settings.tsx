import React, { useState, useCallback, useEffect } from 'react'
import {
  Key, Shield, Database, Trash2,
  Check, AlertCircle, Info, RotateCcw, ExternalLink,
  Download, Upload, FileText, Eye, EyeOff, Save, X, Loader2
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Modal'
import { storage, type ExportData } from '@/services/storage'
import { Reveal } from '@/components/ui/Reveal'
import { Input } from '@/components/ui/Input'

export function Settings() {
  const { settings, updateSettings, initializeGemini, userGeminiApiKey, setUserGeminiApiKey, clearUserGeminiApiKey } = useApp()
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'connected' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [exportData, setExportData] = useState<ExportData | null>(null)
  // BYOK state
  const [userApiKey, setUserApiKey] = useState<string>(userGeminiApiKey ?? '')

  // Keep the local input in sync with the shared BYOK key so the value survives
  // in-app navigation (Settings remounts; AppProvider does not). The key stays
  // in memory only — never persisted to storage or exports.
  useEffect(() => {
    setUserApiKey(userGeminiApiKey ?? '')
  }, [userGeminiApiKey])
  const [showKey, setShowKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'not-configured' | 'testing' | 'connected' | 'invalid-key' | 'error'>('not-configured')
  const [isSaving, setIsSaving] = useState(false)

  // Sync connection status from testResult and userGeminiApiKey
  useEffect(() => {
    if (userGeminiApiKey) {
      if (testResult.status === 'connected') {
        setConnectionStatus('connected')
      } else if (testResult.status === 'testing') {
        setConnectionStatus('testing')
      } else if (testResult.status === 'error') {
        // Don't overwrite 'invalid-key' with generic 'error' - invalid-key is more specific
        setConnectionStatus(prev => prev === 'invalid-key' ? 'invalid-key' : 'error')
      } else {
        setConnectionStatus('not-configured')
      }
    } else {
      setConnectionStatus('not-configured')
    }
  }, [userGeminiApiKey, testResult])

  const handleSaveKey = useCallback(async () => {
    if (!userApiKey.trim()) return
    setIsSaving(true)
    try {
      setUserGeminiApiKey(userApiKey.trim())
      initializeGemini()
      setConnectionStatus('not-configured')
      setTestResult({ status: 'idle', message: 'Key saved. Click Test Connection to verify.' })
    } finally {
      setIsSaving(false)
    }
  }, [userApiKey, setUserGeminiApiKey, initializeGemini])

  const handleClearKey = useCallback(() => {
    setUserApiKey('')
    clearUserGeminiApiKey()
    setConnectionStatus('not-configured')
    setTestResult({ status: 'idle', message: '' })
  }, [clearUserGeminiApiKey])

  const handleTestApiKey = useCallback(async (keyToTest?: string) => {
    // If a specific key is provided, use it; otherwise use the saved BYOK key.
    // If neither exists, we still call the endpoint to test the server-side fallback.
    const key = keyToTest ?? userGeminiApiKey ?? ''

    setTestResult({ status: 'testing', message: 'Testing connection...' })
    setConnectionStatus('testing')

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (key) {
        headers['x-gemini-api-key'] = key
      }
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'test' })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setTestResult({ status: 'connected', message: result.message })
        setConnectionStatus('connected')
      } else {
        setTestResult({ status: 'error', message: result.message })
        setConnectionStatus('invalid-key')
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      let message = 'Connection test failed'
      let status: 'error' | 'invalid-key' = 'error'
      if (err.message.includes('401') || err.message.includes('403') || err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('unauthorized')) {
        message = 'Invalid API key'
        status = 'invalid-key'
      } else if (err.message.includes('quota') || err.message.includes('429')) {
        message = 'Rate limited - please try again later'
        status = 'error'
      } else if (err.message.includes('network') || err.message.includes('fetch')) {
        message = 'Network error - check your connection'
        status = 'error'
      } else {
        message = err.message
        status = 'error'
      }
      setTestResult({ status: 'error', message })
      setConnectionStatus(status)
    }
  }, [userGeminiApiKey])

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
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      setImportResult({ status: 'error', message: error instanceof Error ? error.message : 'Import failed' })
    }
  }, [importFile])

  const getConnectionStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected': return { label: 'Connected', variant: 'success' as const, icon: Check, description: 'Your API key is working correctly' }
      case 'testing': return { label: 'Testing...', variant: 'info' as const, icon: RotateCcw, description: 'Validating your API key...' }
      case 'invalid-key': return { label: 'Invalid Key', variant: 'error' as const, icon: AlertCircle, description: 'The provided API key is not valid' }
      case 'error': return { label: 'Error', variant: 'error' as const, icon: AlertCircle, description: testResult.message || 'Connection test failed' }
      default: return { label: 'Not Configured', variant: 'default' as const, icon: AlertCircle, description: 'No BYOK key provided. Click Test Connection to verify server-side fallback (Vercel GEMINI_API_KEY).' }
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

  const connStatus = getConnectionStatusConfig()
  const StatusIcon = connStatus.icon

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
              <CardTitle>AI Integration — Google Gemini</CardTitle>
              <CardDescription>AI reviews are powered by a server-side Gemini API key configured in Vercel environment variables, or bring your own key (BYOK) for session-only use</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* BYOK Section */}
          <div className="space-y-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <h4 className="font-medium text-[var(--color-text-primary)] flex items-center gap-2">
              <Key className="w-5 h-5" />
              Bring Your Own API Key (BYOK)
            </h4>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Enter your own Gemini API key for this session only. The key is kept in memory and never persisted to disk or exported.
              If no key is provided, the server-side fallback (Vercel GEMINI_API_KEY) will be used.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter your Gemini API key..."
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="pr-12"
                  aria-label="Gemini API Key"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Button
                onClick={handleSaveKey}
                disabled={isSaving || !userApiKey.trim()}
                leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              >
                {isSaving ? 'Saving...' : 'Save / Connect'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearKey}
                disabled={!userGeminiApiKey}
                leftIcon={<X className="w-4 h-4" />}
              >
                Clear Key
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => handleTestApiKey()}
                isLoading={testResult.status === 'testing' || connectionStatus === 'testing'}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Test Connection
              </Button>
            </div>

            {/* Connection Status */}
            <div className={`p-4 rounded-lg border flex items-center gap-3 ${getStatusClass(connStatus.variant)}`}>
              <StatusIcon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm capitalize">{connStatus.label}</p>
                <p className="text-sm mt-1 opacity-80">{connStatus.description}</p>
              </div>
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
                  <li><strong>BYOK keys are session-only</strong> — they are kept in memory and lost on refresh/close.</li>
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
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Team</span>
              <span className="text-[var(--color-text-primary)]">ThroneCaptures</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-lg">
              <span className="text-[var(--color-text-secondary)]">Members</span>
              <span className="text-[var(--color-text-primary)]">Kislay Choubey, Aman Sapra</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg">
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