import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketTaskList from '~/components/TicketTaskList.vue'

const sampleTask = {
  id: 'task-1', tenant_id: 't1', ticket_id: 'ticket-1', task_type: 'レッカー対応',
  title: 'テストタスク', description: '', status: 'open', assigned_to: null,
  due_date: null, completed_at: null, sort_order: 0, next_action: '',
  next_action_detail: '', next_action_by: null, next_action_due: null, created_by: null,
  created_at: '2026-04-12T00:00:00Z', updated_at: '2026-04-12T00:00:00Z',
}

const mockGetTasks = vi.fn().mockResolvedValue([sampleTask])
const mockGetTaskTypes = vi.fn().mockResolvedValue([
  { id: '1', name: 'レッカー対応', sort_order: 0, tenant_id: 't1', created_at: '' },
])
const mockCreateTask = vi.fn().mockResolvedValue(sampleTask)
const mockUpdateTask = vi.fn().mockResolvedValue(sampleTask)
const mockDeleteTask = vi.fn().mockResolvedValue(undefined)
const mockGetEmployees = vi.fn().mockResolvedValue([])
const mockGetTaskStatuses = vi.fn().mockResolvedValue([])

vi.mock('~/utils/api', () => ({
  getTasks: (...args: any[]) => mockGetTasks(...args),
  getTaskTypes: (...args: any[]) => mockGetTaskTypes(...args),
  createTask: (...args: any[]) => mockCreateTask(...args),
  updateTask: (...args: any[]) => mockUpdateTask(...args),
  deleteTask: (...args: any[]) => mockDeleteTask(...args),
  getEmployees: (...args: any[]) => mockGetEmployees(...args),
  getTaskStatuses: (...args: any[]) => mockGetTaskStatuses(...args),
  getTaskFiles: vi.fn().mockResolvedValue([]),
  uploadTaskFile: vi.fn().mockResolvedValue({}),
  downloadTaskFile: vi.fn().mockResolvedValue(undefined),
  deleteTaskFile: vi.fn().mockResolvedValue(undefined),
  restoreTaskFile: vi.fn().mockResolvedValue(undefined),
  getTrashFiles: vi.fn().mockResolvedValue([]),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled', 'size', 'variant', 'color'],
  },
  UIcon: { template: '<span />', props: ['name'] },
  UBadge: { template: '<span><slot /></span>', props: ['variant', 'size'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'size', 'valueKey'] },
  UInput: {
    template: '<input :type="type" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @keydown="$emit(\'keydown\', $event)" />',
    props: ['modelValue', 'type', 'placeholder', 'size', 'list'],
    emits: ['update:modelValue', 'keydown'],
  },
  UFormField: { template: '<div><slot /></div>', props: ['label'] },
  UTextarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'rows'],
    emits: ['update:modelValue'],
  },
  UModal: { template: '<div v-if="open"><slot name="content" /></div>', props: ['open'] },
  TicketTaskCard: { template: '<div class="task-card">{{ task.title }}</div>', props: ['task'] },
  YmdInput: {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value || undefined)" />',
    props: ['modelValue'],
    emits: ['update:modelValue'],
  },
}

