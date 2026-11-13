import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { AppProvider } from '@/context/AppContext'
import { useApp } from '@/context/useApp'
import { Settings } from './Settings'
import { storage } from '@/services/storage'
import { geminiService } from '@/services/ai/gemini'
import { openDB } from 'idb'

vi.mock('idb', () => {
  const stores = new Map<string, Map<string, unknown>>()
  const createMockDB = () => ({
    getAll: vi.fn(async () => []),
    get: vi.fn(async () => undefined),
    put: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    getAllFromIndex: vi.fn(async () => []),
    getFromIndex: vi.fn(async () => undefined),
    transaction: vi.fn(() => ({
      store: { put: vi.fn(), clear: vi.fn() },
      objectStore: vi.fn(() => ({ put: vi.fn(), clear: vi.fn() })),
      done: Promise.resolve(),
    })),
  })
  const openDB = vi.fn(async () => createMockDB())
  ;(openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores = stores
  return { openDB }
})

const mockStores = (openDB as unknown as { __stores: Map<string, Map<string, unknown>> }).__stores

const mockSaveSettings = vi.spyOn(storage, 'saveSettings')
const mockInitialize = vi.spyOn(geminiService, 'initialize')

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)

// Simulates in-app navigation: Settings unmounts/remounts while AppProvider (and the
// shared BYOK key in it) stays alive.
function NavigationHarness() {
  const [show, setShow] = React.useState(true)
  return (
    <div>
      <button onClick={() => setShow(false)}>navigate-away</button>
      <button onClick={() => setShow(true)}>return</button>
      {show && <Settings />}
    </div>
  )
}

describe('Settings BYOK key persistence across navigation', () => {
  beforeEach(() => {
    mockStores.set('submissions', new Map())
    mockSaveSettings.mockClear()
    mockInitialize.mockClear()
  })

  it('should keep the API key input populated across navigate-away → return', async () => {
    const user = userEvent.setup()
    render(<NavigationHarness />, { wrapper })

    const input = screen.getByLabelText('Gemini API Key') as HTMLInputElement
    await user.type(input, 'saved-key-123')
    await user.click(screen.getByRole('button', { name: 'Save / Connect' }))

    await user.click(screen.getByRole('button', { name: 'navigate-away' }))
    await user.click(screen.getByRole('button', { name: 'return' }))

    const inputAgain = screen.getByLabelText('Gemini API Key') as HTMLInputElement
    expect(inputAgain.value).toBe('saved-key-123')
    expect(mockSaveSettings).not.toHaveBeenCalled()
  })

  it('should clear the key input and shared state on Clear Key', async () => {
    const user = userEvent.setup()
    render(<NavigationHarness />, { wrapper })

    const input = screen.getByLabelText('Gemini API Key') as HTMLInputElement
    await user.type(input, 'saved-key-123')
    await user.click(screen.getByRole('button', { name: 'Save / Connect' }))

    const clearButton = screen.getByRole('button', { name: 'Clear Key' }) as HTMLButtonElement
    expect(clearButton.disabled).toBe(false)
    await user.click(clearButton)

    expect(input.value).toBe('')
  })
})
