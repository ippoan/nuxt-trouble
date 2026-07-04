import { describe, it, expect, vi, beforeEach } from 'vitest'

const getFieldLayoutMock = vi.fn()
const updateFieldLayoutMock = vi.fn()

vi.mock('~/utils/api', () => ({
  getFieldLayout: (...args: unknown[]) => getFieldLayoutMock(...args),
  updateFieldLayout: (...args: unknown[]) => updateFieldLayoutMock(...args),
}))

import { useTicketFieldLayout } from '~/composables/useTicketFieldLayout'

describe('useTicketFieldLayout', () => {
  beforeEach(() => {
    getFieldLayoutMock.mockReset()
    updateFieldLayoutMock.mockReset()
  })

  it('fetchFieldLayout populates fieldLayout on success', async () => {
    getFieldLayoutMock.mockResolvedValue({ settings: [{ key: 'title', visible: true, width: 'full', sort_order: 10, label: null }] })
    const c = useTicketFieldLayout()
    await c.fetchFieldLayout()
    expect(c.fieldLayout.value?.settings.length).toBe(1)
    expect(c.loading.value).toBe(false)
    expect(c.error.value).toBeNull()
  })

  it('fetchFieldLayout sets error on failure', async () => {
    getFieldLayoutMock.mockRejectedValue(new Error('取得失敗'))
    const c = useTicketFieldLayout()
    await c.fetchFieldLayout()
    expect(c.error.value).toBe('取得失敗')
    expect(c.fieldLayout.value).toBeNull()
  })

  it('saveFieldLayout updates fieldLayout on success', async () => {
    const saved = { settings: [{ key: 'title', visible: false, width: 'half', sort_order: 20, label: 'カスタム' }] }
    updateFieldLayoutMock.mockResolvedValue(saved)
    const c = useTicketFieldLayout()
    await c.saveFieldLayout(saved)
    expect(c.fieldLayout.value).toEqual(saved)
    expect(c.saving.value).toBe(false)
  })

  it('saveFieldLayout sets error and rethrows on failure', async () => {
    updateFieldLayoutMock.mockRejectedValue(new Error('保存失敗'))
    const c = useTicketFieldLayout()
    await expect(c.saveFieldLayout({ settings: [] })).rejects.toThrow('保存失敗')
    expect(c.error.value).toBe('保存失敗')
    expect(c.saving.value).toBe(false)
  })
})
