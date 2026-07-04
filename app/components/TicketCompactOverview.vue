<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState, TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee, UpdateTroubleTicket } from '~/types'
import { updateTicket } from '~/utils/api'
import { toHalfWidth } from '~/utils/normalize'
import { formatOccurredAt, toDatetimeLocalInput, fromDatetimeLocalInput } from '~/utils/datetime'
import { formatExpiry, getExpiryStatus } from '~/utils/carInspection'

const props = defineProps<{
  ticket: TroubleTicket
  workflowStates: TroubleWorkflowState[]
  categories?: TroubleCategory[]
  offices?: TroubleOffice[]
  progressStatuses?: TroubleProgressStatus[]
  employees?: Employee[]
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

// --- Expanded: inline auto-save form (元の編集画面と同じ TicketFormFields を
// 展開表示に使い、フィールド確定 (blur / select 選択 / 日付確定) のたびに
// そのフィールドだけ即保存する) ---
const form = ref<Record<string, unknown>>({})
const savingField = ref(false)
const fieldError = ref<string | null>(null)

function buildFormFromTicket(t: TroubleTicket): Record<string, unknown> {
  return {
    category: t.category,
    title: t.title,
    description: t.description,
    occurred_at: toDatetimeLocalInput(t.occurred_at, t.occurred_date),
    company_name: t.company_name,
    office_name: t.office_name,
    department: t.department,
    person_name: t.person_name,
    person_id: t.person_id,
    person_is_external: t.person_is_external,
    registration_number: t.registration_number,
    location: t.location,
    progress_notes: t.progress_notes,
    allowance: t.allowance,
    damage_amount: t.damage_amount != null ? Number(t.damage_amount) : null,
    compensation_amount: t.compensation_amount != null ? Number(t.compensation_amount) : null,
    road_service_cost: t.road_service_cost != null ? Number(t.road_service_cost) : null,
    counterparty: t.counterparty,
    counterparty_insurance: t.counterparty_insurance,
    disciplinary_content: t.disciplinary_content,
    disciplinary_action: t.disciplinary_action,
    due_date: t.due_date,
  }
}

watch(
  () => props.ticket,
  (t) => { form.value = buildFormFromTicket(t) },
  { immediate: true },
)

async function handleFieldCommitted(keys: string[]) {
  if (savingField.value) return
  const payload: Record<string, unknown> = {}
  for (const key of keys) {
    if (key === 'occurred_at') {
      const occurred = fromDatetimeLocalInput(form.value.occurred_at as string | undefined)
      if (occurred) Object.assign(payload, occurred)
      continue
    }
    payload[key] = form.value[key]
  }
  if (Object.keys(payload).length === 0) return
  savingField.value = true
  fieldError.value = null
  try {
    const updated = await updateTicket(props.ticket.id, payload as UpdateTroubleTicket)
    emit('updated', updated)
  } catch (e) {
    fieldError.value = e instanceof Error ? e.message : '保存に失敗しました'
  } finally {
    savingField.value = false
  }
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

    <!-- Expanded: 元の編集画面と同じフォームをそのまま表示し、その場で編集・自動保存する -->
    <div v-if="expanded" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <TicketFormFields
        v-model="form"
        mode="edit"
        :categories="categories"
        :offices="offices"
        :progress-statuses="progressStatuses"
        :employees="employees"
        @field-committed="handleFieldCommitted"
      />
      <p v-if="fieldError" class="text-xs text-red-600 mt-2">{{ fieldError }}</p>
      <p class="text-xs text-gray-400 mt-3">作成日: {{ ticket.created_at.substring(0, 10) }}</p>
    </div>
  </div>
</template>
