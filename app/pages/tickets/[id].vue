<script setup lang="ts">
import { getTicket, updateTicket, deleteTicket, getWorkflowStates } from '~/utils/api'
import type { TroubleTicket, TroubleWorkflowState } from '~/types'

const route = useRoute()
const router = useRouter()
const ticketId = route.params.id as string

const ticket = ref<TroubleTicket | null>(null)
const workflowStates = ref<TroubleWorkflowState[]>([])
const editing = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const showDeleteModal = ref(false)
const form = ref<Record<string, unknown>>({})

const statusLabel = computed(() => {
  const sid = ticket.value?.status_id
  if (!sid) return undefined
  return workflowStates.value.find(s => s.id === sid)
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
]

function displayValue(key: string): string {
  if (!ticket.value) return '-'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = (ticket.value as any)[key]
  if (val == null || val === '') return '-'
  return String(val)
}

function startEdit() {
  if (!ticket.value) return
  form.value = {
    category: ticket.value.category,
    title: ticket.value.title,
    description: ticket.value.description,
    occurred_date: ticket.value.occurred_date || '',
    company_name: ticket.value.company_name,
    office_name: ticket.value.office_name,
    department: ticket.value.department,
    person_name: ticket.value.person_name,
    vehicle_number: ticket.value.vehicle_number,
    location: ticket.value.location,
    damage_amount: ticket.value.damage_amount ? Number(ticket.value.damage_amount) : null,
    compensation_amount: ticket.value.compensation_amount ? Number(ticket.value.compensation_amount) : null,
    road_service_cost: ticket.value.road_service_cost ? Number(ticket.value.road_service_cost) : null,
    counterparty: ticket.value.counterparty,
    counterparty_insurance: ticket.value.counterparty_insurance,
    due_date: ticket.value.due_date ? ticket.value.due_date.substring(0, 10) : '',
  }
  editing.value = true
}

async function handleSave() {
  saving.value = true
  error.value = null
  try {
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(form.value)) {
      if (value != null && value !== '') {
        data[key] = value
      }
    }
    ticket.value = await updateTicket(ticketId, data as import('~/types').UpdateTroubleTicket)
    editing.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : '更新に失敗しました'
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await deleteTicket(ticketId)
    router.push('/tickets')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '削除に失敗しました'
  }
}

onMounted(async () => {
  try {
    const [t, states] = await Promise.all([
      getTicket(ticketId),
      getWorkflowStates().catch(() => [] as TroubleWorkflowState[]),
    ])
    ticket.value = t
    workflowStates.value = states
  } catch {
    error.value = 'チケットの取得に失敗しました'
  }
})
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <!-- Loading -->
    <div v-if="!ticket && !error" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>

    <!-- Error -->
    <div v-else-if="error && !ticket" class="text-center py-12 space-y-4">
      <p class="text-red-600">{{ error }}</p>
      <UButton label="一覧に戻る" to="/tickets" variant="outline" />
    </div>

    <!-- Content -->
    <template v-else-if="ticket">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton icon="i-lucide-arrow-left" variant="ghost" to="/tickets" />
          <h2 class="text-xl font-bold">No.{{ ticket.ticket_no }}</h2>
          <TicketCategoryBadge :category="ticket.category" />
          <UBadge
            v-if="statusLabel"
            :style="{ backgroundColor: statusLabel.color + '20', color: statusLabel.color }"
            variant="subtle"
          >
            {{ statusLabel.label }}
          </UBadge>
        </div>
        <div class="flex gap-2">
          <template v-if="!editing">
            <UButton label="編集" icon="i-lucide-pencil" variant="outline" @click="startEdit" />
            <UButton label="削除" icon="i-lucide-trash-2" variant="outline" color="error" @click="showDeleteModal = true" />
          </template>
        </div>
      </div>

      <!-- Error banner -->
      <div v-if="error" class="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>

      <!-- Edit mode -->
      <UCard v-if="editing">
        <TicketFormFields v-model="form" mode="edit" />
        <div class="flex justify-end gap-2 mt-6">
          <UButton label="キャンセル" variant="outline" @click="editing = false" />
          <UButton label="保存" :loading="saving" @click="handleSave" />
        </div>
      </UCard>

      <!-- View mode -->
      <UCard v-else>
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </UCard>
    </template>

    <!-- Delete modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ ticket?.ticket_no }} 「{{ ticket?.category }}」を削除します。
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="キャンセル" variant="outline" @click="showDeleteModal = false" />
            <UButton label="削除" color="error" @click="handleDelete" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
