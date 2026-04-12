<script setup lang="ts">
import type { TroubleTask, TroubleTaskActivity, TroubleActivityFile } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import {
  getActivities, createActivity, deleteActivity,
  getActivityFiles, uploadActivityFile, downloadActivityFile, deleteActivityFile,
  updateTask,
} from '~/utils/api'

const props = defineProps<{ task: TroubleTask }>()
const emit = defineEmits<{
  statusChange: [taskId: string, newStatus: string]
  delete: [taskId: string]
  updated: []
}>()

const activities = ref<TroubleTaskActivity[]>([])
const activityFiles = ref<Record<string, TroubleActivityFile[]>>({})
const newActivityBody = ref('')
const submittingActivity = ref(false)
const loadingActivities = ref(false)
const savingNextAction = ref(false)

const nextActionDraft = ref(props.task.next_action || '')
const nextActionDueDraft = ref(props.task.next_action_due?.substring(0, 10) || '')
const dueDateDraft = ref(props.task.due_date?.substring(0, 10) || '')

const statusColor = computed(() => {
  return TASK_STATUS_LABELS[props.task.status]?.color || '#9CA3AF'
})

const statusOptions = [
  { label: TASK_STATUS_LABELS['open']!.label, value: 'open' },
  { label: TASK_STATUS_LABELS['in_progress']!.label, value: 'in_progress' },
  { label: TASK_STATUS_LABELS['done']!.label, value: 'done' },
]

const selectedStatus = ref(props.task.status)

watch(() => props.task.status, (val) => { selectedStatus.value = val })
watch(() => props.task.next_action, (val) => { nextActionDraft.value = val || '' })
watch(() => props.task.next_action_due, (val) => { nextActionDueDraft.value = val?.substring(0, 10) || '' })
watch(() => props.task.due_date, (val) => { dueDateDraft.value = val?.substring(0, 10) || '' })

function handleStatusChange(newStatus: string) {
  if (newStatus !== props.task.status) {
    emit('statusChange', props.task.id, newStatus)
  }
}

async function saveNextAction() {
  const trimmed = nextActionDraft.value.trim()
  if (trimmed === (props.task.next_action || '')) return
  savingNextAction.value = true
  try {
    await updateTask(props.task.id, { next_action: trimmed })
    emit('updated')
  } catch (e) {
    console.error('Failed to update next_action:', e)
    nextActionDraft.value = props.task.next_action || ''
  } finally {
    savingNextAction.value = false
  }
}

async function saveNextActionDue() {
  const val = nextActionDueDraft.value || null
  const current = props.task.next_action_due?.substring(0, 10) || null
  if (val === current) return
  try {
    await updateTask(props.task.id, {
      next_action_due: val ? new Date(val).toISOString() : null,
    })
    emit('updated')
  } catch (e) {
    console.error('Failed to update next_action_due:', e)
    nextActionDueDraft.value = props.task.next_action_due?.substring(0, 10) || ''
  }
}

async function saveDueDate() {
  const val = dueDateDraft.value || null
  const current = props.task.due_date?.substring(0, 10) || null
  if (val === current) return
  try {
    await updateTask(props.task.id, {
      due_date: val ? new Date(val).toISOString() : null,
    })
    emit('updated')
  } catch (e) {
    console.error('Failed to update due_date:', e)
    dueDateDraft.value = props.task.due_date?.substring(0, 10) || ''
  }
}

async function loadActivities() {
  if (loadingActivities.value) return
  loadingActivities.value = true
  try {
    activities.value = await getActivities(props.task.id)
    for (const act of activities.value) {
      try {
        activityFiles.value[act.id] = await getActivityFiles(act.id)
      } catch {
        activityFiles.value[act.id] = []
      }
    }
  } catch (e) {
    console.error('Failed to load activities:', e)
  } finally {
    loadingActivities.value = false
  }
}

