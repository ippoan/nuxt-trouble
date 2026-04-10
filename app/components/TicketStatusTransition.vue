<script setup lang="ts">
import type { TroubleWorkflowState, TroubleWorkflowTransition } from '~/types'
import { getWorkflowTransitions, transitionTicket } from '~/utils/api'

const props = defineProps<{
  ticketId: string
  currentStatusId: string | null
  workflowStates: TroubleWorkflowState[]
}>()

const emit = defineEmits<{
  transitioned: []
}>()

const transitions = ref<TroubleWorkflowTransition[]>([])
const selectedStateId = ref('')
const comment = ref('')
const submitting = ref(false)

const allowedStates = computed(() => {
  if (!props.currentStatusId) return []
  const allowed = transitions.value
    .filter(t => t.from_state_id === props.currentStatusId)
    .map(t => t.to_state_id)
  return props.workflowStates
    .filter(s => allowed.includes(s.id))
    .map(s => ({ label: s.label, value: s.id }))
})

async function fetchTransitions() {
  try {
    transitions.value = await getWorkflowTransitions()
  } catch (e) {
    console.error('遷移取得エラー:', e)
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
    selectedStateId.value = ''
    comment.value = ''
    emit('transitioned')
  } catch (e) {
    console.error('遷移エラー:', e)
  } finally {
    submitting.value = false
  }
}

onMounted(fetchTransitions)
</script>

<template>
  <div>
    <h3 class="text-base font-semibold mb-4">ステータス変更</h3>

    <div v-if="allowedStates.length === 0" class="text-sm text-gray-500">
      遷移可能なステータスがありません
    </div>

    <div v-else class="space-y-3">
      <UFormField label="遷移先">
        <USelect
          v-model="selectedStateId"
          :items="allowedStates"
          placeholder="ステータスを選択"
        />
      </UFormField>

      <UFormField label="コメント (任意)">
        <UTextarea v-model="comment" placeholder="遷移理由など" :rows="2" />
      </UFormField>

      <UButton
        label="ステータスを変更"
        icon="i-lucide-arrow-right"
        :loading="submitting"
        :disabled="!selectedStateId"
        @click="handleTransition"
      />
    </div>
  </div>
</template>
