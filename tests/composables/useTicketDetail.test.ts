import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { setupApi, teardownApi, isLive, restoreNativeApis } from '../helpers/api-test-env'
import { makeTroubleTicket, makeWorkflowState } from '../helpers/test-data'
import { createTicket, deleteTicket } from '~/utils/api'

const pushMock = vi.fn()
const getTicketMock = vi.fn()
const updateTicketMock = vi.fn()
const deleteTicketMock = vi.fn()
const getWorkflowStatesMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  if (process.env.API_BASE_URL) return await importOriginal()
  return {
    ...(await importOriginal()),
    getTicket: (...args: unknown[]) => getTicketMock(...args),
    updateTicket: (...args: unknown[]) => updateTicketMock(...args),
    deleteTicket: (...args: unknown[]) => deleteTicketMock(...args),
    getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
  }
})

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useTicketDetail } from '~/composables/useTicketDetail'

const ticket = makeTroubleTicket()
const state = makeWorkflowState()

describe('useTicketDetail', () => {
  let liveTicketId: string | null = null

  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
    pushMock.mockReset()
    getTicketMock.mockReset()
    updateTicketMock.mockReset()
    deleteTicketMock.mockReset()
    getWorkflowStatesMock.mockReset()

    if (isLive && !liveTicketId) {
      const t = await createTicket({ category: '貨物事故', title: 'detail-test' })
      liveTicketId = t.id
    }
  })
  afterEach(() => teardownApi())

  // cleanup live ticket
  afterAll(async () => {
    if (isLive && liveTicketId) {
      restoreNativeApis()
      await setupApi()
      await deleteTicket(liveTicketId).catch(() => {})
    }
  })

  function getTestId() {
    return isLive ? liveTicketId! : 'test-id'
  }

  it('loads ticket and workflow states', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([state])
    }

    const detail = useTicketDetail(getTestId())
    await detail.load()

    expect(detail.ticket.value).toBeTruthy()
    expect(detail.ticket.value!.category).toBe('貨物事故')
    if (isLive) {
      expect(detail.workflowStates.value.length).toBeGreaterThan(0)
    }
  })

  it('sets error when getTicket fails', async () => {
    if (isLive) {
      // live: 存在しない ID で取得
      const detail = useTicketDetail('00000000-0000-0000-0000-000000000000')
      await detail.load()
      expect(detail.error.value).toBe('チケットの取得に失敗しました')
      return
    }
    getTicketMock.mockRejectedValue(new Error('fetch failed'))
    getWorkflowStatesMock.mockResolvedValue([])

    const detail = useTicketDetail('test-id')
    await detail.load()
    expect(detail.error.value).toBe('チケットの取得に失敗しました')
  })

  it('falls back to empty array when getWorkflowStates fails', async () => {
    if (isLive) return // live: workflow は常に存在
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockRejectedValue(new Error('wf fail'))

    const detail = useTicketDetail('test-id')
    await detail.load()
    expect(detail.workflowStates.value).toEqual([])
  })

  it('statusLabel returns matching state', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([state])
    }

    const detail = useTicketDetail(getTestId())
    await detail.load()

    if (isLive) {
      // live チケットは status_id が設定されている
      if (detail.ticket.value?.status_id) {
        expect(detail.statusLabel.value).toBeTruthy()
      }
    } else {
      expect(detail.statusLabel.value).toEqual(state)
    }
  })

  it('statusLabel returns undefined when no match', async () => {
    if (isLive) return // live: 制御不可
    getTicketMock.mockResolvedValue(makeTroubleTicket({ status_id: null }))
    getWorkflowStatesMock.mockResolvedValue([state])

    const detail = useTicketDetail('test-id')
    await detail.load()
    expect(detail.statusLabel.value).toBeUndefined()
  })

  it('displayValue returns value or dash', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([])
    }

    const detail = useTicketDetail(getTestId())
    await detail.load()

    expect(detail.displayValue('category')).toBe('貨物事故')
  })

  it('displayValue returns dash when ticket is null', () => {
    const detail = useTicketDetail('test-id')
    expect(detail.displayValue('category')).toBe('-')
  })

  it('startEdit populates form', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([])
    }

    const detail = useTicketDetail(getTestId())
    await detail.load()
    detail.startEdit()

    expect(detail.editing.value).toBe(true)
    expect(detail.form.value.category).toBe('貨物事故')
  })

  it('startEdit with null amounts and no due_date', async () => {
    if (isLive) return // live: 制御不可
    getTicketMock.mockResolvedValue(makeTroubleTicket({
      damage_amount: null, compensation_amount: null,
      road_service_cost: null, due_date: null, occurred_date: null,
    }))
    getWorkflowStatesMock.mockResolvedValue([])

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()

    expect(detail.form.value.damage_amount).toBeNull()
    expect(detail.form.value.due_date).toBe('')
    expect(detail.form.value.occurred_date).toBe('')
  })

  it('startEdit does nothing when ticket is null', () => {
    const detail = useTicketDetail('test-id')
    detail.startEdit()
    expect(detail.editing.value).toBe(false)
  })

  it('handleSave updates ticket', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([])
      updateTicketMock.mockResolvedValue(makeTroubleTicket({ title: '更新済み' }))
    }

    const detail = useTicketDetail(getTestId())
    await detail.load()
    detail.startEdit()
    detail.form.value.title = '更新済み'
    await detail.handleSave()

    expect(detail.editing.value).toBe(false)
    expect(detail.saving.value).toBe(false)
    if (isLive) {
      expect(detail.ticket.value!.title).toBe('更新済み')
    }
  })

  it('handleSave filters empty values', async () => {
    if (isLive) return // live: payload 検証不可
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockResolvedValue(ticket)

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()
    detail.form.value.title = ''
    detail.form.value.description = null
    await detail.handleSave()

    const data = updateTicketMock.mock.calls[0][1]
    expect(data).not.toHaveProperty('title')
    expect(data).not.toHaveProperty('description')
  })

  it('handleSave sets error on Error', async () => {
    if (isLive) return // live: エラー注入不可
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockRejectedValue(new Error('update failed'))

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()
    await detail.handleSave()

    expect(detail.error.value).toBe('update failed')
    expect(detail.saving.value).toBe(false)
  })

  it('handleSave sets fallback error on non-Error', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockRejectedValue('str')

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()
    await detail.handleSave()

    expect(detail.error.value).toBe('更新に失敗しました')
  })

  it('handleDelete navigates to /tickets', async () => {
    if (isLive) return // live: afterAll で cleanup するので削除しない
    deleteTicketMock.mockResolvedValue(undefined)

    const detail = useTicketDetail('test-id')
    await detail.handleDelete()

    expect(deleteTicketMock).toHaveBeenCalledWith('test-id')
    expect(pushMock).toHaveBeenCalledWith('/tickets')
  })

  it('handleDelete sets error on Error', async () => {
    if (isLive) return
    deleteTicketMock.mockRejectedValue(new Error('del fail'))

    const detail = useTicketDetail('test-id')
    await detail.handleDelete()
    expect(detail.error.value).toBe('del fail')
  })

  it('handleDelete sets fallback error on non-Error', async () => {
    if (isLive) return
    deleteTicketMock.mockRejectedValue(42)

    const detail = useTicketDetail('test-id')
    await detail.handleDelete()
    expect(detail.error.value).toBe('削除に失敗しました')
  })

  it('exposes fields array', () => {
    const detail = useTicketDetail('test-id')
    expect(detail.fields.length).toBe(15)
    expect(detail.fields[0]).toEqual({ label: 'カテゴリ', key: 'category' })
  })
})
