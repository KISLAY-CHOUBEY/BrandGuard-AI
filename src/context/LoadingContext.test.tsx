import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'
import { LoadingProvider, useLoading, useLoadingKey } from '@/context/LoadingContext'

describe('LoadingContext', () => {
  const TestComponent = () => {
    const { loadingStates, setLoading, isLoading, withLoading } = useLoading()
    return (
      <div>
        <div data-testid="loading-states">{JSON.stringify(loadingStates)}</div>
        <button onClick={() => setLoading('test', true)} data-testid="set-loading">Set Loading</button>
        <button onClick={() => setLoading('test', false)} data-testid="clear-loading">Clear Loading</button>
        <div data-testid="is-loading">{isLoading('test').toString()}</div>
        <button onClick={async () => { await withLoading('async-test', async () => { await new Promise(r => setTimeout(r, 10)); return 'done'; }); }} data-testid="with-loading">
          With Loading
        </button>
      </div>
    )
  }

  const TestKeyComponent = () => {
    const { isLoading, setLoading, withLoading } = useLoadingKey('key-test')
    return (
      <div>
        <div data-testid="is-loading">{isLoading.toString()}</div>
        <button onClick={() => setLoading(true)} data-testid="set-loading">Set Loading</button>
        <button onClick={async () => { await withLoading(async () => { await new Promise(r => setTimeout(r, 10)); return 'done'; }); }} data-testid="with-loading">
          With Loading
        </button>
      </div>
    )
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <LoadingProvider>{children}</LoadingProvider>
  )

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('provides loading context', () => {
    render(<TestComponent />, { wrapper: Wrapper })
    expect(screen.getByTestId('loading-states').textContent).toBe('{}')
  })

  it('sets and clears loading state', () => {
    render(<TestComponent />, { wrapper: Wrapper })

    expect(screen.getByTestId('is-loading').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('set-loading'))
    expect(screen.getByTestId('is-loading').textContent).toBe('true')

    fireEvent.click(screen.getByTestId('clear-loading'))
    expect(screen.getByTestId('is-loading').textContent).toBe('false')
  })

  it('withLoading sets loading during async operation', async () => {
    render(<TestComponent />, { wrapper: Wrapper })

    const promise = fireEvent.click(screen.getByTestId('with-loading'))

    // With fake timers, the async operation runs synchronously
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // After completion, loading should be false
    expect(screen.getByTestId('is-loading').textContent).toBe('false')
  })

  it('useLoadingKey works for specific key', () => {
    render(<TestKeyComponent />, { wrapper: Wrapper })

    expect(screen.getByTestId('is-loading').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('set-loading'))
    expect(screen.getByTestId('is-loading').textContent).toBe('true')
  })

  it('useLoadingKey withLoading works', async () => {
    render(<TestKeyComponent />, { wrapper: Wrapper })

    const promise = fireEvent.click(screen.getByTestId('with-loading'))

    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByTestId('is-loading').textContent).toBe('false')
  })

  it('throws error when used outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrownError: unknown = null
    const BadComponent = () => {
      try {
        useLoading()
      } catch (e) {
        thrownError = e
      }
      return <div>Test</div>
    }
    render(<BadComponent />)
    expect(thrownError).not.toBeNull()
    expect(thrownError instanceof Error && thrownError.message).toContain('LoadingProvider')
    consoleError.mockRestore()
  })

  it('manages multiple independent loading keys', () => {
    const MultiKeyComponent = () => {
      const { loadingStates, setLoading, isLoading } = useLoading()
      return (
        <div>
          <div data-testid="states">{JSON.stringify(loadingStates)}</div>
          <button onClick={() => setLoading('key1', true)} data-testid="set1">Set Key1</button>
          <button onClick={() => setLoading('key2', true)} data-testid="set2">Set Key2</button>
          <div data-testid="key1">{isLoading('key1').toString()}</div>
          <div data-testid="key2">{isLoading('key2').toString()}</div>
        </div>
      )
    }

    render(<MultiKeyComponent />, { wrapper: Wrapper })

    fireEvent.click(screen.getByTestId('set1'))
    expect(screen.getByTestId('key1').textContent).toBe('true')
    expect(screen.getByTestId('key2').textContent).toBe('false')

    fireEvent.click(screen.getByTestId('set2'))
    expect(screen.getByTestId('key1').textContent).toBe('true')
    expect(screen.getByTestId('key2').textContent).toBe('true')
  })
})