import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupApi, teardownApi, isLive, restoreNativeApis } from '../helpers/api-test-env'
import { makeTroubleTicket, makeWorkflowState } from '../helpers/test-data'

const pushMock = vi.fn()
const getTicketsMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
const deleteTicketMock = vi.fn()
const exportTicketsCsvMock = vi.fn()
const createTicketMock = vi.fn()
const setupDefaultWorkflowMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  if (process.env.API_BASE_URL) return await importOriginal()
  return {
    ...(await importOriginal()),
    getTickets: (...args: unknown[]) => getTicketsMock(...args),
    getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
    deleteTicket: (...args: unknown[]) => deleteTicketMock(...args),
    exportTicketsCsv: (...args: unknown[]) => exportTicketsCsvMock(...args),
    createTicket: (...args: unknown[]) => createTicketMock(...args),
    setupDefaultWorkflow: (...args: unknown[]) => setupDefaultWorkflowMock(...args),
  }
})

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useTicketList } from '~/composables/useTicketList'

const ticket = makeTroubleTicket()
const state = makeWorkflowState()

describe('useTicketList', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
    pushMock.mockReset()
    getTicketsMock.mockReset()
    getWorkflowStatesMock.mockReset()
    deleteTicketMock.mockReset()
    exportTicketsCsvMock.mockReset()
    createTicketMock.mockReset()
    setupDefaultWorkflowMock.mockReset()
  })
  afterEach(() => teardownApi())

  it('initializes with default filter', () => {
    const l = useTicketList()
    expect(l.filter.page).toBe(1)
    expect(l.tickets.value).toEqual([])
  })

  it('fetchTickets sets tickets and total', async () => {
    if (!isLive) getTicketsMock.mockResolvedValue({ tickets: [ticket], total: 1, page: 1, per_page: 20 })
    const l = useTicketList()
    await l.fetchTickets()
    if (isLive) {
      expect(typeof l.total.value).toBe('number')
    } else {
      expect(l.tickets.value).toEqual([ticket])
      expect(l.total.value).toBe(1)
    }
    expect(l.loading.value).toBe(false)
  })

  it('fetchTickets handles error', async () => {
    if (isLive) return
    getTicketsMock.mockRejectedValue(new Error('fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const l = useTicketList()
    await l.fetchTickets()
    expect(l.loading.value).toBe(false)
    spy.mockRestore()
  })

  it('fetchWorkflowStates sets states', async () => {
    if (!isLive) getWorkflowStatesMock.mockResolvedValue([state])
    const l = useTicketList()
    await l.fetchWorkflowStates()
    if (isLive) expect(l.workflowStates.value.length).toBeGreaterThan(0)
    else expect(l.workflowStates.value).toEqual([state])
  })

  it('fetchWorkflowStates handles error silently', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockRejectedValue(new Error('fail'))
    const l = useTicketList()
    await l.fetchWorkflowStates()
    expect(l.workflowStates.value).toEqual([])
  })

  it('stateMap maps by id', async () => {
    if (!isLive) getWorkflowStatesMock.mockResolvedValue([state])
    const l = useTicketList()
    await l.fetchWorkflowStates()
    if (!isLive) expect(l.stateMap.value[state.id]).toEqual(state)
  })

  it('totalPages computes correctly', () => {
    const l = useTicketList()
    l.total.value = 45
    expect(l.totalPages.value).toBe(3)
  })

  it('categoryOptions includes all hardcoded categories when no DB categories', () => {
    const l = useTicketList()
    // 7 hardcoded categories (no "全て" — use USelect placeholder instead)
    expect(l.categoryOptions.value.length).toBe(7)
    expect(l.categoryOptions.value[0]).toEqual({ label: '苦情・トラブル', value: '苦情・トラブル' })
  })

  it('categoryOptions merges DB and hardcoded categories', () => {
    const l = useTicketList()
    l.categories.value = [{ id: 'c1', tenant_id: 't1', name: '貨物事故', sort_order: 1, created_at: '' }]
    // DB has '貨物事故' which is also hardcoded — should deduplicate
    // Total: 1 DB + 6 remaining hardcoded = 7
    expect(l.categoryOptions.value.length).toBe(7)
    expect(l.categoryOptions.value[0]).toEqual({ label: '貨物事故', value: '貨物事故' })
  })

  it('clearFilter resets all fields and status', () => {
    const l = useTicketList()
    l.filter.category = '貨物事故'
    l.filter.q = 'test'
    l.selectedStatuses.value = new Set(['s1'])
    l.clearFilter()
    expect(l.filter.category).toBeUndefined()
    expect(l.filter.page).toBe(1)
    expect(l.selectedStatuses.value.size).toBe(0)
  })

  it('confirmDelete sets target and modal', () => {
    const l = useTicketList()
    l.confirmDelete(ticket)
    expect(l.deleteTarget.value).toEqual(ticket)
    expect(l.showDeleteModal.value).toBe(true)
  })

  it('handleDelete deletes and re-fetches', async () => {
    if (isLive) return
    deleteTicketMock.mockResolvedValue(undefined)
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })
    const l = useTicketList()
    l.confirmDelete(ticket)
    await l.handleDelete()
    expect(deleteTicketMock).toHaveBeenCalledWith(ticket.id)
    expect(l.showDeleteModal.value).toBe(false)
  })

  it('handleDelete returns early when no target', async () => {
    const l = useTicketList()
    await l.handleDelete()
    if (!isLive) expect(deleteTicketMock).not.toHaveBeenCalled()
  })

  it('handleDelete logs error', async () => {
    if (isLive) return
    deleteTicketMock.mockRejectedValue(new Error('del'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const l = useTicketList()
    l.confirmDelete(ticket)
    await l.handleDelete()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('handleExportCsv calls api', async () => {
    if (isLive) return
    exportTicketsCsvMock.mockResolvedValue(undefined)
    const l = useTicketList()
    await l.handleExportCsv()
    expect(exportTicketsCsvMock).toHaveBeenCalled()
  })

  it('handleExportCsv logs error', async () => {
    if (isLive) return
    exportTicketsCsvMock.mockRejectedValue(new Error('csv'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const l = useTicketList()
    await l.handleExportCsv()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('formatDate returns substring or dash', () => {
    const l = useTicketList()
    expect(l.formatDate('2026-01-15T00:00:00')).toBe('2026-01-15')
    expect(l.formatDate(null)).toBe('-')
  })

  it('navigateToTicket pushes route', () => {
    const l = useTicketList()
    l.navigateToTicket('t-1')
    expect(pushMock).toHaveBeenCalledWith('/tickets/t-1')
  })

  // Status filter
  it('loadStatusFilter restores from localStorage', () => {
    localStorage.setItem('trouble_filter_status', '["s1","s2"]')
    const l = useTicketList()
    l.loadStatusFilter()
    expect(l.selectedStatuses.value).toEqual(new Set(['s1', 's2']))
    localStorage.removeItem('trouble_filter_status')
  })

  it('loadStatusFilter handles invalid JSON', () => {
    localStorage.setItem('trouble_filter_status', 'invalid')
    const l = useTicketList()
    l.loadStatusFilter()
    expect(l.selectedStatuses.value.size).toBe(0)
    localStorage.removeItem('trouble_filter_status')
  })

  it('toggleStatus adds/removes status and fetches', async () => {
    if (!isLive) getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })
    const l = useTicketList()
    l.toggleStatus('s1')
    expect(l.selectedStatuses.value.has('s1')).toBe(true)
    l.toggleStatus('s1')
    expect(l.selectedStatuses.value.has('s1')).toBe(false)
  })

  it('toggleAllStatuses selects/deselects all', async () => {
    if (!isLive) {
      getWorkflowStatesMock.mockResolvedValue([state, makeWorkflowState({ id: 'state-2' })])
      getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })
    }
    const l = useTicketList()
    await l.fetchWorkflowStates()
    l.toggleAllStatuses()
    if (!isLive) expect(l.selectedStatuses.value.size).toBe(2)
    l.toggleAllStatuses()
    expect(l.selectedStatuses.value.size).toBe(0)
  })

  // Filtered tickets
  it('filteredTickets returns all when no status selected', () => {
    const l = useTicketList()
    l.tickets.value = [ticket]
    expect(l.filteredTickets.value).toEqual([ticket])
  })

  it('filteredTickets filters by selected statuses', () => {
    const l = useTicketList()
    l.tickets.value = [ticket, makeTroubleTicket({ id: 't2', status_id: 'other' })]
    l.selectedStatuses.value = new Set(['state-1'])
    expect(l.filteredTickets.value.length).toBe(1)
    expect(l.filteredTickets.value[0].id).toBe('ticket-1')
  })

  it('filteredTickets excludes tickets with null status_id', () => {
    const l = useTicketList()
    l.tickets.value = [makeTroubleTicket({ status_id: null })]
    l.selectedStatuses.value = new Set(['state-1'])
    expect(l.filteredTickets.value.length).toBe(0)
  })

  // Inline create
  it('handleInlineCreate creates and re-fetches', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockResolvedValue({ id: 'new-id' })
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })

    const l = useTicketList()
    l.showInlineCreate.value = true
    l.newTicket.category = '貨物事故'
    l.newTicket.person_name = 'テスト'
    await l.handleInlineCreate()

    expect(createTicketMock).toHaveBeenCalled()
    expect(l.showInlineCreate.value).toBe(false)
    expect(l.newTicket.category).toBe('')
  })

  it('handleInlineCreate returns early when no category', async () => {
    const l = useTicketList()
    await l.handleInlineCreate()
    if (!isLive) expect(createTicketMock).not.toHaveBeenCalled()
  })

  it('handleInlineCreate sets up workflow if none exists', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([])
    setupDefaultWorkflowMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockResolvedValue({ id: 'new-id' })
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })

    const l = useTicketList()
    l.newTicket.category = '貨物事故'
    await l.handleInlineCreate()
    expect(setupDefaultWorkflowMock).toHaveBeenCalled()
  })

  it('handleInlineCreate logs error on failure', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockRejectedValue(new Error('create fail'))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const l = useTicketList()
    l.newTicket.category = '貨物事故'
    await l.handleInlineCreate()
    expect(spy).toHaveBeenCalled()
    expect(l.creating.value).toBe(false)
    spy.mockRestore()
  })

  it('handleInlineCreate includes optional fields', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockResolvedValue({ id: 'new-id' })
    getTicketsMock.mockResolvedValue({ tickets: [], total: 0, page: 1, per_page: 20 })

    const l = useTicketList()
    l.newTicket.category = '貨物事故'
    l.newTicket.company_name = '会社A'
    l.newTicket.office_name = '営業所B'
    l.newTicket.occurred_date = '2026-01-15'
    l.newTicket.description = '説明テスト'
    await l.handleInlineCreate()

    const payload = createTicketMock.mock.calls[0][0]
    expect(payload.company_name).toBe('会社A')
    expect(payload.office_name).toBe('営業所B')
    expect(payload.occurred_date).toBe('2026-01-15')
    expect(payload.description).toBe('説明テスト')
  })

  it('resetNewTicket clears all fields', () => {
    const l = useTicketList()
    l.newTicket.category = '貨物事故'
    l.newTicket.person_name = 'テスト'
    l.resetNewTicket()
    expect(l.newTicket.category).toBe('')
    expect(l.newTicket.person_name).toBe('')
  })

  it('createCategoryOptions has correct length with no DB categories', () => {
    const l = useTicketList()
    expect(l.createCategoryOptions.value.length).toBe(7)
  })

  it('createCategoryOptions merges DB and hardcoded', () => {
    const l = useTicketList()
    l.categories.value = [{ id: 'c1', tenant_id: 't1', name: 'カスタム', sort_order: 1, created_at: '' }]
    // 1 DB (カスタム) + 7 hardcoded = 8
    expect(l.createCategoryOptions.value.length).toBe(8)
    expect(l.createCategoryOptions.value[0]).toEqual({ label: 'カスタム', value: 'カスタム' })
  })
})
