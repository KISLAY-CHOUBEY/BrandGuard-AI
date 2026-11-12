import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createRateLimiter,
  geminiRateLimiter,
  getClientIp,
  setRateLimitHeaders,
  __resetRateLimitStore
} from './rate-limiter'

describe('Rate Limiter', () => {
  beforeEach(() => {
    __resetRateLimitStore()
    geminiRateLimiter.cleanup()
  })

  afterEach(() => {
    geminiRateLimiter.cleanup()
  })

  describe('createRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Rate limited'
      })

      for (let i = 0; i < 5; i++) {
        const result = limiter.check('test-ip')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }

      limiter.cleanup()
    })

    it('should reject requests exceeding limit', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        message: 'Rate limited'
      })

      limiter.check('test-ip')
      limiter.check('test-ip')
      limiter.check('test-ip')

      const result = limiter.check('test-ip')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)

      limiter.cleanup()
    })

    it('should track different IPs separately', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        message: 'Rate limited'
      })

      limiter.check('ip-1')
      limiter.check('ip-1')
      const result1 = limiter.check('ip-1')
      expect(result1.allowed).toBe(false)

      const result2 = limiter.check('ip-2')
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)

      limiter.cleanup()
    })

    it('should reset after window expires (using timeFn)', () => {
      let currentTime = 1000000
      const timeFn = () => currentTime

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        message: 'Rate limited',
        timeFn
      })

      limiter.check('test-ip')
      limiter.check('test-ip')
      expect(limiter.check('test-ip').allowed).toBe(false)

      // Advance time past window
      currentTime += 61000

      const result = limiter.check('test-ip')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)

      limiter.cleanup()
    })

    it('should provide rate limit info via getInfo', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Rate limited'
      })

      expect(limiter.getInfo('unknown-ip')).toBeNull()

      limiter.check('test-ip')
      limiter.check('test-ip')

      const info = limiter.getInfo('test-ip')
      expect(info).not.toBeNull()
      expect(info!.remaining).toBe(3)

      limiter.cleanup()
    })

    it('should return null for expired entries via getInfo (using timeFn)', () => {
      let currentTime = 1000000
      const timeFn = () => currentTime

      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        message: 'Rate limited',
        timeFn
      })

      limiter.check('test-ip')
      currentTime += 61000

      expect(limiter.getInfo('test-ip')).toBeNull()

      limiter.cleanup()
    })
  })

  describe('geminiRateLimiter (default config)', () => {
    it('should have correct default configuration (10 req/min)', () => {
      for (let i = 0; i < 10; i++) {
        const result = geminiRateLimiter.check('default-test-ip')
        expect(result.allowed).toBe(true)
      }

      const result = geminiRateLimiter.check('default-test-ip')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header (Vercel)', () => {
      const req = { headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' } }
      expect(getClientIp(req)).toBe('192.168.1.1')
    })

    it('should use req.ip for Express', () => {
      const req = { ip: '10.0.0.5' }
      expect(getClientIp(req)).toBe('10.0.0.5')
    })

    it('should fallback to connection.remoteAddress', () => {
      const req = { connection: { remoteAddress: '172.16.0.1' } }
      expect(getClientIp(req)).toBe('172.16.0.1')
    })

    it('should return unknown for missing IP', () => {
      const req = {}
      expect(getClientIp(req)).toBe('unknown')
    })
  })

  describe('setRateLimitHeaders', () => {
    it('should set standard rate limit headers', () => {
      const res = { setHeader: vi.fn() }
      setRateLimitHeaders(res, { remaining: 5, resetTime: 1700000000000 }, 10)

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10)
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5)
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', 1700000000)
    })

    it('should do nothing when info is null', () => {
      const res = { setHeader: vi.fn() }
      setRateLimitHeaders(res, null, 10)
      expect(res.setHeader).not.toHaveBeenCalled()
    })
  })
})