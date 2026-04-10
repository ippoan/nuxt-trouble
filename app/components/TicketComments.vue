<script setup lang="ts">
import type { TroubleComment } from '~/types'
import { getComments, createComment, deleteComment } from '~/utils/api'

const props = defineProps<{ ticketId: string }>()

const comments = ref<TroubleComment[]>([])
const loading = ref(false)
const newBody = ref('')
const submitting = ref(false)

async function fetchComments() {
  loading.value = true
  try {
    comments.value = await getComments(props.ticketId)
  } catch (e) {
    console.error('コメント取得エラー:', e)
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!newBody.value.trim()) return
  submitting.value = true
  try {
    const comment = await createComment(props.ticketId, newBody.value)
    comments.value.push(comment)
    newBody.value = ''
  } catch (e) {
    console.error('コメント作成エラー:', e)
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string) {
  try {
    await deleteComment(id)
    comments.value = comments.value.filter(c => c.id !== id)
  } catch (e) {
    console.error('コメント削除エラー:', e)
  }
}

onMounted(fetchComments)
</script>

<template>
  <div>
    <h3 class="text-base font-semibold mb-4">コメント</h3>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="comments.length === 0" class="text-sm text-gray-500 mb-4">
      コメントはありません
    </div>

    <ul v-else class="space-y-3 mb-4">
      <li
        v-for="c in comments"
        :key="c.id"
        class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
      >
        <div class="flex justify-between items-start">
          <p class="text-sm whitespace-pre-wrap">{{ c.body }}</p>
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            @click="handleDelete(c.id)"
          />
        </div>
        <p class="text-xs text-gray-400 mt-1">
          {{ new Date(c.created_at).toLocaleString('ja-JP') }}
        </p>
      </li>
    </ul>

    <div class="flex gap-2">
      <UTextarea
        v-model="newBody"
        placeholder="コメントを入力..."
        :rows="2"
        class="flex-1"
      />
      <UButton
        label="送信"
        icon="i-lucide-send"
        :loading="submitting"
        :disabled="!newBody.trim()"
        @click="handleCreate"
      />
    </div>
  </div>
</template>
