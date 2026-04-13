<script setup lang="ts">
import type { TroubleTask } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import { updateTask } from '~/utils/api'

const props = defineProps<{ task: TroubleTask }>()
const emit = defineEmits<{
  statusChange: [taskId: string, newStatus: string]
  delete: [taskId: string]
  updated: []
}>()

const savingNextAction = ref(false)

const nextActionDraft = ref(props.task.next_action || '')
const nextActionByDraft = ref(props.task.next_action_by || '')
const nextActionDueDraft = ref(props.task.next_action_due?.substring(0, 10) || '')
const dueDateDraft = ref(props.task.due_date?.substring(0, 10) || '')

const statusOptions = [
  { label: TASK_STATUS_LABELS['open']!.label, value: 'open' },
  { label: TASK_STATUS_LABELS['in_progress']!.label, value: 'in_progress' },
  { label: TASK_STATUS_LABELS['done']!.label, value: 'done' },
]

const selectedStatus = ref(props.task.status)

watch(() => props.task.status, (val) => { selectedStatus.value = val })
watch(() => props.task.next_action, (val) => { nextActionDraft.value = val || '' })
watch(() => props.task.next_action_by, (val) => { nextActionByDraft.value = val || '' })
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

async function saveNextActionBy() {
  const trimmed = nextActionByDraft.value.trim()
  if (trimmed === (props.task.next_action_by || '')) return
  try {
    await updateTask(props.task.id, { next_action_by: trimmed || null })
    emit('updated')
  } catch (e) {
    console.error('Failed to update next_action_by:', e)
    nextActionByDraft.value = props.task.next_action_by || ''
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
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-1.5">
    <!-- Row 1: occurred_at + title + status + delete -->
    <div class="flex items-center gap-2">
      <span v-if="task.occurred_at" class="text-[10px] text-gray-400 shrink-0">{{ task.occurred_at.substring(0, 10) }}</span>
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

    <!-- Description -->
    <p v-if="task.description" class="text-xs text-gray-400 pl-1">{{ task.description }}</p>

    <!-- Next action + assignee + due date -->
    <div class="flex items-center gap-1">
      <span class="text-[10px] text-gray-400 shrink-0">次のアクション</span>
      <input
        v-model="nextActionDraft"
        placeholder="次のアクション..."
        class="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
        @blur="saveNextAction"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span class="text-[10px] text-gray-400 shrink-0">担当</span>
      <input
        v-model="nextActionByDraft"
        placeholder="担当者"
        class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 w-20"
        @blur="saveNextActionBy"
        @keydown.enter="($event.target as HTMLInputElement).blur()"
      />
      <span class="text-[10px] text-gray-400 shrink-0">期限</span>
      <input
        v-model="dueDateDraft"
        type="date"
        class="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
        @change="saveDueDate"
      />
    </div>
  </div>
</template>
