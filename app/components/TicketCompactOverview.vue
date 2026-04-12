<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState } from '~/types'

const props = defineProps<{
  ticket: TroubleTicket
  workflowStates: TroubleWorkflowState[]
}>()

const expanded = ref(false)

const locationLine = computed(() => {
  const parts = [props.ticket.company_name, props.ticket.office_name].filter(Boolean)
  const loc = props.ticket.location
  if (parts.length === 0 && !loc) return null
  let line = parts.join(' / ')
  if (loc) line = line ? `${line} | ${loc}` : loc
  return line
})

const moneyLine = computed(() => {
  const items: string[] = []
  if (props.ticket.damage_amount != null) {
    items.push(`損害額: ${Number(props.ticket.damage_amount).toLocaleString()}円`)
  }
  if (props.ticket.compensation_amount != null) {
    items.push(`補償額: ${Number(props.ticket.compensation_amount).toLocaleString()}円`)
  }
  if (props.ticket.road_service_cost != null) {
    items.push(`ロードサービス: ${Number(props.ticket.road_service_cost).toLocaleString()}円`)
  }
  return items.length > 0 ? items.join(' / ') : null
})

const counterpartyLine = computed(() => {
  if (!props.ticket.counterparty) return null
  let line = props.ticket.counterparty
  if (props.ticket.counterparty_insurance) {
    line += ` (${props.ticket.counterparty_insurance})`
  }
  return line
})

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
  { label: '対応期限', key: 'due_date' },
]

function displayValue(key: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (props.ticket as any)[key]
  if (val == null || val === '') return '-'
  if (key === 'due_date' || key === 'occurred_date') return String(val).substring(0, 10)
  return String(val)
}
</script>

<template>
  <div class="space-y-1">
    <!-- Line 1: person_name + occurred_date -->
    <div class="flex items-center gap-2 text-sm">
      <span v-if="ticket.person_name" class="font-medium">{{ ticket.person_name }}</span>
      <span v-if="ticket.occurred_date" class="text-gray-500">
        {{ ticket.occurred_date.substring(0, 10) }}
      </span>
    </div>

    <!-- Line 2: company / office | location -->
    <div v-if="locationLine" class="text-sm text-gray-600 dark:text-gray-400">
      {{ locationLine }}
    </div>

    <!-- Line 3: money amounts -->
    <div v-if="moneyLine" class="text-sm text-gray-600 dark:text-gray-400">
      {{ moneyLine }}
    </div>

    <!-- Line 4: counterparty -->
    <div v-if="counterpartyLine" class="text-sm text-gray-600 dark:text-gray-400">
      {{ counterpartyLine }}
    </div>

    <!-- Toggle -->
    <button
      class="text-xs text-primary-500 hover:text-primary-600 mt-2 flex items-center gap-1"
      @click="expanded = !expanded"
    >
      {{ expanded ? '閉じる' : '詳細を表示' }}
      <UIcon :name="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3" />
    </button>

    <!-- Expanded full grid -->
    <dl v-if="expanded" class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <div v-for="field in fields" :key="field.key" class="space-y-1">
        <dt class="text-xs text-gray-500 dark:text-gray-400">{{ field.label }}</dt>
        <dd class="text-sm">{{ displayValue(field.key) }}</dd>
      </div>
      <div class="space-y-1">
        <dt class="text-xs text-gray-500 dark:text-gray-400">作成日</dt>
        <dd class="text-sm">{{ ticket.created_at.substring(0, 10) }}</dd>
      </div>
    </dl>
  </div>
</template>
