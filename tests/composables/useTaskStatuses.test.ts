import { describe, it, expect, vi, beforeEach } from 'vitest'

const getTaskStatusesMock = vi.fn()
vi.mock('~/utils/api', () => ({
  getTaskStatuses: (...args: unknown[]) => getTaskStatusesMock(...args),
}))

function makeStatus(overrides: Partial<{
  id: string; tenant_id: string; key: string; name: string; color: string; sort_order: number; is_done: boolean
}> = {}) {
  return {
    id: 'id-1', tenant_id: 't', key: 'open', name: '未着手', color: '#9CA3AF',
    sort_order: 10, is_done: false, created_at: '', updated_at: '',
    ...overrides,
  }
}

describe('useTaskStatuses', () => {
  beforeEach(() => {
    getTaskStatusesMock.mockReset()
    // singleton state is module-local; reset modules so each test starts fresh
    vi.resetModules()
  })

  it('load() fetches and sorts statuses by sort_order', async () => {
    getTaskStatusesMock.mockResolvedValue([
      makeStatus({ id: '3', key: 'done', name: '完了', sort_order: 40, is_done: true }),
      makeStatus({ id: '1', key: 'open', name: '未着手', sort_order: 10 }),
      makeStatus({ id: '2', key: 'waiting', name: '待機', sort_order: 30 }),
    ])

    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.statuses.value.map(s => s.key)).toEqual(['open', 'waiting', 'done'])
    expect(c.loaded.value).toBe(true)
  })

  it('load() is idempotent (only fetches once unless forced)', async () => {
    getTaskStatusesMock.mockResolvedValue([makeStatus()])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    await c.load()
    expect(getTaskStatusesMock).toHaveBeenCalledTimes(1)
  })

  it('byKey returns fetched value (label, color, is_done)', async () => {
    getTaskStatusesMock.mockResolvedValue([
      makeStatus({ key: 'done', name: '完了済み', color: '#111', is_done: true }),
    ])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    const r = c.byKey('done')
    expect(r).toEqual({ label: '完了済み', color: '#111', is_done: true })
  })

  it('byKey falls back to TASK_STATUS_LABELS for legacy keys when not in master', async () => {
    getTaskStatusesMock.mockResolvedValue([])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    const open = c.byKey('open')
    expect(open?.label).toBe('未着手')
    const done = c.byKey('done')
    expect(done?.is_done).toBe(true)
  })

  it('byKey returns undefined for unknown key and null/empty input', async () => {
    getTaskStatusesMock.mockResolvedValue([])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.byKey('totally-unknown')).toBeUndefined()
    expect(c.byKey(null)).toBeUndefined()
    expect(c.byKey('')).toBeUndefined()
  })

  it('waitingStatusKey uses key==="waiting" if present', async () => {
    getTaskStatusesMock.mockResolvedValue([
      makeStatus({ key: 'open', sort_order: 10 }),
      makeStatus({ id: '2', key: 'waiting', name: '待機', sort_order: 30 }),
    ])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.waitingStatusKey.value).toBe('waiting')
  })

  it('waitingStatusKey falls back to name==="待機" match', async () => {
    getTaskStatusesMock.mockResolvedValue([
      makeStatus({ id: '1', key: 'pending', name: '待機', sort_order: 30 }),
    ])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.waitingStatusKey.value).toBe('pending')
  })

  it('waitingStatusKey defaults to "waiting" when master empty', async () => {
    getTaskStatusesMock.mockResolvedValue([])
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.waitingStatusKey.value).toBe('waiting')
  })

  it('falls back gracefully when API throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTaskStatusesMock.mockRejectedValue(new Error('boom'))
    const { useTaskStatuses } = await import('~/composables/useTaskStatuses')
    const c = useTaskStatuses()
    await c.load()
    expect(c.loaded.value).toBe(true)
    expect(c.statuses.value).toEqual([])
    // fallback path
    expect(c.byKey('open')?.label).toBe('未着手')
    errSpy.mockRestore()
  })
})
