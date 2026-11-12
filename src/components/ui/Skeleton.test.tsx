import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTableRow, LoadingSpinner, LoadingOverlay } from './Skeleton'

describe('Skeleton components', () => {
  describe('Skeleton', () => {
    it('renders with default props', () => {
      render(<Skeleton />)
      expect(document.body).toBeTruthy()
    })

    it('applies variant classes', () => {
      const { container } = render(<Skeleton variant="circular" />)
      expect((container.firstChild as HTMLElement)?.className).toContain('rounded-full')
    })

    it('applies width and height', () => {
      const { container } = render(<Skeleton width="200px" height="50px" />)
      const div = container.firstChild as HTMLElement
      expect(div.style.width).toBe('200px')
      expect(div.style.height).toBe('50px')
    })

    it('applies animation class', () => {
      const { container } = render(<Skeleton animation="wave" />)
      expect((container.firstChild as HTMLElement)?.className).toContain('animate-wave')
    })
  })

  describe('SkeletonText', () => {
    it('renders multiple lines', () => {
      const { container } = render(<SkeletonText lines={3} />)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBe(3)
    })

    it('last line is shorter', () => {
      const { container } = render(<SkeletonText lines={2} width="100%" />)
      const skeletons = container.querySelectorAll('[style*="width"]')
      expect(skeletons[1]?.getAttribute('style')).toContain('60%')
    })
  })

  describe('SkeletonCard', () => {
    it('renders with image placeholder', () => {
      const { container } = render(<SkeletonCard hasImage lines={2} />)
      const imageSkeleton = container.querySelector('[style*="height: 160px"]')
      expect(imageSkeleton).not.toBeNull()
    })

    it('renders without image when hasImage=false', () => {
      const { container } = render(<SkeletonCard hasImage={false} />)
      const imageSkeleton = container.querySelector('[style*="height: 160px"]')
      expect(imageSkeleton).toBeNull()
    })
  })

  describe('SkeletonTableRow', () => {
    it('renders correct number of columns', () => {
      const { container } = render(<SkeletonTableRow columns={4} />)
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBe(4)
    })
  })

  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      render(<LoadingSpinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toBeDefined()
      expect(screen.getByLabelText('Loading')).toBeDefined()
    })

    it('applies size classes', () => {
      const { container } = render(<LoadingSpinner size="lg" />)
      expect((container.firstChild as HTMLElement)?.className).toContain('w-12')
      expect((container.firstChild as HTMLElement)?.className).toContain('h-12')
    })
  })

  describe('LoadingOverlay', () => {
    it('shows children when not loading', () => {
      render(<LoadingOverlay isLoading={false}><div>Content</div></LoadingOverlay>)
      expect(screen.getByText('Content')).toBeDefined()
    })

    it('shows overlay when loading', () => {
      render(<LoadingOverlay isLoading={true} message="Loading data..."><div>Content</div></LoadingOverlay>)
      const statusElements = screen.getAllByRole('status')
      expect(statusElements.length).toBeGreaterThan(0)
      expect(screen.getByText('Loading data...')).toBeDefined()
    })
  })
})