<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState } from '~/types'
import { updateTicket } from '~/utils/api'
import { toHalfWidth } from '~/utils/normalize'
import { formatOccurredAt } from '~/utils/datetime'
import { formatExpiry, getExpiryStatus } from '~/utils/carInspection'

const props = defineProps<{
  ticket: TroubleTicket
  workflowStates: TroubleWorkflowState[]
}>()

const emit = defineEmits<{
  (e: 'updated', ticket: TroubleTicket): void
}>()

const expanded = ref(false)

const {
  load: loadCarInspections,
  lookupByRegistration: lookupCarInspection,
  registrationOptions: carInspectionRegistrations,
} = useCarInspections()

onMounted(() => {
  loadCarInspections()
})

const carInspectionMatch = computed(() =>
  lookupCarInspection(props.ticket.registration_number),
)

const savingRegistration = ref(false)

async function saveRegistration(event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.trim()
  if (!value) return
  if (savingRegistration.value) return
  savingRegistration.value = true
  try {
    const updated = await updateTicket(props.ticket.id, { registration_number: value })
    emit('updated', updated)
  } catch (e) {
    console.error('登録番号の保存に失敗:', e)
    target.value = ''
  } finally {
    savingRegistration.value = false
  }
}

const expiryStatus = computed(() =>
  getExpiryStatus(carInspectionMatch.value?.validPeriodExpirdate),
)

const expiryBadgeClass = computed(() => {
  switch (expiryStatus.value) {
    case 'expired':
      return 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800'
    case 'soon':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-800'
    case 'ok':
      return 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
    default:
      return 'bg-gray-100 text-gray-500 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  }
})

const expiryStatusLabel = computed(() => {
  switch (expiryStatus.value) {
    case 'expired': return '期限切れ'
    case 'soon': return '残り30日以内'
    case 'ok': return '有効'
    default: return ''
  }
})

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
  { label: '発生日時', key: 'occurred_at' },
  { label: '会社名', key: 'company_name' },
  { label: '営業所名', key: 'office_name' },
  { label: '部署名', key: 'department' },
  { label: '氏名', key: 'person_name' },
  { label: '登録番号', key: 'registration_number' },
  { label: '場所', key: 'location' },
  { label: '損害額', key: 'damage_amount' },
  { label: '補償額', key: 'compensation_amount' },
  { label: 'ロードサービス費', key: 'road_service_cost' },
  { label: '相手方', key: 'counterparty' },
  { label: '相手方保険', key: 'counterparty_insurance' },
  { label: '対応期限', key: 'due_date' },
]

function displayValue(key: string): string {
  if (key === 'occurred_at') {
    return formatOccurredAt(props.ticket.occurred_at, props.ticket.occurred_date)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (props.ticket as any)[key]
  if (val == null || val === '') return '-'
  if (key === 'due_date') return String(val).substring(0, 10)
  return String(val)
}
</script>

<template>
  <div class="space-y-1">
    <!-- Line 1: person_name + occurred_at -->
    <div class="flex items-center gap-2 text-sm">
      <span v-if="ticket.person_name" class="font-medium">{{ ticket.person_name }}</span>
      <span v-if="ticket.occurred_at || ticket.occurred_date" class="text-gray-500">
        {{ formatOccurredAt(ticket.occurred_at, ticket.occurred_date) }}
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

    <!-- 車検証情報 (登録番号がマスタに一致) -->
    <div
      v-if="ticket.registration_number"
      class="mt-2 rounded-md border p-2 text-xs"
      :class="carInspectionMatch
        ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40'
        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900'"
      data-testid="car-inspection-section"
    >
      <template v-if="carInspectionMatch">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="font-semibold text-blue-700 dark:text-blue-300">
            登録番号 {{ carInspectionMatch.registrationNumber }}
          </div>
          <!-- 車検満了日 prominent badge, inline next to registration number -->
          <div class="flex items-center gap-1.5">
            <span class="text-gray-500">車検満了日:</span>
            <span
              class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-semibold"
              :class="expiryBadgeClass"
              data-testid="car-expiry-badge"
            >
              {{ formatExpiry(carInspectionMatch.validPeriodExpirdate) }}
              <span v-if="expiryStatusLabel" class="text-[10px] font-normal opacity-80">
                ({{ expiryStatusLabel }})
              </span>
            </span>
          </div>
        </div>
        <div class="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600 dark:text-gray-400">
          <span><span class="text-gray-500">所有者: </span>{{ carInspectionMatch.ownerName || '-' }}</span>
          <span><span class="text-gray-500">車種: </span>{{ carInspectionMatch.carName || '-' }}</span>
          <span><span class="text-gray-500">型式: </span>{{ carInspectionMatch.model || '-' }}</span>
        </div>
      </template>
      <template v-else>
        <span data-testid="car-inspection-missing">
          登録番号 {{ ticket.registration_number }} — 車検証未登録
        </span>
      </template>
    </div>
    <!-- 登録番号未入力: インライン入力 -->
    <div
      v-else
      class="mt-2 flex items-center gap-2 text-xs"
    >
      <span class="text-gray-500">登録番号:</span>
      <input
        type="text"
        list="overview-car-inspection-registrations"
        placeholder="登録番号を入力"
        class="flex-1 max-w-xs rounded border border-dashed border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1 focus:border-solid focus:border-blue-500 focus:outline-none"
        :disabled="savingRegistration"
        @input="(e: Event) => { const el = e.target as HTMLInputElement; const v = toHalfWidth(el.value); if (el.value !== v) el.value = v }"
        @keydown.enter.prevent="saveRegistration($event)"
        @change="saveRegistration($event)"
      >
      <datalist id="overview-car-inspection-registrations">
        <option
          v-for="reg in carInspectionRegistrations"
          :key="reg"
          :value="reg"
        />
      </datalist>
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
