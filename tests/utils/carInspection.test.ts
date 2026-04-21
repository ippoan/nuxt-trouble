import { describe, it, expect } from 'vitest'
import { formatExpiry, getExpiryStatus } from '~/utils/carInspection'

describe('formatExpiry', () => {
  it('returns "-" for empty / null / undefined', () => {
    expect(formatExpiry('')).toBe('-')
    expect(formatExpiry(null)).toBe('-')
    expect(formatExpiry(undefined)).toBe('-')
  })

  it('returns YYYY-MM-DD as-is when length <= 10', () => {
    expect(formatExpiry('2026-05-01')).toBe('2026-05-01')
  })

  it('truncates ISO datetime to YYYY-MM-DD', () => {
    expect(formatExpiry('2026-05-01T00:00:00Z')).toBe('2026-05-01')
  })
})

describe('getExpiryStatus', () => {
  const today = new Date(2026, 3, 21) // 2026-04-21

  it('returns "unknown" for empty value', () => {
    expect(getExpiryStatus('', today)).toBe('unknown')
    expect(getExpiryStatus(null, today)).toBe('unknown')
    expect(getExpiryStatus(undefined, today)).toBe('unknown')
  })

  it('returns "unknown" for unparseable value', () => {
    expect(getExpiryStatus('not-a-date', today)).toBe('unknown')
  })

  it('returns "expired" for date before today', () => {
    expect(getExpiryStatus('2026-04-20', today)).toBe('expired')
    expect(getExpiryStatus('2025-12-31', today)).toBe('expired')
  })

  it('returns "soon" for today (0 days)', () => {
    expect(getExpiryStatus('2026-04-21', today)).toBe('soon')
  })

  it('returns "soon" for date within 30 days', () => {
    expect(getExpiryStatus('2026-05-01', today)).toBe('soon') // +10 days
    expect(getExpiryStatus('2026-05-21', today)).toBe('soon') // +30 days (boundary)
  })

  it('returns "ok" for date more than 30 days away', () => {
    expect(getExpiryStatus('2026-05-22', today)).toBe('ok') // +31 days
    expect(getExpiryStatus('2027-01-01', today)).toBe('ok')
  })

  it('handles ISO datetime input', () => {
    expect(getExpiryStatus('2027-01-01T00:00:00Z', today)).toBe('ok')
    expect(getExpiryStatus('2026-04-20T12:00:00Z', today)).toBe('expired')
  })

  it('uses current Date by default when now omitted', () => {
    // far future is always "ok"
    expect(getExpiryStatus('2099-12-31')).toBe('ok')
    // far past is always "expired"
    expect(getExpiryStatus('2000-01-01')).toBe('expired')
  })
})
