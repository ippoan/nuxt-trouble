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
  afterAll(async () => {
    if (isLive && liveTicketId) {
      restoreNativeApis()
      await setupApi()
      await deleteTicket(liveTicketId).catch(() => {})
    }
  })

  function tid() { return isLive ? liveTicketId! : 'test-id' }

  it('loads ticket and workflow states', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([state])
    }
    const d = useTicketDetail(tid())
    await d.load()
    expect(d.ticket.value).toBeTruthy()
    expect(d.ticket.value!.category).toBe('貨物事故')
  })

  it('sets error when getTicket fails', async () => {
    if (isLive) {
      const d = useTicketDetail('00000000-0000-0000-0000-000000000000')
      await d.load()
      expect(d.error.value).toBe('チケットの取得に失敗しました')
      return
    }
    getTicketMock.mockRejectedValue(new Error('fail'))
    getWorkflowStatesMock.mockResolvedValue([])
    const d = useTicketDetail('test-id')
    await d.load()
    expect(d.error.value).toBe('チケットの取得に失敗しました')
  })

  it('falls back to empty array when getWorkflowStates fails', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockRejectedValue(new Error('wf'))
    const d = useTicketDetail('test-id')
    await d.load()
    expect(d.workflowStates.value).toEqual([])
  })

  it('statusLabel returns matching state', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([state])
    }
    const d = useTicketDetail(tid())
    await d.load()
    if (!isLive) expect(d.statusLabel.value).toEqual(state)
  })

  it('statusLabel returns undefined when no match', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(makeTroubleTicket({ status_id: null }))
    getWorkflowStatesMock.mockResolvedValue([state])
    const d = useTicketDetail('test-id')
    await d.load()
    expect(d.statusLabel.value).toBeUndefined()
  })

  it('displayValue returns value or dash', async () => {
    if (!isLive) { getTicketMock.mockResolvedValue(ticket); getWorkflowStatesMock.mockResolvedValue([]) }
    const d = useTicketDetail(tid())
    await d.load()
    expect(d.displayValue('category')).toBe('貨物事故')
  })

  it('displayValue returns dash when ticket is null', () => {
    expect(useTicketDetail('x').displayValue('category')).toBe('-')
  })

  it('startEdit populates form', async () => {
    if (!isLive) { getTicketMock.mockResolvedValue(ticket); getWorkflowStatesMock.mockResolvedValue([]) }
    const d = useTicketDetail(tid())
    await d.load()
    d.startEdit()
    expect(d.editing.value).toBe(true)
    expect(d.form.value.category).toBe('貨物事故')
  })

  it('startEdit with null amounts and no due_date', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(makeTroubleTicket({
      damage_amount: null, compensation_amount: null, road_service_cost: null,
      due_date: null, occurred_date: null,
    }))
    getWorkflowStatesMock.mockResolvedValue([])
    const d = useTicketDetail('test-id')
    await d.load()
    d.startEdit()
    expect(d.form.value.damage_amount).toBeNull()
    expect(d.form.value.due_date).toBe('')
  })

  it('startEdit does nothing when ticket is null', () => {
    const d = useTicketDetail('test-id')
    d.startEdit()
    expect(d.editing.value).toBe(false)
  })

  it('handleSave updates ticket', async () => {
    if (!isLive) {
      getTicketMock.mockResolvedValue(ticket)
      getWorkflowStatesMock.mockResolvedValue([])
      updateTicketMock.mockResolvedValue(makeTroubleTicket({ title: '更新済み' }))
    }
    const d = useTicketDetail(tid())
    await d.load()
    d.startEdit()
    d.form.value.title = '更新済み'
    await d.handleSave()
    expect(d.editing.value).toBe(false)
    if (isLive) expect(d.ticket.value!.title).toBe('更新済み')
  })

  it('handleSave filters empty values', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockResolvedValue(ticket)
    const d = useTicketDetail('test-id')
    await d.load()
    d.startEdit()
    d.form.value.title = ''
    d.form.value.description = null
    await d.handleSave()
    const data = updateTicketMock.mock.calls[0][1]
    expect(data).not.toHaveProperty('title')
  })

  it('handleSave sets error on Error', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockRejectedValue(new Error('update failed'))
    const d = useTicketDetail('test-id')
    await d.load()
    d.startEdit()
    await d.handleSave()
    expect(d.error.value).toBe('update failed')
  })

  it('handleSave sets fallback error on non-Error', async () => {
    if (isLive) return
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockRejectedValue('str')
    const d = useTicketDetail('test-id')
    await d.load()
    d.startEdit()
    await d.handleSave()
    expect(d.error.value).toBe('更新に失敗しました')
  })

  it('handleDelete navigates to /tickets', async () => {
    if (isLive) return
    deleteTicketMock.mockResolvedValue(undefined)
    const d = useTicketDetail('test-id')
    await d.handleDelete()
    expect(deleteTicketMock).toHaveBeenCalledWith('test-id')
    expect(pushMock).toHaveBeenCalledWith('/tickets')
  })

  it('handleDelete sets error on Error', async () => {
    if (isLive) return
    deleteTicketMock.mockRejectedValue(new Error('del'))
    const d = useTicketDetail('test-id')
    await d.handleDelete()
    expect(d.error.value).toBe('del')
  })

  it('handleDelete sets fallback error on non-Error', async () => {
    if (isLive) return
    deleteTicketMock.mockRejectedValue(42)
    const d = useTicketDetail('test-id')
    await d.handleDelete()
    expect(d.error.value).toBe('削除に失敗しました')
  })

  it('exposes fields array', () => {
    expect(useTicketDetail('x').fields.length).toBe(16)
  })
})
