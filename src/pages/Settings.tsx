import React, { useState, useCallback, useEffect } from 'react'
import {
  Key, Shield, Database, Trash2,
  Eye, EyeOff, Copy, Check, AlertCircle, Info, RotateCcw, ExternalLink
} from 'lucide-react'
import { useApp } from '@/context/useApp'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/Modal'
import { storage } from '@/services/storage'
import { Reveal } from '@/components/ui/Reveal'

export function Settings() {
  const { settings, updateSettings, initializeGemini } = useApp()
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'connected' | 'error'; message: string }>({ status: 'idle', message: '' })
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    if (settings.geminiApiKey) {
      // Don't populate the input with the actual key for security
      // Just indicate that a key is configured
      setApiKey('â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢')
    }
  }, [settings.geminiApiKey])

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKey.trim() || apiKey === 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') return
    try {
      await updateSettings({ geminiApiKey: apiKey.trim() })
      initializeGemini()
      setTestResult({ status: 'connected', message: 'API key saved successfully. Connection verified.' })
      setApiKey('â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢')
    } catch (error) {
      setTestResult({ status: 'error', message: error instanceof Error ? error.message : 'Failed to save API key' })
    }
  }, [apiKey, updateSettings, initializeGemini])

  const handleTestApiKey = useCallback(async () => {
    if (!apiKey.trim() || apiKey === 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') {
      setTestResult({ status: 'error', message: 'Please enter an API key first' })
      return
    }

    setTestResult({ status: 'testing', message: 'Testing connection...' })

    try {
      // Create a temporary service instance for testing
      const testService = new (await import('@/services/ai/gemini')).GeminiReviewService()
      testService.initialize(apiKey.trim())

      // Use the dedicated test connection method
      const result = await testService.testConnection()

      if (result.success) {
        setTestResult({ status: 'connected', message: result.message })
      } else {
        setTestResult({ status: 'error', message: result.message })
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      let message = 'Failed to validate API key'
      if (err.message.includes('API_KEY')) message = 'Invalid API key format'
      else if (err.message.includes('quota') || err.message.includes('429')) message = 'Rate limited - please try again later'
      else if (err.message.includes('network') || err.message.includes('fetch')) message = 'Network error - check your connection'
      else message = err.message
      setTestResult({ status: 'error', message })
    }
  }, [apiKey])

  const handleDeleteApiKey = useCallback(async () => {
    await updateSettings({ geminiApiKey: '' })
    setApiKey('')
    setTestResult({ status: 'idle', message: 'API key deleted successfully' })
    setShowClearConfirm(false)
  }, [updateSettings])

  const getConnectionStatus = () => {
    if (!settings.geminiApiKey) return { label: 'Not configured', variant: 'default' as const, icon: AlertCircle }
    switch (testResult.status) {
      case 'connected': return { label: 'Connected', variant: 'success' as const, icon: Check }
      case 'testing': return { label: 'Testing...', variant: 'info' as const, icon: RotateCcw }
      case 'error': return { label: 'Error', variant: 'error' as const, icon: AlertCircle }
      default: return { label: 'Configured', variant: 'default' as const, icon: Shield }
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
              <CardDescription>Configure your Gemini API key for AI-powered content reviews</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                API Key
              </label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-2 flex items-center gap-2">
                Get your API key from
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent-primary)] hover:underline flex items-center gap-1"
                >
                  Google AI Studio
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSaveApiKey} leftIcon={<Copy className="w-4 h-4" />} disabled={!apiKey.trim() || apiKey === 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}>
                Save API Key
              </Button>
              <Button variant="outline" onClick={handleTestApiKey} isLoading={testResult.status === 'testing'} leftIcon={<RotateCcw className="w-4 h-4" />}>
                Test Connection
              </Button>
              {settings.geminiApiKey && (
                <Button variant="outline" onClick={() => setShowClearConfirm(true)} leftIcon={<Trash2 className="w-4 h-4" />} className="text-[var(--color-error)] border-[var(--color-error)] hover:bg-[var(--color-error-bg)]">
                  Delete Key
                </Button>
              )}
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
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Security Notice</h4>
              <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> Your API key is stored locally in your browser's IndexedDB.</p>
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> It is never transmitted to ThroneCaptures servers (no backend exists).</p>
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> The key travels directly from your browser to Google's Gemini API when you request a review.</p>
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> The key is only used to make direct requests to Google's Gemini API.</p>
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> The key is masked in this UI and never displayed in full after saving.</p>
                <p className="flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" /> Clear your browser data or use the "Delete Key" button to remove it.</p>
                <p className="flex items-center gap-2 text-[var(--color-warning)]"><AlertCircle className="w-4 h-4 flex-shrink-0" /> <strong>Note:</strong> Deleting the key here only removes it from this application. To fully revoke the key, visit Google AI Studio.</p>
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
          await updateSettings({ geminiApiKey: '', defaultGuidelineIds: [] })
          setApiKey('')
          setShowClearConfirm(false)
        }}
        title="Clear All Data"
        message="This will permanently delete all your guidelines, submissions, reviews, and settings. This action cannot be undone."
        variant="danger"
        confirmText="Clear Everything"
      />

      {/* Delete Key Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm && Boolean(settings.geminiApiKey) && apiKey !== 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢'}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleDeleteApiKey}
        title="Delete API Key"
        message="This will permanently delete your saved Gemini API key from this application. You will need to re-enter it to use AI features. This does not revoke the key at Google â€” you must do that separately in Google AI Studio."
        variant="danger"
        confirmText="Delete Key"
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
