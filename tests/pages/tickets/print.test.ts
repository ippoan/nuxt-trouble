import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../../helpers/nuxt-stubs'
import { makeTroubleTicket, makeWorkflowState } from '../../helpers/test-data'
import type { TroubleTask } from '~/types'

vi.mock('#app/composables/router', () => ({
  useRoute: () => ({ params: { id: 'ticket-1' } }),
}))

const getTicketMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
const getTasksMock = vi.fn()
const getStatusHistoryMock = vi.fn()
const updateTaskMock = vi.fn()
const getTaskStatusesMock = vi.fn()
const getCarInspectionsCurrentMock = vi.fn()
vi.mock('~/utils/api', () => ({
  getTicket: (...args: unknown[]) => getTicketMock(...args),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
  getTasks: (...args: unknown[]) => getTasksMock(...args),
  getStatusHistory: (...args: unknown[]) => getStatusHistoryMock(...args),
  updateTask: (...args: unknown[]) => updateTaskMock(...args),
  getTaskStatuses: (...args: unknown[]) => getTaskStatusesMock(...args),
  getCarInspectionsCurrent: (...args: unknown[]) => getCarInspectionsCurrentMock(...args),
}))

import PrintPage from '~/pages/tickets/print/[id].vue'

function makeTask(overrides: Partial<TroubleTask> = {}): TroubleTask {
  return {
    id: 'task-1', tenant_id: 'tenant-1', ticket_id: 'ticket-1',
    task_type: 'レッカー対応', title: 'レッカー業者到着', description: '',
    status: 'open', assigned_to: null, due_date: null,
    completed_at: null, sort_order: 0,
    next_action: '', next_action_detail: '',
    next_action_by: '青井 健', next_action_due: null,
    occurred_at: '2026-07-13T21:08:00', created_by: null,
    created_at: '2026-07-13T21:08:00', updated_at: '2026-07-13T21:08:00',
    print_page_break_before: false,
    ...overrides,
  }
}

describe('print/[id] page', () => {
  beforeEach(() => {
    getTicketMock.mockReset()
    getWorkflowStatesMock.mockReset()
    getTasksMock.mockReset()
    getStatusHistoryMock.mockReset()
    updateTaskMock.mockReset()
    getTaskStatusesMock.mockReset()
    getCarInspectionsCurrentMock.mockReset()

    getTicketMock.mockResolvedValue(makeTroubleTicket())
    getWorkflowStatesMock.mockResolvedValue([makeWorkflowState()])
    getTasksMock.mockResolvedValue([makeTask()])
    getStatusHistoryMock.mockResolvedValue([])
    getCarInspectionsCurrentMock.mockResolvedValue([])
    getTaskStatusesMock.mockResolvedValue([])
  })

  it('renders 経過記録 table with 日付 as the first column', async () => {
    const wrapper = mount(PrintPage, { global: { stubs: allStubs } })
    await flushPromises()

    const table = wrapper.findAll('table').find(t => t.text().includes('経過記録') || t.find('th').exists())
    const headers = wrapper.findAll('thead th').map(th => th.text())
    // 経過記録テーブルのヘッダーを特定 (種別/次の対応者を含む方)
    const taskTableHeaders = wrapper.findAll('table').map(t => t.findAll('th').map(th => th.text()))
      .find(hs => hs.includes('種別') && hs.includes('次の対応者'))
    expect(taskTableHeaders).toBeDefined()
    expect(taskTableHeaders![0]).toBe('日付')
    expect(headers.length).toBeGreaterThan(0)
    void table
  })

  it('renders task row with occurred_at date in the first cell', async () => {
    const wrapper = mount(PrintPage, { global: { stubs: allStubs } })
    await flushPromises()

    const taskTable = wrapper.findAll('table').find(t => {
      const hs = t.findAll('th').map(th => th.text())
      return hs.includes('種別') && hs.includes('次の対応者')
    })
    expect(taskTable).toBeDefined()
    const firstDataRow = taskTable!.findAll('tbody tr')[0]!
    const firstCell = firstDataRow.findAll('td')[0]!
    expect(firstCell.text()).toBe('2026-07-13')
  })
})
