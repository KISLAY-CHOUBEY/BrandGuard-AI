import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { LoadingProvider } from '@/context/LoadingContext'
import { Dashboard } from '@/pages/Dashboard'
import { Guidelines } from '@/pages/Guidelines'
import { Submit } from '@/pages/Submit'
import { Reviews } from '@/pages/Reviews'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { Governance } from '@/pages/Governance'
import { storage } from '@/services/storage/index'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock idb
vi.mock('idb', () => {
  const stores = new Map<string, Map<string, unknown>>()
  return {
    openDB: vi.fn(async () => ({
      getAll: vi.fn(async (storeName: string) => Array.from(stores.get(storeName)?.values() || [])),
      get: vi.fn(async (storeName: string, id: string) => stores.get(storeName)?.get(id)),
      put: vi.fn(async (storeName: string, value: { id: string }) => {
        if (!stores.has(storeName)) stores.set(storeName, new Map())
        stores.get(storeName)!.set(value.id, value)
      }),
      delete: vi.fn(async (storeName: string, id: string) => stores.get(storeName)?.delete(id)),
      getAllFromIndex: vi.fn(async (storeName: string, indexName: string, query?: unknown) => {
        const propMap: Record<string, string> = {
          'by-submission': 'submissionId',
          'by-review': 'reviewId',
          'by-category': 'category',
          'by-active': 'isActive',
          'by-status': 'status',
          'by-guideline': 'guidelineId',
        }
        const prop = propMap[indexName] || indexName
        const store = stores.get(storeName) || new Map()
        let results = Array.from(store.values())
        if (query !== undefined && prop) {
          results = results.filter((item: Record<string, unknown>) => item[prop] === query)
        }
        return results
      }),
      transaction: vi.fn((storeNames: string | string[]) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames]
        const txStores: Map<string, Map<string, unknown>> = new Map()
        names.forEach(name => {
          if (!stores.has(name)) stores.set(name, new Map())
          txStores.set(name, stores.get(name)!)
        })
        return {
          store: {
            put: (value: { id: string }) => txStores.get(names[0])?.set(value.id, value),
            clear: () => txStores.get(names[0])?.clear(),
          },
          objectStore: (name: string) => ({
            put: (value: { id: string }) => (txStores.get(name) || new Map()).set(value.id, value),
            clear: () => (txStores.get(name) || new Map()).clear(),
          }),
          done: Promise.resolve(),
        }
      }),
    }))
  }
})

// Test wrapper with all providers using MemoryRouter
const TestWrapper = ({ initialEntries = ['/'] }: { initialEntries?: string[] }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AppProvider>
      <LoadingProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/governance" element={<Governance />} />
        </Routes>
      </LoadingProvider>
    </AppProvider>
  </MemoryRouter>
)

describe('Integration Tests - User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Data Persistence Flow', () => {
    it('should export and import data correctly', async () => {
      await storage.saveSettings({ geminiApiKey: 'test-key', theme: 'dark' })

      const exportData = await storage.exportAllData()
      expect(exportData.settings.theme).toBe('dark')
      expect(exportData.settings.geminiApiKey).toBe('')

      await storage.clearAllData()
      await storage.importAllData(exportData)

      const settings = await storage.getSettings()
      expect(settings.theme).toBe('dark')
    })

    it('should allow updating theme setting', async () => {
      await storage.saveSettings({ theme: 'light' })
      const settings = await storage.getSettings()
      expect(settings.theme).toBe('light')
    })
  })

  describe('Dashboard Page', () => {
    it('should render dashboard title', async () => {
      render(<TestWrapper initialEntries={['/']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Dashboard')
      })
    })
  })

  describe('Guidelines Page', () => {
    it('should render guidelines title', async () => {
      render(<TestWrapper initialEntries={['/guidelines']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Brand Guidelines')
      })
    })
  })

  describe('Submit Page', () => {
    it('should render submit content title', async () => {
      render(<TestWrapper initialEntries={['/submit']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Submit Content')
      })
    })
  })

  describe('Reviews Page', () => {
    it('should render reviews title', async () => {
      render(<TestWrapper initialEntries={['/reviews']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Reviews')
      })
    })
  })

  describe('History Page', () => {
    it('should render history title', async () => {
      render(<TestWrapper initialEntries={['/history']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('History')
      })
    })
  })

  describe('Settings Page', () => {
    it('should render settings title', async () => {
      render(<TestWrapper initialEntries={['/settings']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Settings')
      })
    })
  })

  describe('Governance Page', () => {
    it('should render governance title', async () => {
      render(<TestWrapper initialEntries={['/governance']} />)

      await waitFor(() => {
        const heading = document.querySelector('h1')
        expect(heading?.textContent).toBe('Governance Insights')
      })
    })
  })
})