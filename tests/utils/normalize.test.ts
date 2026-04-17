import { describe, it, expect } from 'vitest'
import { toHalfWidth } from '~/utils/normalize'

describe('toHalfWidth', () => {
  it('converts full-width digits to half-width', () => {
    expect(toHalfWidth('１２３４')).toBe('1234')
  })

  it('converts full-width hyphen and chouon to half-width hyphen', () => {
    expect(toHalfWidth('１２－３４')).toBe('12-34')
    expect(toHalfWidth('１２ー３４')).toBe('12-34')
  })

  it('preserves kana/kanji and only normalizes digits + hyphen', () => {
    expect(toHalfWidth('品川５００あ１２－３４')).toBe('品川500あ12-34')
  })

  it('is a no-op for already half-width strings', () => {
    expect(toHalfWidth('12-34')).toBe('12-34')
    expect(toHalfWidth('品川500あ1234')).toBe('品川500あ1234')
  })

  it('returns empty string unchanged', () => {
    expect(toHalfWidth('')).toBe('')
  })

  it('passes through nullish-like falsy inputs without throwing', () => {
    expect(toHalfWidth(undefined as unknown as string)).toBe(undefined as unknown as string)
    expect(toHalfWidth(null as unknown as string)).toBe(null as unknown as string)
  })
})
