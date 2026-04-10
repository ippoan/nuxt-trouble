<script setup lang="ts">
import { getTickets, getWorkflowStates, deleteTicket, exportTicketsCsv, createTicket, setupDefaultWorkflow } from '~/utils/api'
import { TICKET_CATEGORIES } from '~/types'
import type { TroubleTicketFilter, TroubleTicket, TroubleWorkflowState, CreateTroubleTicket } from '~/types'

const STORAGE_KEY = 'trouble_filter_status'

const router = useRouter()

// Filter state
const filter = reactive({
  category: undefined as string | undefined,
  person_name: undefined as string | undefined,
  company_name: undefined as string | undefined,
  office_name: undefined as string | undefined,
  date_from: undefined as string | undefined,
  date_to: undefined as string | undefined,
  q: undefined as string | undefined,
  page: 1,
  per_page: 20,
})

// Status filter (checkbox, localStorage)
const selectedStatuses = ref<Set<string>>(new Set())

function loadStatusFilter() {
  if (typeof window === 'undefined') return
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const ids = JSON.parse(saved) as string[]
      selectedStatuses.value = new Set(ids)
    }
  } catch { /* ignore */ }
}

function saveStatusFilter() {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedStatuses.value]))
}

function toggleStatus(id: string) {
  const s = new Set(selectedStatuses.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedStatuses.value = s
  saveStatusFilter()
  filter.page = 1
  fetchTickets()
}

function toggleAllStatuses() {
  if (selectedStatuses.value.size === workflowStates.value.length) {
    selectedStatuses.value = new Set()
  } else {
    selectedStatuses.value = new Set(workflowStates.value.map(s => s.id))
  }
  saveStatusFilter()
  filter.page = 1
  fetchTickets()
}

// Data
const tickets = shallowRef<TroubleTicket[]>([])
const total = ref(0)
const workflowStates = shallowRef<TroubleWorkflowState[]>([])
const loading = ref(false)
const deleteTarget = shallowRef<TroubleTicket | null>(null)
const showDeleteModal = ref(false)

const stateMap = computed(() => {
  const map: Record<string, TroubleWorkflowState> = {}
  for (const s of workflowStates.value) map[s.id] = s
  return map
})

const totalPages = computed(() => Math.ceil(total.value / (filter.per_page || 20)))

const categoryOptions = [
  { label: '全て', value: '' },
  ...TICKET_CATEGORIES.map(c => ({ label: c, value: c })),
]

const createCategoryOptions = TICKET_CATEGORIES.map(c => ({ label: c, value: c as string }))

// Filtered tickets (client-side status filter)
const filteredTickets = computed(() => {
  if (selectedStatuses.value.size === 0) return tickets.value
  return tickets.value.filter(t =>
    t.status_id ? selectedStatuses.value.has(t.status_id) : false,
  )
})

// Inline create
const showInlineCreate = ref(false)
const creating = ref(false)
const newTicket = reactive({
  category: '' as string,
  person_name: '',
  company_name: '',
  office_name: '',
  occurred_date: '',
  description: '',
})

function resetNewTicket() {
  newTicket.category = ''
  newTicket.person_name = ''
  newTicket.company_name = ''
  newTicket.office_name = ''
  newTicket.occurred_date = ''
  newTicket.description = ''
}

async function handleInlineCreate() {
  if (!newTicket.category) return
  creating.value = true
  try {
    const states = await getWorkflowStates()
    if (states.length === 0) await setupDefaultWorkflow()
    const payload: Record<string, unknown> = { category: newTicket.category }
    if (newTicket.person_name) payload.person_name = newTicket.person_name
    if (newTicket.company_name) payload.company_name = newTicket.company_name
    if (newTicket.office_name) payload.office_name = newTicket.office_name
    if (newTicket.occurred_date) payload.occurred_date = newTicket.occurred_date
    if (newTicket.description) payload.description = newTicket.description
    await createTicket(payload as unknown as CreateTroubleTicket)
    resetNewTicket()
    showInlineCreate.value = false
    await fetchTickets()
  } catch (e) {
    console.error('Failed to create:', e)
  } finally {
    creating.value = false
  }
}

async function fetchTickets() {
  loading.value = true
  try {
    const res = await getTickets(filter)
    tickets.value = res.tickets
    total.value = res.total
  } catch (e) {
    console.error('Failed to fetch tickets:', e)
  } finally {
    loading.value = false
  }
}

async function fetchWorkflowStates() {
  try {
    workflowStates.value = await getWorkflowStates()
  } catch { /* workflow not set up yet */ }
}

function clearFilter() {
  filter.category = undefined
  filter.person_name = undefined
  filter.company_name = undefined
  filter.office_name = undefined
  filter.date_from = undefined
  filter.date_to = undefined
  filter.q = undefined
  filter.page = 1
  selectedStatuses.value = new Set()
  saveStatusFilter()
}

function confirmDelete(ticket: TroubleTicket) {
  deleteTarget.value = ticket
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteTicket(deleteTarget.value.id)
    showDeleteModal.value = false
    deleteTarget.value = null
    await fetchTickets()
  } catch (e) {
    console.error('Failed to delete:', e)
  }
}

