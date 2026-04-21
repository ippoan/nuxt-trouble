import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'
import type { TroubleTask } from '~/types'

const pushMock = vi.fn()
const routeQuery = { value: {} as Record<string, string> }
vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ query: routeQuery.value }),
}))

const listAllTasksMock = vi.fn()
const getTaskTypesMock = vi.fn()
const getEmployeesMock = vi.fn()
const getTaskStatusesMock = vi.fn()
vi.mock('~/utils/api', () => ({
  listAllTasks: (...args: unknown[]) => listAllTasksMock(...args),
  getTaskTypes: (...args: unknown[]) => getTaskTypesMock(...args),
  getEmployees: (...args: unknown[]) => getEmployeesMock(...args),
  getTaskStatuses: (...args: unknown[]) => getTaskStatusesMock(...args),
}))

import TasksPage from '~/pages/tasks.vue'

function makeTask(overrides: Partial<TroubleTask> = {}): TroubleTask {
  return {
    id: 'task-1', tenant_id: 'tenant-1', ticket_id: 'ticket-1234567890abcdef',
    task_type: 'レッカー対応', title: '題名', description: '詳細',
    status: 'open', assigned_to: 'emp-1', due_date: '2026-05-01',
    completed_at: null, sort_order: 0,
    next_action: '電話する', next_action_detail: '',
    next_action_by: 'emp-2', next_action_due: '2026-05-02',
    occurred_at: '2026-04-01', created_by: null,
    created_at: '2026-04-10T00:00:00', updated_at: '2026-04-10T00:00:00',
    ...overrides,
  }
}

