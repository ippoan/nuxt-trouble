import { describe, it, expect, vi, afterEach } from 'vitest'
import { numericInputmodeForTouch } from '~/utils/ime'

describe('numericInputmodeForTouch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns undefined on non-touch (fine pointer) environments', () => {
    // 物理キーボード環境では inputmode を付けない — MS-IME の Tab 移動での
    // 半角英数自動切替 (IME モード汚染) を防ぐ (Refs #225 ②)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    expect(numericInputmodeForTouch()).toBeUndefined()
  })

  it('returns numeric on touch (coarse pointer) environments', () => {
    const mm = vi.fn().mockReturnValue({ matches: true })
    vi.stubGlobal('matchMedia', mm)
    expect(numericInputmodeForTouch()).toBe('numeric')
    expect(mm).toHaveBeenCalledWith('(pointer: coarse)')
  })

  it('returns undefined when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(numericInputmodeForTouch()).toBeUndefined()
  })
})