describe('TicketTaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTasks.mockResolvedValue([sampleTask])
    mockGetTaskTypes.mockResolvedValue([
      { id: '1', name: 'レッカー対応', sort_order: 0, tenant_id: 't1', created_at: '' },
    ])
    mockGetEmployees.mockResolvedValue([])
    mockGetTaskStatuses.mockResolvedValue([])
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('状況管理')
  })

  it('shows empty message when no tasks', async () => {
    mockGetTasks.mockResolvedValue([])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('状況管理項目はありません')
  })

  it('renders task list when tasks exist', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('テストタスク')
  })

  it('statusOptions uses fetched task statuses when loaded', async () => {
    mockGetTaskStatuses.mockResolvedValue([
      { id: '1', tenant_id: 't1', key: 'waiting', name: '待機', color: '#F59E0B', sort_order: 30, is_done: false, created_at: '', updated_at: '' },
      { id: '2', tenant_id: 't1', key: 'done', name: '完了', color: '#10B981', sort_order: 40, is_done: true, created_at: '', updated_at: '' },
    ])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    const vm = wrapper.vm as unknown as { statusOptions: Array<{ label: string; value: string }> }
    expect(vm.statusOptions.some(o => o.value === 'waiting' && o.label === '待機')).toBe(true)
  })

  it('statusOptions falls back to TASK_STATUS_LABELS when task statuses empty', async () => {
    mockGetTaskStatuses.mockResolvedValue([])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    const vm = wrapper.vm as unknown as { statusOptions: Array<{ label: string; value: string }> }
    expect(vm.statusOptions.some(o => o.value === 'open')).toBe(true)
    expect(vm.statusOptions.some(o => o.value === 'done')).toBe(true)
  })

  describe('edit modal (Refs #191)', () => {
    const task2 = {
      ...sampleTask,
      id: 'task-2', title: '2件目タスク', sort_order: 1,
      assigned_to: 'emp-1', next_action_by: '山田',
    }
    const employees = [
      { id: 'emp-1', tenant_id: 't1', name: '松江 寛人', code: null },
      { id: 'emp-2', tenant_id: 't1', name: '山田', code: null },
    ]

    async function mountWithTwoTasks() {
      mockGetTasks.mockResolvedValue([sampleTask, task2])
      mockGetEmployees.mockResolvedValue(employees)
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      return wrapper
    }

    it('編集ボタンでモーダルが開き、対象 task の値がフォームに入る', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.findAll('[data-testid="task-edit-button"]')[1]!.trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      expect(vm.editModalOpen).toBe(true)
      expect(vm.editIndex).toBe(1)
      expect(vm.editForm.title).toBe('2件目タスク')
      // Row1 assigned_to (employee id) は名前に解決して表示する
      expect(vm.editForm.assigned_name).toBe('松江 寛人')
      // Row2 next_action_by はそのまま
      expect(vm.editForm.next_action_by).toBe('山田')
    })

    it('モーダルに対応者 2 欄 (Row1/Row2) が両方存在する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="edit-assigned"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="edit-next-action-by"]').exists()).toBe(true)
    })

    it('保存で updateTask が呼ばれ、対応者名は employee id に変換される', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '更新後タイトル'
      vm.editForm.assigned_name = '松江 寛人'
      vm.editForm.next_action_by = '山田'
      await vm.handleEditSaveAndClose()
      await flushPromises()
      expect(mockUpdateTask).toHaveBeenCalledTimes(1)
      const [taskId, payload] = mockUpdateTask.mock.calls[0]!
      expect(taskId).toBe('task-1')
      expect(payload.title).toBe('更新後タイトル')
      expect(payload.assigned_to).toBe('emp-1')
      expect(payload.next_action_by).toBe('山田')
      expect(payload.due_date).toBeNull()
      expect(vm.editModalOpen).toBe(false)
    })

    it('タイトル空では保存せずモーダル内にエラーを出す', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '  '
      await vm.handleEditSaveAndClose()
      expect(mockUpdateTask).not.toHaveBeenCalled()
      expect(vm.editError).toContain('タイトル')
      expect(vm.editModalOpen).toBe(true)
    })

    it('Alt+↓/↑ で前後の行に移動し、端では停止する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      expect(vm.editIndex).toBe(0)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(1)
      expect(vm.editForm.title).toBe('2件目タスク')

      // 末尾では停止
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(1)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)

      // 先頭では停止
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
    })

    it('Alt 無しの ↓ では移動しない', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
    })

    it('未保存変更がある状態の Alt+↓ は自動保存してから移動する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '変更あり'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
      await flushPromises()
      expect(mockUpdateTask).toHaveBeenCalledTimes(1)
      expect(mockUpdateTask.mock.calls[0]![0]).toBe('task-1')
      expect(vm.editIndex).toBe(1)
    })

    it('自動保存が失敗したら移動しない', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '変更あり'
      mockUpdateTask.mockRejectedValueOnce(new Error('API エラー (500): boom'))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
      expect(vm.editError).toBeTruthy()
    })
  })

  it('handleAddTask sends null for empty due_date', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()

    const titleInput = wrapper.find('input[placeholder="タイトル"]')
    await titleInput.setValue('新しいタスク')
    await wrapper.vm.$nextTick()

    mockCreateTask.mockResolvedValue({ ...sampleTask, id: 'task-new', title: '新しいタスク' })
    await titleInput.trigger('keydown.enter')
    await flushPromises()

    expect(mockCreateTask).toHaveBeenCalled()
    const callArgs = mockCreateTask.mock.calls[0]
    expect(callArgs[1].due_date).toBeNull()
  })
})
