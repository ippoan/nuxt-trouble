<script setup lang="ts">
import type { TroubleTask, TroubleWorkflowState } from '~/types'
import { TASK_TYPES, TASK_STATUS_LABELS } from '~/types'
import { getTasks, createTask, updateTask, deleteTask } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  workflowStates: TroubleWorkflowState[]
  currentStatusId: string | null
}>()

const emit = defineEmits<{
  suggestTransition: [toStateId: string, message: string]
}>()

const tasks = ref<TroubleTask[]>([])
const loading = ref(false)
const newTaskType = ref(TASK_TYPES[0]!.value)
const newTaskTitle = ref('')
const adding = ref(false)

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
  return TASK_TYPES.find(t => t.value === value)?.label || value
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
    // Suggest transitioning to terminal state
    const terminalState = props.workflowStates.find(s => s.is_terminal)
    if (terminalState && props.currentStatusId !== terminalState.id) {
      emit('suggestTransition', terminalState.id, '全てのタスクが完了しました。ステータスを変更しますか？')
    }
  } else if (anyInProgress) {
    // Suggest transitioning to "対応中" state (non-initial, non-terminal)
    const inProgressState = props.workflowStates.find(
      s => !s.is_initial && !s.is_terminal && s.label.includes('対応中'),
    )
    if (inProgressState && props.currentStatusId !== inProgressState.id) {
      emit('suggestTransition', inProgressState.id, 'タスクが進行中です。ステータスを「対応中」に変更しますか？')
    }
  }
}

async function handleAddTask() {
  if (!newTaskTitle.value.trim()) return
  adding.value = true
  try {
    await createTask(props.ticketId, {
      task_type: newTaskType.value,
      title: newTaskTitle.value.trim(),
    })
    newTaskTitle.value = ''
    await loadTasks()
  } catch (e) {
    console.error('Failed to add task:', e)
  } finally {
    adding.value = false
  }
}

async function handleStatusChange(taskId: string, newStatus: string) {
  try {
    await updateTask(taskId, { status: newStatus })
    await loadTasks()
  } catch (e) {
    console.error('Failed to update task status:', e)
  }
}

async function handleDeleteTask(taskId: string) {
  try {
    await deleteTask(taskId)
    await loadTasks()
  } catch (e) {
    console.error('Failed to delete task:', e)
  }
}

onMounted(loadTasks)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold">タスク</h3>
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
        タスクはありません
      </div>

      <div v-else class="space-y-4">
        <div v-for="(groupTasks, type) in groupedTasks" :key="type">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
            {{ taskTypeLabel(type) }}
          </h4>
          <div class="space-y-2">
            <TicketTaskCard
              v-for="task in groupTasks"
              :key="task.id"
              :task="task"
              @status-change="handleStatusChange"
              @delete="handleDeleteTask"
            />
          </div>
        </div>
      </div>

      <!-- Add task form -->
      <div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <USelect
          v-model="newTaskType"
          :items="TASK_TYPES"
          size="sm"
          class="w-32"
        />
        <UInput
          v-model="newTaskTitle"
          placeholder="タスクを追加..."
          size="sm"
          class="flex-1"
          @keydown.enter="handleAddTask"
        />
        <UButton
          label="追加"
          icon="i-lucide-plus"
          size="sm"
          :loading="adding"
          :disabled="!newTaskTitle.trim()"
          @click="handleAddTask"
        />
      </div>
    </template>
  </div>
</template>