describe('tasks page', () => {
  beforeEach(() => {
    pushMock.mockReset()
    listAllTasksMock.mockReset()
    getTaskTypesMock.mockReset()
    getEmployeesMock.mockReset()
    getTaskStatusesMock.mockReset()
    routeQuery.value = {}
    listAllTasksMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 50 })
    getTaskTypesMock.mockResolvedValue([])
    getEmployeesMock.mockResolvedValue([])
    getTaskStatusesMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads and renders list on mount', async () => {
    const tasks = [
      makeTask({ id: 'task-1', title: 'タスクA' }),
      makeTask({ id: 'task-2', title: 'タスクB', status: 'in_progress' }),
    ]
    listAllTasksMock.mockResolvedValue({ items: tasks, total: 2, page: 1, per_page: 50 })
    getTaskTypesMock.mockResolvedValue([
      { id: 'tt-1', tenant_id: 'tenant-1', name: 'カスタムタイプ', sort_order: 0, created_at: '2026-01-01' },
    ])
    getEmployeesMock.mockResolvedValue([
      { id: 'emp-1', tenant_id: 'tenant-1', name: '山田太郎', code: 'E001' },
      { id: 'emp-2', tenant_id: 'tenant-1', name: '佐藤花子', code: 'E002' },
    ])

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(listAllTasksMock).toHaveBeenCalled()
    expect(wrapper.text()).toContain('タスクA')
    expect(wrapper.text()).toContain('タスクB')
    expect(wrapper.text()).toContain('山田太郎')
    expect(wrapper.text()).toContain('未着手')
    expect(wrapper.text()).toContain('進行中')
  })

  it('shows empty state when items is empty', async () => {
    listAllTasksMock.mockResolvedValue({ items: [], total: 0, page: 1, per_page: 50 })

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('該当する状況がありません')
  })

  it('shows error state when API throws', async () => {
    listAllTasksMock.mockRejectedValue(new Error('API down'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('API down')
    errSpy.mockRestore()
  })

  it('filter by status triggers re-fetch with query param', async () => {
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()
    const initialCallCount = listAllTasksMock.mock.calls.length

    const vm = wrapper.vm as unknown as { statusFilter: string }
    vm.statusFilter = 'in_progress'
    await flushPromises()

    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    const lastCall = listAllTasksMock.mock.calls[listAllTasksMock.mock.calls.length - 1]
    expect(lastCall[0]).toMatchObject({ status: 'in_progress' })
  })

  it('search input debounces 300ms before fetching', async () => {
    vi.useFakeTimers()
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await vi.runAllTimersAsync()
    const initialCallCount = listAllTasksMock.mock.calls.length

    const vm = wrapper.vm as unknown as { qFilter: string }
    vm.qFilter = 'キーワード'
    await Promise.resolve()
    // Not yet fetched
    expect(listAllTasksMock.mock.calls.length).toBe(initialCallCount)

    // Advance 250ms: still not fetched
    await vi.advanceTimersByTimeAsync(250)
    expect(listAllTasksMock.mock.calls.length).toBe(initialCallCount)

    // Advance past 300ms
    await vi.advanceTimersByTimeAsync(60)
    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    const lastCall = listAllTasksMock.mock.calls[listAllTasksMock.mock.calls.length - 1]
    expect(lastCall[0]).toMatchObject({ q: 'キーワード' })
  })

  it('sort dropdown changes sort_by and re-fetches', async () => {
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()
    const initialCallCount = listAllTasksMock.mock.calls.length

    const vm = wrapper.vm as unknown as { sortBy: string }
    vm.sortBy = 'due_date'
    await flushPromises()

    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    const lastCall = listAllTasksMock.mock.calls[listAllTasksMock.mock.calls.length - 1]
    expect(lastCall[0]).toMatchObject({ sort_by: 'due_date' })
  })

  it('sort_desc toggle flips direction', async () => {
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()
    const initialCallCount = listAllTasksMock.mock.calls.length

    const vm = wrapper.vm as unknown as { sortDesc: boolean; toggleSortDir: () => void }
    expect(vm.sortDesc).toBe(true)
    vm.toggleSortDir()
    await flushPromises()
    expect(vm.sortDesc).toBe(false)
    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    const lastCall = listAllTasksMock.mock.calls[listAllTasksMock.mock.calls.length - 1]
    expect(lastCall[0]).toMatchObject({ sort_desc: false })
  })

  it('pagination change triggers fetch with new page', async () => {
    // Mock returns echo of requested page so it doesn't snap back to 1
    listAllTasksMock.mockImplementation((q: { page?: number }) => Promise.resolve({
      items: [], total: 200, page: q?.page ?? 1, per_page: 50,
    }))
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()
    const initialCallCount = listAllTasksMock.mock.calls.length

    const vm = wrapper.vm as unknown as { page: number }
    vm.page = 2
    await flushPromises()

    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCallCount)
    const page2Call = listAllTasksMock.mock.calls.find(c => c[0]?.page === 2)
    expect(page2Call).toBeDefined()
  })

  it('row renders NuxtLink to /tickets/{id} with target=_blank', async () => {
    const tasks = [makeTask({ id: 'task-1', ticket_id: 'ticket-abc-123', title: 'T' })]
    listAllTasksMock.mockResolvedValue({ items: tasks, total: 1, page: 1, per_page: 50 })
    const NuxtLinkSpy = {
      template: '<a :data-to="to" :data-target="target" :data-rel="rel"><slot /></a>',
      props: ['to', 'target', 'rel'],
    }

    const wrapper = mount(TasksPage, {
      global: { stubs: { ...allStubs, NuxtLink: NuxtLinkSpy } },
    })
    await flushPromises()

    const links = wrapper.findAll('a')
    const ticketLink = links.find(l => l.attributes('data-to') === '/tickets/ticket-abc-123')
    expect(ticketLink).toBeDefined()
    expect(ticketLink!.attributes('data-target')).toBe('_blank')
    expect(ticketLink!.attributes('data-rel')).toBe('noopener')
  })

  it('reload button triggers refetch', async () => {
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()
    const initialCount = listAllTasksMock.mock.calls.length

    const buttons = wrapper.findAll('button')
    // first button is 再読み込み
    await buttons[0].trigger('click')
    await flushPromises()

    expect(listAllTasksMock.mock.calls.length).toBeGreaterThan(initialCount)
  })

  it('handles master fetch error gracefully', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getTaskTypesMock.mockRejectedValue(new Error('boom'))
    getEmployeesMock.mockRejectedValue(new Error('boom'))

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    // Page still renders even if masters fail
    expect(wrapper.text()).toContain('状況管理 一覧')
    errSpy.mockRestore()
  })

  it('formats dates and shows dash for null', async () => {
    const tasks = [
      makeTask({
        id: 'task-1', title: 'A',
        occurred_at: null, due_date: null, next_action_due: null,
        description: null, next_action: '',
        assigned_to: null, next_action_by: null,
      }),
    ]
    listAllTasksMock.mockResolvedValue({ items: tasks, total: 1, page: 1, per_page: 50 })

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    // Multiple "-" cells exist
    expect(wrapper.text()).toContain('-')
  })

  it('renders unknown status as-is (fallback branch)', async () => {
    const tasks = [makeTask({ id: 'task-1', status: 'weird-status' })]
    listAllTasksMock.mockResolvedValue({ items: tasks, total: 1, page: 1, per_page: 50 })

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('weird-status')
  })

  it('resolves employee name from id, falls back to id if unknown', async () => {
    const tasks = [
      makeTask({ id: 'task-1', assigned_to: 'emp-unknown', next_action_by: 'emp-1' }),
    ]
    listAllTasksMock.mockResolvedValue({ items: tasks, total: 1, page: 1, per_page: 50 })
    getEmployeesMock.mockResolvedValue([
      { id: 'emp-1', tenant_id: 'tenant-1', name: '山田太郎', code: null },
    ])

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('emp-unknown')
    expect(wrapper.text()).toContain('山田太郎')
  })

  it('reads ?status= from route and presets statusFilter', async () => {
    routeQuery.value = { status: 'waiting' }
    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    const vm = wrapper.vm as unknown as { statusFilter: string }
    expect(vm.statusFilter).toBe('waiting')
    // last listAllTasks call should include status=waiting
    const calls = listAllTasksMock.mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toMatchObject({ status: 'waiting' })
  })

  it('status filter uses fetched task statuses when available', async () => {
    // Reset modules so useTaskStatuses singleton is fresh
    vi.resetModules()
    getTaskStatusesMock.mockResolvedValue([
      { id: '1', tenant_id: 't', key: 'custom_foo', name: 'カスタム', color: '#fff', sort_order: 10, is_done: false, created_at: '', updated_at: '' },
    ])
    const mod = await import('~/pages/tasks.vue')
    const FreshTasksPage = mod.default
    const wrapper = mount(FreshTasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    const vm = wrapper.vm as unknown as { STATUS_OPTIONS: Array<{ label: string; value: string }> }
    const opts = vm.STATUS_OPTIONS
    const hasCustom = opts.some(o => o.value === 'custom_foo' && o.label === 'カスタム')
    expect(hasCustom).toBe(true)
  })

  it('error message falls back to string when thrown value is not Error', async () => {
    listAllTasksMock.mockRejectedValue('string error')
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(TasksPage, { global: { stubs: allStubs } })
    await flushPromises()

    expect(wrapper.text()).toContain('string error')
    errSpy.mockRestore()
  })
})
