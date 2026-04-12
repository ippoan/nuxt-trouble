<script setup lang="ts">
import type { TroubleTask, TroubleTaskActivity, TroubleActivityFile } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import { getActivities, createActivity, deleteActivity, getActivityFiles, uploadActivityFile, downloadActivityFile, deleteActivityFile } from '~/utils/api'

const props = defineProps<{ task: TroubleTask }>()
const emit = defineEmits<{
  statusChange: [taskId: string, newStatus: string]
  delete: [taskId: string]
}>()

const expanded = ref(false)
const activities = ref<TroubleTaskActivity[]>([])
const activityFiles = ref<Record<string, TroubleActivityFile[]>>({})
const loadingActivities = ref(false)
const newBody = ref('')
const submitting = ref(false)

const statusInfo = computed(() => TASK_STATUS_LABELS[props.task.status] || { label: props.task.status, color: '#9CA3AF' })

const statusOptions = [
  { label: '未着手', value: 'open' },
  { label: '進行中', value: 'in_progress' },
  { label: '完了', value: 'done' },
]

async function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value && activities.value.length === 0) {
    await fetchActivities()
  }
}

async function fetchActivities() {
  loadingActivities.value = true
  try {
    activities.value = await getActivities(props.task.id)
    // Fetch files for each activity
    for (const act of activities.value) {
      try {
        activityFiles.value[act.id] = await getActivityFiles(act.id)
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.error('アクティビティ取得エラー:', e)
  } finally {
    loadingActivities.value = false
  }
}

async function handleAddActivity() {
  if (!newBody.value.trim()) return
  submitting.value = true
  try {
    const activity = await createActivity(props.task.id, { body: newBody.value })
    activities.value.push(activity)
    activityFiles.value[activity.id] = []
    newBody.value = ''
  } catch (e) {
    console.error('アクティビティ作成エラー:', e)
  } finally {
    submitting.value = false
  }
}

async function handleDeleteActivity(activityId: string) {
  try {
    await deleteActivity(activityId)
    activities.value = activities.value.filter(a => a.id !== activityId)
    delete activityFiles.value[activityId]
  } catch (e) {
    console.error('アクティビティ削除エラー:', e)
  }
}

async function handleUploadFile(activityId: string, event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const uploaded = await uploadActivityFile(activityId, file)
    if (!activityFiles.value[activityId]) activityFiles.value[activityId] = []
    activityFiles.value[activityId].push(uploaded)
  } catch (e) {
    console.error('ファイルアップロードエラー:', e)
  } finally {
    target.value = ''
  }
}

async function handleDownloadFile(fileId: string) {
  try {
    await downloadActivityFile(fileId)
  } catch (e) {
    console.error('ダウンロードエラー:', e)
  }
}

async function handleDeleteFile(activityId: string, fileId: string) {
  try {
    await deleteActivityFile(fileId)
    activityFiles.value[activityId] = activityFiles.value[activityId]?.filter(f => f.id !== fileId) || []
  } catch (e) {
    console.error('ファイル削除エラー:', e)
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
    <!-- Task header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 cursor-pointer flex-1" @click="toggleExpand">
        <UIcon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4 text-gray-400" />
        <span class="text-sm font-medium">{{ task.title }}</span>
        <UBadge
          :style="{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }"
          variant="subtle"
          size="xs"
        >
          {{ statusInfo.label }}
        </UBadge>
      </div>
      <div class="flex items-center gap-1">
        <USelect
          :model-value="task.status"
          :items="statusOptions"
          size="xs"
          class="w-24"
          @update:model-value="(v: string) => emit('statusChange', task.id, v)"
        />
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          @click="emit('delete', task.id)"
        />
      </div>
    </div>

    <!-- Task description -->
    <p v-if="task.description" class="text-xs text-gray-500 mt-1 ml-6">
      {{ task.description }}
    </p>

    <!-- Completed at -->
    <p v-if="task.completed_at" class="text-xs text-green-500 mt-1 ml-6">
      完了: {{ new Date(task.completed_at).toLocaleString('ja-JP') }}
    </p>

    <!-- Expanded: activities -->
    <div v-if="expanded" class="mt-3 ml-6 space-y-3">
      <div v-if="loadingActivities" class="text-xs text-gray-500">読み込み中...</div>

      <div v-else>
        <!-- Activity list -->
        <div v-for="act in activities" :key="act.id" class="text-sm border-l-2 border-gray-600 pl-3 py-1">
          <div class="flex justify-between items-start">
            <div>
              <span class="text-xs text-gray-400">{{ new Date(act.occurred_at).toLocaleString('ja-JP') }}</span>
              <p class="whitespace-pre-wrap">{{ act.body }}</p>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="handleDeleteActivity(act.id)"
            />
          </div>

          <!-- Activity files -->
          <div v-if="activityFiles[act.id]?.length" class="mt-1 space-y-1">
            <div
              v-for="f in activityFiles[act.id]"
              :key="f.id"
              class="flex items-center gap-2 text-xs text-gray-400"
            >
              <UIcon name="i-lucide-paperclip" class="size-3" />
              <span class="cursor-pointer hover:text-blue-400" @click="handleDownloadFile(f.id)">
                {{ f.filename }}
              </span>
              <span>({{ formatSize(f.size_bytes) }})</span>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="error"
                size="xs"
                @click="handleDeleteFile(act.id, f.id)"
              />
            </div>
          </div>

          <!-- File upload for this activity -->
          <div class="mt-1">
            <label class="text-xs text-blue-500 hover:text-blue-400 cursor-pointer">
              <UIcon name="i-lucide-upload" class="size-3 inline" /> ファイル添付
              <input type="file" class="hidden" @change="handleUploadFile(act.id, $event)" />
            </label>
          </div>
        </div>

        <!-- Add activity -->
        <div class="flex gap-2 mt-2">
          <UInput
            v-model="newBody"
            placeholder="アクティビティを追加..."
            size="sm"
            class="flex-1"
            @keyup.enter="handleAddActivity"
          />
          <UButton
            icon="i-lucide-plus"
            size="sm"
            :loading="submitting"
            :disabled="!newBody.trim()"
            @click="handleAddActivity"
          />
        </div>
      </div>
    </div>
  </div>
</template>
