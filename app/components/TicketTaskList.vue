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
  due_date: '',
  occurred_at: '',
  assigned_name: '',
})

function resetForm() {
  newTask.title = ''
  newTask.description = ''
  newTask.next_action = ''
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
    </div>

    <div v-if="loading" class="flex justify-center py-4">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-gray-400" />
    </div>

    <template v-else>
      <div v-if="tasks.length === 0" class="text-sm text-gray-500 text-center py-4">
        状況管理項目はありません
      </div>

      <!-- Task cards -->
      <div class="space-y-3">
        <div
          v-for="(task, idx) in tasks"
          :key="task.id"
          :data-task-id="task.id"
          class="border border-gray-200 dark:border-gray-700 rounded-lg"
        >
          <!-- Card header -->
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <!-- Reorder -->
              <div class="flex flex-col">
                <button class="text-gray-500 hover:text-gray-300 disabled:opacity-30" :disabled="idx === 0" @click="handleMoveUp(idx)"><UIcon name="i-lucide-chevron-up" class="size-3.5" /></button>
                <button class="text-gray-500 hover:text-gray-300 disabled:opacity-30" :disabled="idx === tasks.length - 1" @click="handleMoveDown(idx)"><UIcon name="i-lucide-chevron-down" class="size-3.5" /></button>
              </div>
              <!-- task_type -->
              <USelect
                v-if="isEditing(task.id, 'task_type')"
                :model-value="editingValue"
                :items="taskTypes"
                size="xs"
                @update:model-value="editingValue = $event; saveEdit(task.id, 'task_type')"
              />
              <UBadge v-else variant="subtle" size="xs" class="cursor-pointer" @click="startEdit(task, 'task_type')">
                {{ task.task_type }}
              </UBadge>
              <!-- occurred_at -->
              <input v-if="isEditing(task.id, 'occurred_at')" v-model="editingValue" type="date" class="text-xs border border-blue-500 rounded px-1.5 py-0.5 bg-transparent" @blur="saveEdit(task.id, 'occurred_at')" />
              <span v-else class="text-xs text-gray-400 cursor-pointer hover:text-gray-200" @click="startEdit(task, 'occurred_at')">{{ task.occurred_at?.substring(0, 10) || '-' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- status -->
              <USelect
                :model-value="task.status"
                :items="statusOptions"
                size="xs"
                class="w-24"
                @update:model-value="handleStatusChange(task.id, $event)"
              />
              <!-- file -->
              <button class="relative flex items-center justify-center p-1" @click="toggleFilePanel(task.id)">
                <UIcon name="i-lucide-paperclip" class="size-4 text-gray-400 hover:text-gray-200" />
                <span v-if="taskFileCounts[task.id]" class="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{{ taskFileCounts[task.id] }}</span>
              </button>
              <!-- delete -->
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="handleDeleteTask(task.id)" />
            </div>
          </div>

          <!-- Card body -->
          <div class="px-4 py-3">
            <dl class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
              <!-- title -->
              <div class="space-y-1">
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">タイトル</dt>
                <dd>
                  <input v-if="isEditing(task.id, 'title')" v-model="editingValue" class="w-full text-sm border border-blue-500 rounded px-2 py-1 bg-transparent" @blur="saveEdit(task.id, 'title')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                  <span v-else class="text-sm font-medium cursor-pointer hover:text-blue-400" @click="startEdit(task, 'title')">{{ task.title }}</span>
                </dd>
              </div>
              <!-- description -->
              <div class="space-y-1">
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">内容</dt>
                <dd>
                  <input v-if="isEditing(task.id, 'description')" v-model="editingValue" class="w-full text-sm border border-blue-500 rounded px-2 py-1 bg-transparent" @blur="saveEdit(task.id, 'description')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                  <span v-else class="text-sm text-gray-400 cursor-pointer hover:text-gray-200" @click="startEdit(task, 'description')">{{ task.description || '-' }}</span>
                </dd>
              </div>
              <!-- next_action -->
              <div class="space-y-1">
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">次のアクション</dt>
                <dd>
                  <input v-if="isEditing(task.id, 'next_action')" v-model="editingValue" class="w-full text-sm border border-blue-500 rounded px-2 py-1 bg-transparent" @blur="saveEdit(task.id, 'next_action')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                  <span v-else class="text-sm text-gray-400 cursor-pointer hover:text-gray-200" @click="startEdit(task, 'next_action')">{{ task.next_action || '-' }}</span>
                </dd>
              </div>
              <!-- due_date -->
              <div class="space-y-1">
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">期限</dt>
                <dd>
                  <input v-if="isEditing(task.id, 'due_date')" v-model="editingValue" type="date" class="text-sm border border-blue-500 rounded px-2 py-1 bg-transparent" @blur="saveEdit(task.id, 'due_date')" />
                  <span v-else class="text-sm text-gray-400 cursor-pointer hover:text-gray-200" @click="startEdit(task, 'due_date')">{{ task.due_date?.substring(0, 10) || '-' }}</span>
                </dd>
              </div>
              <!-- next_action_by -->
              <div class="space-y-1">
                <dt class="text-[11px] text-gray-500 dark:text-gray-400">対応者</dt>
                <dd>
                  <input v-if="isEditing(task.id, 'next_action_by')" v-model="editingValue" list="task-employee-list" class="w-full text-sm border border-blue-500 rounded px-2 py-1 bg-transparent" @blur="saveEdit(task.id, 'next_action_by')" @keydown.enter="($event.target as HTMLInputElement).blur()" />
                  <span v-else class="text-sm text-gray-400 cursor-pointer hover:text-gray-200" @click="startEdit(task, 'next_action_by')">{{ task.next_action_by || '-' }}</span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- File panel (expanded) -->
          <div v-if="expandedFileTaskId === task.id" class="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
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
        </div>

        <!-- Add task form card -->
        <div
          class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4"
          :class="addError ? 'border-red-400 dark:border-red-500' : ''"
        >
          <div class="flex items-center gap-3 mb-3">
            <USelect v-model="newTask.task_type" :items="taskTypes" size="xs" />
            <input
              v-model="newTask.occurred_at"
              type="date"
              class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
            <div class="space-y-1">
              <label class="text-[11px] text-gray-500 dark:text-gray-400">タイトル</label>
              <input
                v-model="newTask.title"
                placeholder="タイトル"
                class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                @keydown.enter="handleAddTask"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] text-gray-500 dark:text-gray-400">内容</label>
              <input
                v-model="newTask.description"
                placeholder="内容"
                class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] text-gray-500 dark:text-gray-400">次のアクション</label>
              <input
                v-model="newTask.next_action"
                placeholder="次のアクション"
                class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] text-gray-500 dark:text-gray-400">期限</label>
              <input
                v-model="newTask.due_date"
                type="date"
                class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[11px] text-gray-500 dark:text-gray-400">対応者</label>
              <input
                v-model="newTask.assigned_name"
                list="task-employee-list"
                placeholder="対応者名"
                class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <datalist id="task-employee-list">
            <option v-for="e in employees" :key="e.id" :value="e.name" />
          </datalist>
          <div class="flex justify-end mt-3">
            <UButton
              icon="i-lucide-plus"
              label="追加"
              size="xs"
              :loading="adding"
              :disabled="!newTask.title.trim()"
              @click="handleAddTask"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
