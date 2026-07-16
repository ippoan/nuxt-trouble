import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import TicketTaskList from '~/components/TicketTaskList.vue'

// モーダルの window keydown listener がテスト間で残留しないよう毎テスト unmount する
enableAutoUnmount(afterEach)

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
const mockGetFieldLayout = vi.fn().mockResolvedValue({ settings: [] })
const mockUpdateFieldLayout = vi.fn().mockImplementation((layout: any) => Promise.resolve(layout))

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
  getFieldLayout: (...args: any[]) => mockGetFieldLayout(...args),
  updateFieldLayout: (...args: any[]) => mockUpdateFieldLayout(...args),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot />{{ label }}</button>',
    props: ['label', 'icon', 'loading', 'disabled', 'size', 'variant', 'color'],
    emits: ['click'],
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
  YmdtInput: {
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
    mockGetFieldLayout.mockResolvedValue({ settings: [] })
    mockUpdateFieldLayout.mockImplementation((layout: any) => Promise.resolve(layout))
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('経過記録')
  })

  it('shows empty message when no tasks', async () => {
    mockGetTasks.mockResolvedValue([])
    const wrapper = mount(TicketTaskList, {
      props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('経過記録項目はありません')
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

  describe('row2 visibility toggle (Refs #205)', () => {
    it('shows row2 fields by default', async () => {
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      expect(wrapper.find('[data-testid="task-row2"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('次回:')
    })

    it('hides row2 when toggle is clicked and shows again on second click', async () => {
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      const toggle = wrapper.find('[data-testid="task-row2-toggle"]')
      expect(toggle.exists()).toBe(true)

      await toggle.trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="task-row2"]').exists()).toBe(false)
      expect(mockUpdateFieldLayout).toHaveBeenCalledWith({
        settings: [{ key: 'task_row2_visible', visible: false, width: 'full', sort_order: 0, label: null }],
      })

      await wrapper.find('[data-testid="task-row2-toggle"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="task-row2"]').exists()).toBe(true)
    })

    it('reverts optimistic update when save fails', async () => {
      mockUpdateFieldLayout.mockRejectedValueOnce(new Error('network error'))
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()

      await wrapper.find('[data-testid="task-row2-toggle"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="task-row2"]').exists()).toBe(true)
    })

    it('persists row2 visibility across mounts via tenant field-layout setting (org 設定)', async () => {
      const wrapper1 = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      await wrapper1.find('[data-testid="task-row2-toggle"]').trigger('click')
      await flushPromises()
      expect(wrapper1.find('[data-testid="task-row2"]').exists()).toBe(false)
      wrapper1.unmount()

      // 2 回目の mount は別ブラウザ (= localStorage を共有しない) を模す。
      // 保存済みのテナント設定を API 経由で返すようモックし直す。
      mockGetFieldLayout.mockResolvedValue({
        settings: [{ key: 'task_row2_visible', visible: false, width: 'full', sort_order: 0, label: null }],
      })
      const wrapper2 = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      expect(wrapper2.find('[data-testid="task-row2"]').exists()).toBe(false)
    })

    it('preserves other tenant field-layout settings when saving row2 visibility', async () => {
      mockGetFieldLayout.mockResolvedValue({
        settings: [{ key: 'title', visible: false, width: 'half', sort_order: 5, label: 'カスタムタイトル' }],
      })
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      await wrapper.find('[data-testid="task-row2-toggle"]').trigger('click')
      await flushPromises()
      expect(mockUpdateFieldLayout).toHaveBeenCalledWith({
        settings: [
          { key: 'title', visible: false, width: 'half', sort_order: 5, label: 'カスタムタイトル' },
          { key: 'task_row2_visible', visible: false, width: 'full', sort_order: 0, label: null },
        ],
      })
    })

    it('keeps next_action_by editable via row1 when row2 is hidden', async () => {
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      await wrapper.find('[data-testid="task-row2-toggle"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-testid="task-row2"]').exists()).toBe(false)
      // Row1 の「対応者」(next_action_by) 表示は Row2 非表示でも残る
      expect(wrapper.text()).toContain('対応者:')
    })
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

    it('見出し右の編集ボタンは 1 個だけで、先頭行の値がフォームに入る', async () => {
      const wrapper = await mountWithTwoTasks()
      const buttons = wrapper.findAll('[data-testid="task-edit-button"]')
      expect(buttons.length).toBe(1)
      await buttons[0]!.trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      expect(vm.editModalOpen).toBe(true)
      expect(vm.editIndex).toBe(0)
      expect(vm.editForm.title).toBe('テストタスク')
    })

    it('2 行目に移動すると assigned_to は名前に解決され next_action_by はそのまま入る', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true }))
      await flushPromises()
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

    it('Ctrl+Shift+↓/↑ で前後の行に移動し、端では停止する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      expect(vm.editIndex).toBe(0)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(1)
      expect(vm.editForm.title).toBe('2件目タスク')

      // 末尾では停止
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(1)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, shiftKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)

      // 先頭では停止
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', ctrlKey: true, shiftKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
    })

    it('修飾キー無し / Alt+↓ (旧ショートカット) では移動しない', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
      // Alt+↓ は select のドロップダウンを開くため移動キーから外した (回帰ガード)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
      // Ctrl のみ / Shift のみでも移動しない
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(0)
    })

    it('発生日時は時刻込みで編集・保存される (occurred_at round-trip)', async () => {
      mockGetTasks.mockResolvedValue([
        { ...sampleTask, occurred_at: '2026-06-23T05:30:00Z' },
        task2,
      ])
      mockGetEmployees.mockResolvedValue(employees)
      const wrapper = mount(TicketTaskList, {
        props: { ticketId: 'ticket-1', workflowStates: [], currentStatusId: null },
        global: { stubs },
      })
      await flushPromises()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      // local YYYY-MM-DDTHH:mm 形式 (時刻を落とさない)
      expect(vm.editForm.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      await vm.handleEditSaveAndClose()
      expect(vm.editError).toBeNull()
      const payload = mockUpdateTask.mock.calls[0]![1]
      // ISO に戻して分単位まで保存される (TZ 非依存の round-trip 検証)
      expect(payload.occurred_at).toBe(new Date('2026-06-23T05:30:00Z').toISOString())
    })

    it('タスク一覧の項目は Tab フォーカス対象外 (tabindex=-1)', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const item = wrapper.find('[data-testid="edit-list-item"]')
      expect(item.attributes('tabindex')).toBe('-1')
    })

    it('モーダル左のタスク一覧に全行が並び、クリックでその行の編集に切り替わる', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      const items = wrapper.findAll('[data-testid="edit-list-item"]')
      expect(items.length).toBe(2)
      // 種別 / 発生日時 / タイトルが表示される
      expect(items[0]!.text()).toContain('レッカー対応')
      expect(items[0]!.text()).toContain('テストタスク')
      expect(items[1]!.text()).toContain('2件目タスク')
      await items[1]!.trigger('click')
      await flushPromises()
      expect(vm.editIndex).toBe(1)
      expect(vm.editForm.title).toBe('2件目タスク')
    })

    it('一覧クリックでも未保存変更は自動保存してから移動する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '変更あり'
      await wrapper.findAll('[data-testid="edit-list-item"]')[1]!.trigger('click')
      await flushPromises()
      expect(mockUpdateTask).toHaveBeenCalledTimes(1)
      expect(mockUpdateTask.mock.calls[0]![0]).toBe('task-1')
      expect(vm.editIndex).toBe(1)
    })

    it('ショートカットは capture で横取りされ、フォーカス中の部品側へは届かない', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      // select にフォーカスがある状況を模して、body (部品側) の listener が
      // イベントを受け取らないこと = ドロップダウンが開かないことを確認する
      const componentSide = vi.fn()
      document.body.addEventListener('keydown', componentSide)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true, bubbles: true }))
      await flushPromises()
      expect(vm.editIndex).toBe(1)
      expect(componentSide).not.toHaveBeenCalled()
      // ショートカット以外のキーは素通しする (通常入力を妨げない)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
      expect(componentSide).toHaveBeenCalledTimes(1)
      document.body.removeEventListener('keydown', componentSide)
    })

    it('Alt+S で保存され、モーダルは閉じない', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = 'Alt+S で保存'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS', altKey: true }))
      await flushPromises()
      expect(mockUpdateTask).toHaveBeenCalledTimes(1)
      expect(mockUpdateTask.mock.calls[0]![1].title).toBe('Alt+S で保存')
      expect(vm.editModalOpen).toBe(true)
      expect(vm.editIndex).toBe(0)
      // Alt 無しの s では保存しない
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', code: 'KeyS' }))
      await flushPromises()
      expect(mockUpdateTask).toHaveBeenCalledTimes(1)
    })

    it('未保存変更がある状態の Ctrl+Shift+↓ は自動保存してから移動する', async () => {
      const wrapper = await mountWithTwoTasks()
      await wrapper.find('[data-testid="task-edit-button"]').trigger('click')
      await flushPromises()
      const vm = wrapper.vm as any
      vm.editForm.title = '変更あり'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true }))
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
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, shiftKey: true }))
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