async function handleExportCsv() {
  try { await exportTicketsCsv(filter) } catch (e) { console.error('CSV export failed:', e) }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

onMounted(() => {
  loadStatusFilter()
  fetchTickets()
  fetchWorkflowStates()
})

watch(() => ({ ...filter }), () => { fetchTickets() }, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">チケット一覧</h2>
      <div class="flex gap-2">
        <UButton label="CSV出力" icon="i-lucide-download" variant="outline" size="sm" @click="handleExportCsv" />
        <UButton label="新規作成" icon="i-lucide-plus" size="sm" @click="showInlineCreate = !showInlineCreate" />
      </div>
    </div>

    <!-- Filters: single row -->
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="filter.category" :items="categoryOptions" placeholder="カテゴリ" size="sm" class="w-32" />
      <UInput v-model="filter.q" placeholder="検索" size="sm" class="w-28" />
      <UInput v-model="filter.person_name" placeholder="氏名" size="sm" class="w-24" />
      <UInput v-model="filter.company_name" placeholder="会社名" size="sm" class="w-28" />
      <UInput v-model="filter.office_name" placeholder="営業所" size="sm" class="w-24" />
      <UInput v-model="filter.date_from" type="date" size="sm" class="w-36" />
      <span class="text-gray-400 text-xs">〜</span>
      <UInput v-model="filter.date_to" type="date" size="sm" class="w-36" />
      <UButton label="クリア" variant="ghost" size="xs" @click="clearFilter" />
    </div>

    <!-- Status filter: checkboxes -->
    <div v-if="workflowStates.length > 0" class="flex items-center gap-3 text-xs">
      <span class="text-gray-500 font-medium">ステータス:</span>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          :checked="selectedStatuses.size === workflowStates.length"
          :indeterminate="selectedStatuses.size > 0 && selectedStatuses.size < workflowStates.length"
          class="rounded"
          @change="toggleAllStatuses"
        />
        <span class="text-gray-400">全て</span>
      </label>
      <label
        v-for="state in workflowStates"
        :key="state.id"
        class="flex items-center gap-1 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="selectedStatuses.has(state.id)"
          class="rounded"
          @change="toggleStatus(state.id)"
        />
        <span
          class="px-1.5 py-0.5 rounded text-[11px]"
          :style="{ backgroundColor: state.color + '20', color: state.color }"
        >
          {{ state.label }}
        </span>
      </label>
    </div>

    <!-- Inline create -->
    <div v-if="showInlineCreate" class="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
      <USelect v-model="newTicket.category" :items="createCategoryOptions" placeholder="カテゴリ" size="sm" class="w-32" />
      <UInput v-model="newTicket.person_name" placeholder="氏名" size="sm" class="w-24" />
      <UInput v-model="newTicket.company_name" placeholder="会社名" size="sm" class="w-28" />
      <UInput v-model="newTicket.office_name" placeholder="営業所" size="sm" class="w-24" />
      <UInput v-model="newTicket.occurred_date" type="date" size="sm" class="w-36" />
      <UInput v-model="newTicket.description" placeholder="説明" size="sm" class="flex-1 min-w-[120px]" />
      <UButton label="作成" size="sm" :loading="creating" :disabled="!newTicket.category" @click="handleInlineCreate" />
      <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="showInlineCreate = false; resetNewTicket()" />
    </div>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-2 px-2 font-medium">No</th>
            <th class="text-left py-2 px-2 font-medium">カテゴリ</th>
            <th class="text-left py-2 px-2 font-medium">氏名</th>
            <th class="text-left py-2 px-2 font-medium">会社名</th>
            <th class="text-left py-2 px-2 font-medium">発生日</th>
            <th class="text-left py-2 px-2 font-medium">ステータス</th>
            <th class="text-left py-2 px-2 font-medium">作成日</th>
            <th class="text-right py-2 px-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
            @click="router.push(`/tickets/${ticket.id}`)"
          >
            <td class="py-2 px-2 text-gray-500">{{ ticket.ticket_no }}</td>
            <td class="py-2 px-2"><TicketCategoryBadge :category="ticket.category" /></td>
            <td class="py-2 px-2">{{ ticket.person_name || '-' }}</td>
            <td class="py-2 px-2">{{ ticket.company_name || '-' }}</td>
            <td class="py-2 px-2">{{ formatDate(ticket.occurred_date) }}</td>
            <td class="py-2 px-2">
              <UBadge
                v-if="ticket.status_id && stateMap[ticket.status_id]"
                :style="{ backgroundColor: stateMap[ticket.status_id]!.color + '20', color: stateMap[ticket.status_id]!.color }"
                variant="subtle"
              >
                {{ stateMap[ticket.status_id]!.label }}
              </UBadge>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="py-2 px-2">{{ formatDate(ticket.created_at) }}</td>
            <td class="py-2 px-2 text-right">
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="confirmDelete(ticket)" />
            </td>
          </tr>
          <tr v-if="filteredTickets.length === 0 && !loading">
            <td colspan="8" class="py-8 text-center text-gray-400">チケットがありません</td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <UPagination v-model="filter.page" :total="total" :items-per-page="filter.per_page || 20" />
      </div>
    </UCard>

    <!-- Delete modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ deleteTarget?.ticket_no }} 「{{ deleteTarget?.category }}」を削除します。
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
