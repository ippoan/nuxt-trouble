import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeTroubleTicket, makeWorkflowState } from '../helpers/test-data'

const pushMock = vi.fn()
const getTicketMock = vi.fn()
const updateTicketMock = vi.fn()
const deleteTicketMock = vi.fn()
const getWorkflowStatesMock = vi.fn()

vi.mock('~/utils/api', () => ({
  getTicket: (...args: unknown[]) => getTicketMock(...args),
  updateTicket: (...args: unknown[]) => updateTicketMock(...args),
  deleteTicket: (...args: unknown[]) => deleteTicketMock(...args),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
}))

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useTicketDetail } from '~/composables/useTicketDetail'

const ticket = makeTroubleTicket()
const state = makeWorkflowState()

describe('useTicketDetail', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getTicketMock.mockReset()
    updateTicketMock.mockReset()
    deleteTicketMock.mockReset()
    getWorkflowStatesMock.mockReset()
  })

  it('loads ticket and workflow states', async () => {
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([state])

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.ticket.value).toEqual(ticket)
    expect(detail.workflowStates.value).toEqual([state])
  })

  it('sets error when getTicket fails', async () => {
    getTicketMock.mockRejectedValue(new Error('fetch failed'))
    getWorkflowStatesMock.mockResolvedValue([])

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.error.value).toBe('チケットの取得に失敗しました')
  })

  it('falls back to empty array when getWorkflowStates fails', async () => {
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockRejectedValue(new Error('wf fail'))

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.workflowStates.value).toEqual([])
  })

  it('statusLabel returns matching state', async () => {
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([state])

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.statusLabel.value).toEqual(state)
  })

  it('statusLabel returns undefined when no match', async () => {
    getTicketMock.mockResolvedValue(makeTroubleTicket({ status_id: null }))
    getWorkflowStatesMock.mockResolvedValue([state])

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.statusLabel.value).toBeUndefined()
  })

  it('displayValue returns value or dash', async () => {
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])

    const detail = useTicketDetail('test-id')
    await detail.load()

    expect(detail.displayValue('category')).toBe('貨物事故')
    expect(detail.displayValue('assigned_to')).toBe('-')
  })

  it('displayValue returns dash when ticket is null', () => {
    const detail = useTicketDetail('test-id')
    expect(detail.displayValue('category')).toBe('-')
  })

  it('startEdit populates form', async () => {
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()

    expect(detail.editing.value).toBe(true)
    expect(detail.form.value.category).toBe('貨物事故')
    expect(detail.form.value.damage_amount).toBe(10000)
    expect(detail.form.value.due_date).toBe('2026-02-15')
  })

  it('startEdit with null amounts and no due_date', async () => {
    getTicketMock.mockResolvedValue(makeTroubleTicket({
      damage_amount: null,
      compensation_amount: null,
      road_service_cost: null,
      due_date: null,
      occurred_date: null,
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
    const updated = makeTroubleTicket({ title: '更新済み' })
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    updateTicketMock.mockResolvedValue(updated)

    const detail = useTicketDetail('test-id')
    await detail.load()
    detail.startEdit()
    await detail.handleSave()

    expect(detail.ticket.value).toEqual(updated)
    expect(detail.editing.value).toBe(false)
    expect(detail.saving.value).toBe(false)
  })

  it('handleSave filters empty values', async () => {
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
    getTicketMock.mockResolvedValue(ticket)
    getWorkflowStatesMock.mockResolvedValue([])
    deleteTicketMock.mockResolvedValue(undefined)

    const detail = useTicketDetail('test-id')
    await detail.load()
    await detail.handleDelete()

    expect(deleteTicketMock).toHaveBeenCalledWith('test-id')
    expect(pushMock).toHaveBeenCalledWith('/tickets')
  })

  it('handleDelete sets error on Error', async () => {
    deleteTicketMock.mockRejectedValue(new Error('del fail'))

    const detail = useTicketDetail('test-id')
    await detail.handleDelete()

    expect(detail.error.value).toBe('del fail')
  })

  it('handleDelete sets fallback error on non-Error', async () => {
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
