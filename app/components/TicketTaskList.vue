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
const showAddForm = ref(false)
const newTaskType = ref(TASK_TYPES[0])
const newTaskTitle = ref('')
const creating = ref(false)

const tasksByType = computed(() => {
  const groups: Record<string, TroubleTask[]> = {}
  for (const task of tasks.value) {
    const key = task.task_type || 'その他'
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
  }
  // Sort within each group by sort_order, then created_at
  for (const key in groups) {
    groups[key].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
  }
  return groups
})

// Status suggestion logic
const allDone = computed(() => tasks.value.length > 0 && tasks.value.every(t => t.status === 'done'))
const anyInProgress = computed(() => tasks.value.some(t => t.status === 'in_progress'))

function findTerminalState(): TroubleWorkflowState | undefined {
  return props.workflowStates.find(s => s.is_terminal)
}

function findInProgressState(): TroubleWorkflowState | undefined {
  return props.workflowStates.find(s => s.name === 'in_progress' || s.label === '対応中')
}

watch([allDone, anyInProgress], () => {
  if (allDone.value) {
    const terminal = findTerminalState()
    if (terminal && terminal.id !== props.currentStatusId) {
      emit('suggestTransition', terminal.id, 'すべてのタスクが完了しました。ステータスを完了に変更しますか？')
    }
  } else if (anyInProgress.value) {
    const inProg = findInProgressState()
    const initialState = props.workflowStates.find(s => s.is_initial)
    if (inProg && props.currentStatusId === initialState?.id) {
      emit('suggestTransition', inProg.id, 'タスクが進行中です。ステータスを対応中に変更しますか？')
    }
  }
})

async function fetchTasks() {
  loading.value = true
  try {
    tasks.value = await getTasks(props.ticketId)
  } catch (e) {
    console.error('タスク取得エラー:', e)
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!newTaskTitle.value.trim()) return
  creating.value = true
  try {
    const task = await createTask(props.ticketId, {
      task_type: newTaskType.value,
      title: newTaskTitle.value,
    })
    tasks.value.push(task)
    newTaskTitle.value = ''
    showAddForm.value = false
  } catch (e) {
    console.error('タスク作成エラー:', e)
  } finally {
    creating.value = false
  }
}

async function handleStatusChange(taskId: string, newStatus: string) {
  try {
    const updated = await updateTask(taskId, {
      status: newStatus,
      completed_at: newStatus === 'done' ? new Date().toISOString() : null,
    })
    const idx = tasks.value.findIndex(t => t.id === taskId)
    if (idx >= 0 && updated) tasks.value[idx] = updated
  } catch (e) {
    console.error('ステータス変更エラー:', e)
  }
}

async function handleDelete(taskId: string) {
  try {
    await deleteTask(taskId)
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  } catch (e) {
    console.error('タスク削除エラー:', e)
  }
}

onMounted(fetchTasks)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">タスク</h3>
      <div class="flex items-center gap-2">
        <span v-if="tasks.length > 0" class="text-xs text-gray-400">
          {{ tasks.filter(t => t.status === 'done').length }}/{{ tasks.length }} 完了
        </span>
        <UButton
          label="タスク追加"
          icon="i-lucide-plus"
          size="sm"
          @click="showAddForm = !showAddForm"
        />
      </div>
    </div>

    <!-- Add form -->
    <div v-if="showAddForm" class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
      <div class="flex gap-2">
        <USelect
          v-model="newTaskType"
          :items="TASK_TYPES.map(t => ({ label: t, value: t }))"
          class="w-40"
          size="sm"
        />
        <UInput
          v-model="newTaskTitle"
          placeholder="タスク名"
          class="flex-1"
          size="sm"
          @keyup.enter="handleCreate"
        />
      </div>
      <div class="flex justify-end gap-2">
        <UButton label="キャンセル" variant="outline" size="xs" @click="showAddForm = false" />
        <UButton label="追加" size="xs" :loading="creating" :disabled="!newTaskTitle.trim()" @click="handleCreate" />
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="tasks.length === 0 && !showAddForm" class="text-sm text-gray-500">
      タスクはありません
    </div>

    <!-- Task groups by type -->
    <div v-else class="space-y-4">
      <div v-for="(groupTasks, groupType) in tasksByType" :key="groupType">
        <div class="text-xs text-gray-400 font-medium mb-2 flex items-center gap-2">
          <span>{{ groupType }}</span>
          <span class="text-gray-600">{{ groupTasks.length }}件</span>
        </div>
        <div class="space-y-2">
          <TicketTaskCard
            v-for="task in groupTasks"
            :key="task.id"
            :task="task"
            @status-change="handleStatusChange"
            @delete="handleDelete"
          />
        </div>
      </div>
    </div>
  </div>
</template>
