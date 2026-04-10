<script setup lang="ts">
import type { TroubleStatusHistory, TroubleWorkflowState } from '~/types'
import { getStatusHistory } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  workflowStates: TroubleWorkflowState[]
}>()

const history = ref<TroubleStatusHistory[]>([])
const loading = ref(false)

function stateLabel(id: string | null): string {
  if (!id) return '(なし)'
  return props.workflowStates.find(s => s.id === id)?.label || '不明'
}

function stateColor(id: string | null): string {
  if (!id) return '#9CA3AF'
  return props.workflowStates.find(s => s.id === id)?.color || '#9CA3AF'
}

async function fetchHistory() {
  loading.value = true
  try {
    history.value = await getStatusHistory(props.ticketId)
  } catch (e) {
    console.error('履歴取得エラー:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchHistory)
</script>

<template>
  <div>
    <h3 class="text-base font-semibold mb-4">ステータス履歴</h3>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="history.length === 0" class="text-sm text-gray-500">
      履歴はありません
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="h in history"
        :key="h.id"
        class="text-sm"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1 min-w-0 flex-wrap">
            <span
              class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: stateColor(h.from_state_id) }"
            />
            <span>{{ stateLabel(h.from_state_id) }}</span>
            <span class="text-gray-400">&rarr;</span>
            <span
              class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: stateColor(h.to_state_id) }"
            />
            <span class="font-medium">{{ stateLabel(h.to_state_id) }}</span>
          </div>
          <div class="text-xs text-gray-400 flex-shrink-0 ml-auto">
            {{ new Date(h.created_at).toLocaleString('ja-JP') }}
          </div>
        </div>
        <p v-if="h.comment" class="text-xs text-gray-500 ml-6 mt-1">
          {{ h.comment }}
        </p>
      </li>
    </ul>
  </div>
</template>
