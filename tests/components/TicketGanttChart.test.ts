import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketGanttChart from '~/components/TicketGanttChart.vue'

const mockGetTasks = vi.fn().mockResolvedValue([])

vi.mock('~/utils/api', () => ({
  getTasks: (...args: any[]) => mockGetTasks(...args),
}))

vi.mock('frappe-gantt', () => ({
  default: class {
    constructor() {}
    change_view_mode() {}
  },
}))

vi.mock('~/assets/css/frappe-gantt.css', () => ({}))

const stubs = {
  UButton: {
    template: '<button @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'size', 'variant'],
  },
}

const sampleTask = {
  id: 'task-1', tenant_id: 't1', ticket_id: 'ticket-1', task_type: 'レッカー対応',
  title: 'テストタスク', description: '', status: 'open', assigned_to: null,
  due_date: null, completed_at: null, sort_order: 0, next_action: '',
  next_action_by: null, next_action_due: null, created_by: null,
  created_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-12T00:00:00Z',
}

describe('TicketGanttChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when no tasks', async () => {
    mockGetTasks.mockResolvedValue([])
    const wrapper = mount(TicketGanttChart, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).not.toContain('ガントチャート')
  })

  it('renders gantt container when tasks exist', async () => {
    mockGetTasks.mockResolvedValue([sampleTask])
    const wrapper = mount(TicketGanttChart, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('ガントチャート')
  })
})
