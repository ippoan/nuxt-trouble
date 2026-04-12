<script setup lang="ts">
import type { TroubleTask, TroubleTaskActivity, TroubleActivityFile } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import {
  getActivities, createActivity, deleteActivity,
  getActivityFiles, uploadActivityFile, downloadActivityFile, deleteActivityFile,
} from '~/utils/api'

const props = defineProps<{
  task: TroubleTask
}>()

const emit = defineEmits<{
  statusChange: [taskId: string, newStatus: string]
  delete: [taskId: string]
}>()

const expanded = ref(false)
const activities = ref<TroubleTaskActivity[]>([])
const activityFiles = ref<Record<string, TroubleActivityFile[]>>({})
const newActivityBody = ref('')
const submittingActivity = ref(false)
const loadingActivities = ref(false)

const statusColor = computed(() => {
  switch (props.task.status) {
    case 'open': return '#9CA3AF'
    case 'in_progress': return '#3B82F6'
    case 'done': return '#10B981'
    default: return '#9CA3AF'
  }
})

const statusOptions = [
  { label: TASK_STATUS_LABELS['open']!.label, value: 'open' },
  { label: TASK_STATUS_LABELS['in_progress']!.label, value: 'in_progress' },
  { label: TASK_STATUS_LABELS['done']!.label, value: 'done' },
]

const selectedStatus = ref(props.task.status)

watch(() => props.task.status, (val) => {
  selectedStatus.value = val
})

function handleStatusChange(newStatus: string) {
  if (newStatus !== props.task.status) {
    emit('statusChange', props.task.id, newStatus)
  }
}

async function loadActivities() {
  if (loadingActivities.value) return
  loadingActivities.value = true
  try {
    activities.value = await getActivities(props.task.id)
    // Load files for each activity
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

async function handleToggle() {
  expanded.value = !expanded.value
  if (expanded.value && activities.value.length === 0) {
    await loadActivities()
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
  try {
    await downloadActivityFile(fileId)
  } catch (e) {
    console.error('Failed to download file:', e)
  }
}

async function handleDeleteFile(activityId: string, fileId: string) {
  try {
    await deleteActivityFile(fileId)
    activityFiles.value[activityId] = await getActivityFiles(activityId)
  } catch (e) {
    console.error('Failed to delete file:', e)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP')
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg">
    <!-- Header -->
    <div class="flex items-center gap-2 p-3 cursor-pointer" @click="handleToggle">
      <UIcon
        :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
        class="size-4 text-gray-400 shrink-0"
      />
      <span class="text-sm font-medium flex-1 truncate">{{ task.title }}</span>
      <UBadge
        :style="{ backgroundColor: statusColor + '20', color: statusColor }"
        variant="subtle"
        size="xs"
      >
        {{ TASK_STATUS_LABELS[task.status]?.label || task.status }}
      </UBadge>
      <USelect
        v-model="selectedStatus"
        :items="statusOptions"
        size="xs"
        class="w-24"
        @update:model-value="handleStatusChange"
        @click.stop
      />
      <UButton
        icon="i-lucide-trash-2"
        variant="ghost"
        color="error"
        size="xs"
        @click.stop="emit('delete', task.id)"
      />
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
      <div v-if="loadingActivities" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-5 text-gray-400" />
      </div>

      <template v-else>
        <!-- Activities timeline -->
        <div v-if="activities.length === 0" class="text-sm text-gray-500 text-center py-2">
          活動記録はありません
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="activity in activities"
            :key="activity.id"
            class="relative pl-4 border-l-2 border-gray-200 dark:border-gray-600"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1 flex-1">
                <div class="text-xs text-gray-400">{{ formatDate(activity.occurred_at) }}</div>
                <p class="text-sm">{{ activity.body }}</p>

                <!-- Files for this activity -->
                <div v-if="activityFiles[activity.id]?.length" class="flex flex-wrap gap-1 mt-1">
                  <div
                    v-for="f in activityFiles[activity.id]"
                    :key="f.id"
                    class="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1"
                  >
                    <UIcon name="i-lucide-paperclip" class="size-3" />
                    <button class="hover:underline text-primary-500" @click="handleDownloadFile(f.id)">
                      {{ f.filename }}
                    </button>
                    <button class="text-red-400 hover:text-red-600 ml-1" @click="handleDeleteFile(activity.id, f.id)">
                      <UIcon name="i-lucide-x" class="size-3" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <label class="cursor-pointer">
                  <UIcon name="i-lucide-upload" class="size-4 text-gray-400 hover:text-gray-600" />
                  <input type="file" class="hidden" @change="handleFileUpload(activity.id, $event)" />
                </label>
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  @click="handleDeleteActivity(activity.id)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Add activity form -->
        <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <UInput
            v-model="newActivityBody"
            placeholder="活動を記録..."
            size="sm"
            class="flex-1"
            @keydown.enter="handleAddActivity"
          />
          <UButton
            label="追加"
            size="sm"
            :loading="submittingActivity"
            :disabled="!newActivityBody.trim()"
            @click="handleAddActivity"
          />
        </div>
      </template>
    </div>
  </div>
</template>
