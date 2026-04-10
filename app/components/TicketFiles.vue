<script setup lang="ts">
import type { TroubleFile } from '~/types'
import { getFiles, uploadFile, downloadFile, deleteFile } from '~/utils/api'

const props = defineProps<{ ticketId: string }>()

const files = ref<TroubleFile[]>([])
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function formatSize(bytes: number | bigint): string {
  const n = Number(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function fetchFiles() {
  loading.value = true
  try {
    files.value = await getFiles(props.ticketId)
  } catch (e) {
    console.error('ファイル取得エラー:', e)
  } finally {
    loading.value = false
  }
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const uploaded = await uploadFile(props.ticketId, file)
    files.value.push(uploaded)
  } catch (e) {
    console.error('アップロードエラー:', e)
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function handleDownload(fileId: string) {
  try {
    await downloadFile(fileId)
  } catch (e) {
    console.error('ダウンロードエラー:', e)
  }
}

async function handleDelete(id: string) {
  try {
    await deleteFile(id)
    files.value = files.value.filter(f => f.id !== id)
  } catch (e) {
    console.error('ファイル削除エラー:', e)
  }
}

onMounted(fetchFiles)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold">添付ファイル</h3>
      <div>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          @change="handleUpload"
        />
        <UButton
          label="アップロード"
          icon="i-lucide-upload"
          size="sm"
          :loading="uploading"
          @click="fileInput?.click()"
        />
      </div>
    </div>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="files.length === 0" class="text-sm text-gray-500">
      添付ファイルはありません
    </div>

    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="f in files"
        :key="f.id"
        class="flex items-center justify-between py-2"
      >
        <div>
          <span class="text-sm font-medium">{{ f.filename }}</span>
          <span class="text-xs text-gray-400 ml-2">{{ formatSize(f.size_bytes) }}</span>
        </div>
        <div class="flex gap-1">
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            size="xs"
            @click="handleDownload(f.id)"
          />
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            @click="handleDelete(f.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
