<script setup lang="ts">
import type { TroubleTask, TroubleWorkflowState, Employee } from '~/types'
import { DEFAULT_TASK_TYPES, TASK_STATUS_LABELS } from '~/types'
import { getTasks, getTaskTypes, createTask, updateTask, deleteTask, getEmployees } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  workflowStates: TroubleWorkflowState[]
  currentStatusId: string | null
}>()

const emit = defineEmits<{
  suggestTransition: [toStateId: string, message: string]
  tasksChanged: []
}>()

const UNSET = '__unset__'

const tasks = ref<TroubleTask[]>([])
const loading = ref(false)
const taskTypes = ref<string[]>([])
const adding = ref(false)
const employees = ref<Employee[]>([])
const addError = ref(false)

const newTask = reactive({
  task_type: '',
  title: '',
  description: '',
  next_action: '',
  due_date: '',
  assigned_to: UNSET,
  assigned_name: '',
})

function resetForm() {
  newTask.title = ''
  newTask.description = ''
  newTask.next_action = ''
  newTask.due_date = ''
  newTask.assigned_to = UNSET
  newTask.assigned_name = ''
  addError.value = false
}

const employeeItems = computed(() => [
  { label: '未設定', value: UNSET },
  ...employees.value.map(e => ({ label: e.name, value: e.id })),
])

async function fetchEmployees() {
  try {
    employees.value = await getEmployees()
  } catch {
    employees.value = []
  }
}

async function fetchTaskTypes() {
  try {
    const types = await getTaskTypes()
    taskTypes.value = types.map(t => t.name)
  } catch {
    taskTypes.value = [...DEFAULT_TASK_TYPES]
  }
  if (taskTypes.value.length > 0 && !newTask.task_type) {
    newTask.task_type = taskTypes.value[0]!
  }
}

const groupedTasks = computed(() => {
  const groups: Record<string, TroubleTask[]> = {}
  for (const task of tasks.value) {
    if (!groups[task.task_type]) groups[task.task_type] = []
    groups[task.task_type]!.push(task)
  }
  return groups
})

const completionCount = computed(() => {
  const total = tasks.value.length
  const done = tasks.value.filter(t => t.status === 'done').length
  return { total, done }
})

function taskTypeLabel(value: string): string {
  return value || 'その他'
}

async function loadTasks() {
  loading.value = true
  try {
    tasks.value = await getTasks(props.ticketId)
    checkSuggestions()
  } catch (e) {
    console.error('Failed to load tasks:', e)
  } finally {
    loading.value = false
  }
}

function checkSuggestions() {
  if (tasks.value.length === 0) return

  const allDone = tasks.value.every(t => t.status === 'done')
  const anyInProgress = tasks.value.some(t => t.status === 'in_progress')

  if (allDone) {
    const terminalState = props.workflowStates.find(s => s.is_terminal)
    if (terminalState && props.currentStatusId !== terminalState.id) {
      emit('suggestTransition', terminalState.id, '全てのタスクが完了しました。ステータスを変更しますか？')
    }
  } else if (anyInProgress) {
    const inProgressState = props.workflowStates.find(
      s => !s.is_initial && !s.is_terminal && s.label.includes('対応中'),
    )
    if (inProgressState && props.currentStatusId !== inProgressState.id) {
      emit('suggestTransition', inProgressState.id, 'タスクが進行中です。ステータスを「対応中」に変更しますか？')
    }
  }
}

async function handleAddTask() {
  if (!newTask.title.trim()) return
  adding.value = true
  addError.value = false

  try {
    const assignedTo = (newTask.assigned_to && newTask.assigned_to !== UNSET) ? newTask.assigned_to : null
    await createTask(props.ticketId, {
      task_type: newTask.task_type,
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      next_action: newTask.next_action.trim() || undefined,
      due_date: newTask.due_date || null,
      assigned_to: assignedTo,
      next_action_by: assignedTo ? undefined : (newTask.assigned_name.trim() || undefined),
    })
    resetForm()
    await loadTasks()
    emit('tasksChanged')
  } catch (e) {
    console.error('Failed to add task:', e)
    addError.value = true
  } finally {
    adding.value = false
  }
}

async function handleStatusChange(taskId: string, newStatus: string) {
  try {
    await updateTask(taskId, { status: newStatus })
    await loadTasks()
    emit('tasksChanged')
  } catch (e) {
    console.error('Failed to update task status:', e)
  }
}

