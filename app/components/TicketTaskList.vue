<script setup lang="ts">
import type { TroubleTask, TroubleWorkflowState, Employee, TroubleFile } from '~/types'
import { DEFAULT_TASK_TYPES, TASK_STATUS_LABELS } from '~/types'
import { getTasks, getTaskTypes, createTask, updateTask, deleteTask, getEmployees, getTaskFiles, uploadTaskFile, downloadTaskFile, deleteTaskFile } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  workflowStates: TroubleWorkflowState[]
  currentStatusId: string | null
}>()

const emit = defineEmits<{
  suggestTransition: [toStateId: string, message: string]
  tasksChanged: []
}>()

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
  next_action_detail: '',
  due_date: '',
  occurred_at: '',
  assigned_name: '',
})

function resetForm() {
  newTask.title = ''
  newTask.description = ''
  newTask.next_action = ''
  newTask.next_action_detail = ''
  newTask.due_date = ''
  newTask.occurred_at = ''
  newTask.assigned_name = ''
  addError.value = false
}

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

const completionCount = computed(() => {
  const total = tasks.value.length
  const done = tasks.value.filter(t => t.status === 'done').length
  return { total, done }
})

async function loadTasks() {
  loading.value = true
  try {
    tasks.value = await getTasks(props.ticketId)
    checkSuggestions()
    loadAllFileCounts()
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
    const name = newTask.assigned_name.trim()
    const matchedEmployee = name ? employees.value.find(e => e.name === name) : null
    await createTask(props.ticketId, {
      task_type: newTask.task_type,
      title: newTask.title.trim(),
      description: newTask.description.trim() || undefined,
      next_action: newTask.next_action.trim() || undefined,
      next_action_detail: newTask.next_action_detail.trim() || undefined,
      due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      occurred_at: newTask.occurred_at ? new Date(newTask.occurred_at).toISOString() : null,
      assigned_to: matchedEmployee?.id || null,
      next_action_by: name || null,
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

const statusOptions = [
  { label: TASK_STATUS_LABELS['open']!.label, value: 'open' },
  { label: TASK_STATUS_LABELS['in_progress']!.label, value: 'in_progress' },
  { label: TASK_STATUS_LABELS['done']!.label, value: 'done' },
]

// --- Inline edit ---
const editingId = ref<string | null>(null)
const editingField = ref<string | null>(null)
const editingValue = ref('')

function startEdit(task: TroubleTask, field: string) {
  editingId.value = task.id
  editingField.value = field
  const val = (task as any)[field]
  if (field === 'occurred_at' || field === 'due_date') {
    editingValue.value = val?.substring(0, 10) || ''
  } else {
    editingValue.value = val || ''
  }
}

async function saveEdit(taskId: string, field: string) {
  editingId.value = null
  const original = tasks.value.find(t => t.id === taskId)
  if (!original) return
  const oldVal = (field === 'occurred_at' || field === 'due_date')
    ? ((original as any)[field]?.substring(0, 10) || '')
    : ((original as any)[field] || '')
  if (editingValue.value === oldVal) return
  const payload: Record<string, any> = {}
  if (field === 'occurred_at' || field === 'due_date') {
    payload[field] = editingValue.value ? new Date(editingValue.value).toISOString() : null
  } else {
    payload[field] = editingValue.value || null
  }
  try {
    await updateTask(taskId, payload)
    await loadTasks()
    emit('tasksChanged')
  } catch (e) {
    console.error('Failed to update task:', e)
  }
}

function isEditing(taskId: string, field: string) {
  return editingId.value === taskId && editingField.value === field
}

// --- Reorder ---
async function handleMoveUp(index: number) {
  if (index <= 0) return
  const current = tasks.value[index]!
  const prev = tasks.value[index - 1]!
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

async function handleMoveDown(index: number) {
  if (index >= tasks.value.length - 1) return
  const current = tasks.value[index]!
  const next = tasks.value[index + 1]!
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

// --- File attachments ---
const expandedFileTaskId = ref<string | null>(null)
const taskFiles = ref<TroubleFile[]>([])
const taskFileCounts = ref<Record<string, number>>({})
const fileUploading = ref(false)

async function loadFileCount(taskId: string) {
  try {
    const files = await getTaskFiles(taskId)
    taskFileCounts.value[taskId] = files.length
  } catch {
    taskFileCounts.value[taskId] = 0
  }
}

async function loadAllFileCounts() {
  await Promise.all(tasks.value.map(t => loadFileCount(t.id)))
}

async function toggleFilePanel(taskId: string) {
  if (expandedFileTaskId.value === taskId) {
    expandedFileTaskId.value = null
    return
  }
  expandedFileTaskId.value = taskId
  try {
    taskFiles.value = await getTaskFiles(taskId)
  } catch {
    taskFiles.value = []
  }
}

async function handleFileUpload(taskId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileUploading.value = true
  try {
    await uploadTaskFile(taskId, file)
    taskFiles.value = await getTaskFiles(taskId)
    taskFileCounts.value[taskId] = taskFiles.value.length
  } catch (e) {
    console.error('Failed to upload file:', e)
  } finally {
    fileUploading.value = false
    input.value = ''
  }
}

async function handleFileDelete(taskId: string, fileId: string) {
  try {
    await deleteTaskFile(fileId)
    taskFiles.value = await getTaskFiles(taskId)
    taskFileCounts.value[taskId] = taskFiles.value.length
  } catch (e) {
    console.error('Failed to delete file:', e)
  }
}

function formatFileSize(bytes: number | bigint): string {
  const n = Number(bytes)
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  return `${(n / 1024 / 1024).toFixed(1)}MB`
}

onMounted(() => {
  fetchTaskTypes()
  fetchEmployees()
  loadTasks().then(() => loadAllFileCounts())
})

// Unified 9-col grid: reorder / task_type / date / title / description / assignee / status / file / delete
const GRID = 'grid-cols-[2.5rem_6rem_7rem_1fr_1fr_8rem_6rem_2.5rem_2.5rem]'
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold">状況管理</h3>
        <UBadge v-if="tasks.length > 0" variant="subtle" size="xs">
          {{ completionCount.done }}/{{ completionCount.total }} 完了
        </UBadge>
      </div>
      <slot name="actions" />
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-gray-400" />
    </div>

    <template v-else>
      <div v-if="tasks.length === 0" class="text-sm text-gray-500 text-center py-4">
        状況管理項目はありません
      </div>

      <!-- Table header -->
      <div v-if="tasks.length > 0" :class="['grid gap-1 py-1.5 px-1 rounded-t-lg bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700', GRID]">
        <span />
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">種別</span>
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">発生日</span>
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">タイトル</span>
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">内容</span>
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">対応者</span>
        <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状態</span>
        <span />
        <span />
      </div>

      <!-- Task rows (2 rows per task, same 9-col grid) -->
      <template v-for="(task, idx) in tasks" :key="task.id">
        <!-- Row 1: reorder / task_type / occurred_at / title / description / next_action_by / status / file / delete -->
        <div :data-task-id="task.id" :class="['grid gap-1 pt-2 pb-0.5 px-1 items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors', GRID]">
          <div class="flex flex-col items-center">
            <button class="text-gray-400 hover:text-gray-200 disabled:opacity-20 transition-colors" :disabled="idx === 0" @click="handleMoveUp(idx)"><UIcon name="i-lucide-chevron-up" class="size-3" /></button>
            <button class="text-gray-400 hover:text-gray-200 disabled:opacity-20 transition-colors" :disabled="idx === tasks.length - 1" @click="handleMoveDown(idx)"><UIcon name="i-lucide-chevron-down" class="size-3" /></button>
          </div>
          <!-- task_type -->
          <USelect v-if="isEditing(task.id, 'task_type')" :model-value="editingValue" :items="taskTypes" size="xs" class="min-w-0" @update:model-value="editingValue = $event; saveEdit(task.id, 'task_type')" />
          <span v-else class="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 truncate cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600/60 transition-colors" @click="startEdit(task, 'task_type')">{{ task.task_type }}</span>
          <!-- occurred_at -->
          <input v-if="isEditing(task.id, 'occurred_at')" v-model="editingValue" type="date" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'occurred_at')" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'occurred_at')">{{ task.occurred_at?.substring(0, 10) || '-' }}</span>
          <!-- title -->
          <input v-if="isEditing(task.id, 'title')" v-model="editingValue" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'title')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs font-medium truncate cursor-pointer hover:text-blue-400 transition-colors" @click="startEdit(task, 'title')">{{ task.title }}</span>
          <!-- description -->
          <input v-if="isEditing(task.id, 'description')" v-model="editingValue" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'description')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'description')">{{ task.description || '-' }}</span>
          <!-- next_action_by (対応者) -->
          <input v-if="isEditing(task.id, 'next_action_by')" v-model="editingValue" list="task-employee-list" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'next_action_by')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'next_action_by')">{{ task.next_action_by || '-' }}</span>
          <!-- status -->
          <USelect :model-value="task.status" :items="statusOptions" size="xs" class="min-w-0" @update:model-value="handleStatusChange(task.id, $event)" />
          <!-- file -->
          <button class="relative flex items-center justify-center" @click="toggleFilePanel(task.id)">
            <UIcon name="i-lucide-paperclip" class="size-4 text-gray-400 hover:text-gray-200 transition-colors" />
            <span v-if="taskFileCounts[task.id]" class="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{{ taskFileCounts[task.id] }}</span>
          </button>
          <!-- delete -->
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteTask(task.id)" />
        </div>

        <!-- Row 2: _ / _ / due_date / next_action / next_action_detail / next_action_by / _ / _ / _ -->
        <div :class="['grid gap-1 pb-2 px-1 mb-0.5 border-b border-gray-100 dark:border-gray-800 items-center hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors', GRID]">
          <span />
          <span />
          <!-- due_date (aligned under occurred_at) -->
          <input v-if="isEditing(task.id, 'due_date')" v-model="editingValue" type="date" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'due_date')" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'due_date')">
            <span class="text-[10px] text-gray-500 mr-1">期限:</span>{{ task.due_date?.substring(0, 10) || '-' }}
          </span>
          <!-- next_action (aligned under title) -->
          <input v-if="isEditing(task.id, 'next_action')" v-model="editingValue" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'next_action')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'next_action')">
            <span class="text-[10px] text-gray-500 mr-1">次:</span>{{ task.next_action || '-' }}
          </span>
          <!-- next_action_detail (aligned under description) -->
          <input v-if="isEditing(task.id, 'next_action_detail')" v-model="editingValue" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'next_action_detail')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'next_action_detail')">
            <span class="text-[10px] text-gray-500 mr-1">詳細:</span>{{ task.next_action_detail || '-' }}
          </span>
          <!-- next_action_by (aligned under 対応者) -->
          <input v-if="isEditing(task.id, 'next_action_by')" v-model="editingValue" list="task-employee-list" class="min-w-0 text-xs border border-blue-500 rounded px-1 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'next_action_by')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
          <span v-else class="text-xs text-gray-400 truncate cursor-pointer hover:text-gray-200 transition-colors" @click="startEdit(task, 'next_action_by')">{{ task.next_action_by || '-' }}</span>
          <span />
          <span />
          <span />
        </div>

        <!-- File panel -->
        <div v-if="expandedFileTaskId === task.id" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-3 mx-1 mb-1">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-300">添付ファイル</span>
            <label class="cursor-pointer">
              <UButton icon="i-lucide-upload" size="xs" variant="outline" :loading="fileUploading" as="span">追加</UButton>
              <input type="file" class="hidden" @change="handleFileUpload(task.id, $event)" />
            </label>
          </div>
          <div v-if="taskFiles.length === 0" class="text-xs text-gray-500">ファイルなし</div>
          <div v-for="f in taskFiles" :key="f.id" class="flex items-center justify-between py-1 border-b border-gray-200 dark:border-gray-800 last:border-0">
            <button class="text-xs text-blue-400 hover:underline truncate" @click="downloadTaskFile(f.id)">{{ f.filename }}</button>
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <span class="text-[10px] text-gray-500">{{ formatFileSize(f.size_bytes) }}</span>
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleFileDelete(task.id, f.id)" />
            </div>
          </div>
        </div>
      </template>

      <!-- Add task form (same 9-col grid) -->
      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" :class="addError ? 'ring-1 ring-red-400 rounded' : ''">
        <!-- Form Row 1 -->
        <div :class="['grid gap-1 px-1 items-center', GRID]">
          <span />
          <USelect v-model="newTask.task_type" :items="taskTypes" size="xs" class="min-w-0" />
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-[10px] text-gray-500 shrink-0">日時</span>
            <input v-model="newTask.occurred_at" type="date" class="min-w-0 flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <input v-model="newTask.title" placeholder="タイトル" class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" @keydown.enter="handleAddTask" />
          <input v-model="newTask.description" placeholder="内容" class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input v-model="newTask.assigned_name" list="task-employee-list" placeholder="対応者名" class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <span />
          <span />
          <span />
        </div>
        <!-- Form Row 2 -->
        <div :class="['grid gap-1 mt-1 px-1 items-center', GRID]">
          <span />
          <span />
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-[10px] text-gray-500 shrink-0">期限</span>
            <input v-model="newTask.due_date" type="date" class="min-w-0 flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <input v-model="newTask.next_action" placeholder="次のアクション" class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input v-model="newTask.next_action_detail" placeholder="詳細" class="min-w-0 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <span />
          <span />
          <span />
          <UButton icon="i-lucide-plus" size="xs" :loading="adding" :disabled="!newTask.title.trim()" @click="handleAddTask" />
        </div>
        <datalist id="task-employee-list">
          <option v-for="e in employees" :key="e.id" :value="e.name" />
        </datalist>
      </div>
    </template>
  </div>
</template>
