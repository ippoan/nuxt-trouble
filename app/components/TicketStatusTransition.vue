<script setup lang="ts">
import type { TroubleWorkflowState, TroubleWorkflowTransition, TroubleStatusHistory } from '~/types'
import { getWorkflowTransitions, transitionTicket, getStatusHistory } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  currentStatusId: string | null
  workflowStates: TroubleWorkflowState[]
}>()

const emit = defineEmits<{
  transitioned: []
}>()

const transitions = ref<TroubleWorkflowTransition[]>([])
const history = ref<TroubleStatusHistory[]>([])
const selectedStateId = ref('')
const comment = ref('')
const submitting = ref(false)
const showModal = ref(false)

const currentState = computed(() =>
  props.workflowStates.find(s => s.id === props.currentStatusId),
)

const allowedStates = computed(() => {
  if (!props.currentStatusId) return []
  const allowed = transitions.value
    .filter(t => t.from_state_id === props.currentStatusId)
    .map(t => t.to_state_id)
  return props.workflowStates
    .filter(s => allowed.includes(s.id))
    .map(s => ({ label: s.label, value: s.id }))
})

const canTransition = computed(() => allowedStates.value.length > 0)

function stateLabel(id: string | null): string {
  if (!id) return '(なし)'
  return props.workflowStates.find(s => s.id === id)?.label || '不明'
}

function stateColor(id: string | null): string {
  if (!id) return '#9CA3AF'
  return props.workflowStates.find(s => s.id === id)?.color || '#9CA3AF'
}

async function openModal() {
  if (!canTransition.value) return
  showModal.value = true
  selectedStateId.value = ''
  comment.value = ''
  try {
    history.value = await getStatusHistory(props.ticketId)
  } catch (e) {
    console.error('履歴取得エラー:', e)
  }
}

async function handleTransition() {
  if (!selectedStateId.value) return
  submitting.value = true
  try {
    await transitionTicket(props.ticketId, {
      to_state_id: selectedStateId.value,
      comment: comment.value || null,
    })
    showModal.value = false
    emit('transitioned')
  } catch (e) {
    console.error('遷移エラー:', e)
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    transitions.value = await getWorkflowTransitions()
  } catch (e) {
    console.error('遷移取得エラー:', e)
  }
})
</script>

<template>
  <UBadge
    v-if="currentState"
    :style="{ backgroundColor: currentState.color + '20', color: currentState.color, cursor: canTransition ? 'pointer' : 'default' }"
    variant="subtle"
    @click="openModal"
  >
    {{ currentState.label }}
    <UIcon v-if="canTransition" name="i-lucide-chevron-down" class="size-3 ml-0.5" />
  </UBadge>

  <UModal v-model:open="showModal">
    <template #content>
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold">ステータス変更</h3>

        <USelect
          v-model="selectedStateId"
          :items="allowedStates"
          placeholder="遷移先を選択"
        />

        <input
          v-model="comment"
          placeholder="コメント (任意)"
          class="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <!-- History -->
        <div v-if="history.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 class="text-sm font-semibold mb-3 text-gray-500">履歴</h4>
          <ul class="space-y-2">
            <li v-for="h in history" :key="h.id" class="text-sm">
              <div class="flex items-center gap-2">
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

        <div class="flex justify-end gap-2">
          <UButton label="キャンセル" variant="outline" @click="showModal = false" />
          <UButton
            label="変更"
            icon="i-lucide-arrow-right"
            :loading="submitting"
            :disabled="!selectedStateId"
            @click="handleTransition"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