async function handleDeleteTask(taskId: string) {
  try {
    await deleteTask(taskId)
    await loadTasks()
    emit('tasksChanged')
  } catch (e) {
    console.error('Failed to delete task:', e)
  }
}

// --- Reorder ---
async function handleMoveUp(groupTasks: TroubleTask[], index: number) {
  if (index <= 0) return
  const current = groupTasks[index]!
  const prev = groupTasks[index - 1]!
  try {
    await Promise.all([
      updateTask(current.id, { sort_order: prev.sort_order }),
      updateTask(prev.id, { sort_order: current.sort_order }),
    ])
    await loadTasks()
  } catch (e) {
    console.error('Failed to reorder tasks:', e)
  }
}

async function handleMoveDown(groupTasks: TroubleTask[], index: number) {
  if (index >= groupTasks.length - 1) return
  const current = groupTasks[index]!
  const next = groupTasks[index + 1]!
  try {
    await Promise.all([
      updateTask(current.id, { sort_order: next.sort_order }),
      updateTask(next.id, { sort_order: current.sort_order }),
    ])
    await loadTasks()
  } catch (e) {
    console.error('Failed to reorder tasks:', e)
  }
}

onMounted(() => {
  fetchTaskTypes()
  fetchEmployees()
  loadTasks()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold">状況管理</h3>
        <UBadge v-if="tasks.length > 0" variant="subtle" size="xs">
          {{ completionCount.done }}/{{ completionCount.total }} 完了
        </UBadge>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-gray-400" />
    </div>

    <template v-else>
      <!-- Grouped task list -->
      <div v-if="tasks.length === 0" class="text-sm text-gray-500 text-center py-4">
        状況管理項目はありません
      </div>

      <div v-else class="space-y-4">
        <div v-for="(groupTasks, type) in groupedTasks" :key="type">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
            {{ taskTypeLabel(type) }}
          </h4>
          <div class="space-y-2">
            <div v-for="(task, idx) in groupTasks" :key="task.id" class="flex items-start gap-1">
              <!-- Reorder buttons -->
              <div class="flex flex-col gap-0.5 pt-1">
                <UButton
                  icon="i-lucide-chevron-up"
                  size="xs"
                  variant="ghost"
                  :disabled="idx === 0"
                  @click="handleMoveUp(groupTasks, idx)"
                />
                <UButton
                  icon="i-lucide-chevron-down"
                  size="xs"
                  variant="ghost"
                  :disabled="idx === groupTasks.length - 1"
                  @click="handleMoveDown(groupTasks, idx)"
                />
              </div>
              <div class="flex-1">
                <TicketTaskCard
                  :task="task"
                  @status-change="handleStatusChange"
                  @delete="handleDeleteTask"
                  @updated="loadTasks"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add task form (single row) -->
      <div class="border-t border-gray-200 dark:border-gray-700 mt-4 pt-3">
        <div class="grid grid-cols-[5rem_1fr_1fr_1fr_6.5rem_7rem_2.5rem] gap-1 mb-1 px-0.5">
          <span class="text-[10px] text-gray-400">種別</span>
          <span class="text-[10px] text-gray-400">タイトル</span>
          <span class="text-[10px] text-gray-400">内容</span>
          <span class="text-[10px] text-gray-400">次のアクション</span>
          <span class="text-[10px] text-gray-400">期限</span>
          <span class="text-[10px] text-gray-400">対応者</span>
          <span />
        </div>

        <div class="grid grid-cols-[5rem_1fr_1fr_1fr_6.5rem_7rem_2.5rem] gap-1" :class="{ 'ring-1 ring-red-400 rounded': addError }">
          <USelect v-model="newTask.task_type" :items="taskTypes" size="xs" class="min-w-0" />
          <input
            v-model="newTask.title"
            placeholder="タイトル"
            class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
            @keydown.enter="handleAddTask"
          />
          <input
            v-model="newTask.description"
            placeholder="内容"
            class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            v-model="newTask.next_action"
            placeholder="次のアクション"
            class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            v-model="newTask.due_date"
            type="date"
            class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <USelect v-if="employees.length > 0" v-model="newTask.assigned_to" :items="employeeItems" value-key="value" size="xs" class="min-w-0" />
          <input
            v-else
            v-model="newTask.assigned_name"
            placeholder="対応者名"
            class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <UButton
            icon="i-lucide-plus"
            size="xs"
            :loading="adding"
            :disabled="!newTask.title.trim()"
            @click="handleAddTask"
          />
        </div>
      </div>
    </template>
  </div>
</template>
