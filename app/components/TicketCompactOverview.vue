<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState } from '~/types'

const props = defineProps<{
  ticket: TroubleTicket
  workflowStates: TroubleWorkflowState[]
}>()

const expanded = ref(false)

const statusLabel = computed(() => {
  if (!props.ticket.status_id) return undefined
  return props.workflowStates.find(s => s.id === props.ticket.status_id)
})

const hasAmounts = computed(() => {
  const t = props.ticket
  return t.damage_amount || t.compensation_amount || t.road_service_cost
})

const hasCounterparty = computed(() => {
  const t = props.ticket
  return t.counterparty || t.counterparty_insurance
})

function formatAmount(val: string | null | undefined): string {
  if (!val) return ''
  const n = Number(val)
  return isNaN(n) ? val : `¥${n.toLocaleString()}`
}

// fields list for expanded view (same as original)
const fields: Array<{ label: string; key: string }> = [
  { label: 'カテゴリ', key: 'category' },
  { label: 'タイトル', key: 'title' },
  { label: '説明', key: 'description' },
  { label: '発生日', key: 'occurred_date' },
  { label: '会社名', key: 'company_name' },
  { label: '営業所名', key: 'office_name' },
  { label: '部署名', key: 'department' },
  { label: '氏名', key: 'person_name' },
  { label: '車両番号', key: 'vehicle_number' },
  { label: '場所', key: 'location' },
  { label: '損害額', key: 'damage_amount' },
  { label: '補償額', key: 'compensation_amount' },
  { label: 'ロードサービス費', key: 'road_service_cost' },
  { label: '相手方', key: 'counterparty' },
  { label: '相手方保険', key: 'counterparty_insurance' },
]

function displayValue(key: string): string {
  const val = (props.ticket as Record<string, unknown>)[key]
  if (val == null || val === '') return '-'
  return String(val)
}
</script>

<template>
  <div class="space-y-1">
    <!-- Line 1: person, date -->
    <div class="flex items-center gap-2 text-sm">
      <span v-if="ticket.person_name" class="font-medium">{{ ticket.person_name }}</span>
      <span v-if="ticket.occurred_date" class="text-gray-400">{{ ticket.occurred_date }}</span>
    </div>

    <!-- Line 2: company / office / location -->
    <div v-if="ticket.company_name || ticket.office_name || ticket.location" class="text-sm text-gray-400">
      <span v-if="ticket.company_name">{{ ticket.company_name }}</span>
      <span v-if="ticket.office_name"> / {{ ticket.office_name }}</span>
      <span v-if="ticket.location" class="ml-2">| {{ ticket.location }}</span>
    </div>

    <!-- Line 3: amounts (conditional) -->
    <div v-if="hasAmounts" class="text-sm text-gray-400">
      <span v-if="ticket.damage_amount">損害額: {{ formatAmount(ticket.damage_amount) }}</span>
      <span v-if="ticket.compensation_amount" class="ml-3">補償額: {{ formatAmount(ticket.compensation_amount) }}</span>
      <span v-if="ticket.road_service_cost" class="ml-3">ロードサービス: {{ formatAmount(ticket.road_service_cost) }}</span>
    </div>

    <!-- Line 4: counterparty (conditional) -->
    <div v-if="hasCounterparty" class="text-sm text-gray-400">
      <span v-if="ticket.counterparty">相手: {{ ticket.counterparty }}</span>
      <span v-if="ticket.counterparty_insurance"> ({{ ticket.counterparty_insurance }})</span>
    </div>

    <!-- Expand toggle -->
    <button
      class="text-xs text-blue-500 hover:text-blue-400 mt-1"
      @click="expanded = !expanded"
    >
      {{ expanded ? '詳細を隠す ▲' : '詳細を表示 ▼' }}
    </button>

    <!-- Expanded: full grid -->
    <dl v-if="expanded" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-700">
      <div v-for="field in fields" :key="field.key" class="space-y-1">
        <dt class="text-xs text-gray-500 dark:text-gray-400">{{ field.label }}</dt>
        <dd class="text-sm">{{ displayValue(field.key) }}</dd>
      </div>
      <div class="space-y-1">
        <dt class="text-xs text-gray-500 dark:text-gray-400">対応期限</dt>
        <dd class="text-sm">{{ ticket.due_date ? ticket.due_date.substring(0, 10) : '-' }}</dd>
      </div>
      <div class="space-y-1">
        <dt class="text-xs text-gray-500 dark:text-gray-400">作成日</dt>
        <dd class="text-sm">{{ ticket.created_at.substring(0, 10) }}</dd>
      </div>
    </dl>
  </div>
</template>
