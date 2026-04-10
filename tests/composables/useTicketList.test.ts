import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeTroubleTicket, makeWorkflowState } from '../helpers/test-data'

const pushMock = vi.fn()
const getTicketsMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
const deleteTicketMock = vi.fn()
const exportTicketsCsvMock = vi.fn()

vi.mock('~/utils/api', () => ({
  getTickets: (...args: unknown[]) => getTicketsMock(...args),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
  deleteTicket: (...args: unknown[]) => deleteTicketMock(...args),
  exportTicketsCsv: (...args: unknown[]) => exportTicketsCsvMock(...args),
}))

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useTicketList } from '~/composables/useTicketList'

const ticket = makeTroubleTicket()
const state = makeWorkflowState()

describe('useTicketList', () => {
  beforeEach(() => {
    pushMock.mockReset()
    getTicketsMock.mockReset()
    getWorkflowStatesMock.mockReset()
    deleteTicketMock.mockReset()
    exportTicketsCsvMock.mockReset()
  })

  it('initializes with default filter', () => {
    const list = useTicketList()
    expect(list.filter.page).toBe(1)
    expect(list.filter.per_page).toBe(20)
    expect(list.tickets.value).toEqual([])
  })

  it('fetchTickets sets tickets and total', async () => {
    getTicketsMock.mockResolvedValue({ tickets: [ticket], total: 1, page: 1, per_page: 20 })

    const list = useTicketList()
    await list.fetchTickets()

    expect(list.tickets.value).toEqual([ticket])
    expect(list.total.value).toBe(1)
    expect(list.loading.value).toBe(false)
  })

  it('fetchTickets handles error', async () => {
    getTicketsMock.mockRejectedValue(new Error('fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const list = useTicketList()
    await list.fetchTickets()

    expect(list.loading.value).toBe(false)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('fetchWorkflowStates sets states', async () => {
    getWorkflowStatesMock.mockResolvedValue([state])

    const list = useTicketList()
    await list.fetchWorkflowStates()

    expect(list.workflowStates.value).toEqual([state])
  })

  it('fetchWorkflowStates handles error silently', async () => {
    getWorkflowStatesMock.mockRejectedValue(new Error('fail'))

    const list = useTicketList()
    await list.fetchWorkflowStates()

    expect(list.workflowStates.value).toEqual([])
  })

  it('stateMap maps by id', async () => {
    getWorkflowStatesMock.mockResolvedValue([state])

    const list = useTicketList()
    await list.fetchWorkflowStates()

    expect(list.stateMap.value[state.id]).toEqual(state)
  })

  it('totalPages computes correctly', () => {
    const list = useTicketList()
    list.total.value = 45
    expect(list.totalPages.value).toBe(3)
  })

  it('categoryOptions includes all categories', () => {
    const list = useTicketList()
    expect(list.categoryOptions[0]).toEqual({ label: '全て', value: '' })
    expect(list.categoryOptions.length).toBe(8) // 1 + 7 categories
  })

  it('clearFilter resets all fields', () => {
    const list = useTicketList()
    list.filter.category = '貨物事故'
    list.filter.q = 'test'
    list.filter.page = 3

    list.clearFilter()

    expect(list.filter.category).toBeUndefined()
    expect(list.filter.q).toBeUndefined()
    expect(list.filter.page).toBe(1)
  })

  it('confirmDelete sets target and modal', () => {
    const list = useTicketList()
    list.confirmDelete(ticket)

    expect(list.deleteTarget.value).toEqual(ticket)
    expect(list.showDeleteModal.value).toBe(true)
  })

  it('handleDelete deletes and re-fetches', async () => {
    deleteTicketMock.mockResolvedValue(undefined)
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })

    const list = useTicketList()
    list.confirmDelete(ticket)
    await list.handleDelete()

    expect(deleteTicketMock).toHaveBeenCalledWith(ticket.id)
    expect(list.showDeleteModal.value).toBe(false)
    expect(list.deleteTarget.value).toBeNull()
  })

  it('handleDelete returns early when no target', async () => {
    const list = useTicketList()
    await list.handleDelete()
    expect(deleteTicketMock).not.toHaveBeenCalled()
  })

  it('handleDelete logs error', async () => {
    deleteTicketMock.mockRejectedValue(new Error('del fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const list = useTicketList()
    list.confirmDelete(ticket)
    await list.handleDelete()

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('handleExportCsv calls api', async () => {
    exportTicketsCsvMock.mockResolvedValue(undefined)

    const list = useTicketList()
    await list.handleExportCsv()

    expect(exportTicketsCsvMock).toHaveBeenCalled()
  })

  it('handleExportCsv logs error', async () => {
    exportTicketsCsvMock.mockRejectedValue(new Error('csv fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const list = useTicketList()
    await list.handleExportCsv()

    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('formatDate returns substring or dash', () => {
    const list = useTicketList()
    expect(list.formatDate('2026-01-15T00:00:00')).toBe('2026-01-15')
    expect(list.formatDate(null)).toBe('-')
  })

  it('navigateToTicket pushes route', () => {
    const list = useTicketList()
    list.navigateToTicket('ticket-1')
    expect(pushMock).toHaveBeenCalledWith('/tickets/ticket-1')
  })
})