async function handleAddActivity() {
  if (!newActivityBody.value.trim()) return
  submittingActivity.value = true
  try {
    await createActivity(props.task.id, { body: newActivityBody.value.trim() })
    newActivityBody.value = ''
    await loadActivities()
  } catch (e) {
    console.error('Failed to add activity:', e)
  } finally {
    submittingActivity.value = false
  }
}

async function handleDeleteActivity(activityId: string) {
  try {
    await deleteActivity(activityId)
    await loadActivities()
  } catch (e) {
    console.error('Failed to delete activity:', e)
  }
}

async function handleFileUpload(activityId: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await uploadActivityFile(activityId, file)
    activityFiles.value[activityId] = await getActivityFiles(activityId)
  } catch (e) {
    console.error('Failed to upload file:', e)
  } finally {
    input.value = ''
  }
}

async function handleDownloadFile(fileId: string) {
  try { await downloadActivityFile(fileId) } catch (e) { console.error('Download error:', e) }
}

async function handleDeleteFile(activityId: string, fileId: string) {
  try {
    await deleteActivityFile(fileId)
    activityFiles.value[activityId] = await getActivityFiles(activityId)
  } catch (e) { console.error('Delete file error:', e) }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(loadActivities)
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1.5">
    <!-- Row 1: title + status + delete -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium flex-1 truncate">{{ task.title }}</span>
      <USelect
        v-model="selectedStatus"
        :items="statusOptions"
        size="xs"
        class="w-24"
        @update:model-value="handleStatusChange"
      />
      <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="emit('delete', task.id)" />
    </div>

    <!-- Row 2: next action + next action due + task due date -->
    <div class="flex items-center gap-2">
      <input
        v-model="nextActionDraft"
        placeholder="次のアクション..."
        class="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
        @blur="saveNextAction"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <div class="flex items-center gap-1">
        <span class="text-[10px] text-gray-400 shrink-0">期限</span>
        <input
          v-model="dueDateDraft"
          type="date"
          class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
          @change="saveDueDate"
        />
      </div>
    </div>

    <!-- Row 3: add activity -->
    <div class="flex items-center gap-1">
      <input
        v-model="newActivityBody"
        placeholder="活動を記録..."
        class="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
        @keydown.enter="handleAddActivity"
      />
      <UButton
        icon="i-lucide-plus"
        size="xs"
        :loading="submittingActivity"
        :disabled="!newActivityBody.trim()"
        @click="handleAddActivity"
      />
    </div>

    <!-- Activity timeline (always visible) -->
    <div v-if="loadingActivities" class="text-xs text-gray-500 pl-2">読み込み中...</div>
    <div v-else-if="activities.length > 0" class="space-y-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600 ml-1">
      <div v-for="act in activities" :key="act.id" class="flex items-start gap-1 group">
        <div class="flex-1 min-w-0">
          <span class="text-xs text-gray-400">{{ formatDate(act.occurred_at) }}</span>
          <span class="text-xs ml-1">{{ act.body }}</span>
          <!-- Files inline -->
          <span v-for="f in (activityFiles[act.id] || [])" :key="f.id" class="inline-flex items-center gap-0.5 ml-1 text-xs text-blue-500">
            <UIcon name="i-lucide-paperclip" class="size-3" />
            <button class="hover:underline" @click="handleDownloadFile(f.id)">{{ f.filename }}</button>
            <button class="text-red-400 hover:text-red-600" @click="handleDeleteFile(act.id, f.id)"><UIcon name="i-lucide-x" class="size-3" /></button>
          </span>
        </div>
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          <label class="cursor-pointer"><UIcon name="i-lucide-upload" class="size-3 text-gray-400 hover:text-gray-300" /><input type="file" class="hidden" @change="handleFileUpload(act.id, $event)" /></label>
          <button class="text-red-400 hover:text-red-600" @click="handleDeleteActivity(act.id)"><UIcon name="i-lucide-trash-2" class="size-3" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
