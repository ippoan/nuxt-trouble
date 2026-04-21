<script setup lang="ts">
import type { TroubleTicket, TroubleProgressStatus, TroubleWorkflowState } from '~/types'
import { getTickets, getProgressStatuses, getWorkflowStates } from '~/utils/api'
import { formatOccurredAt } from '~/utils/datetime'

const router = useRouter()
const tickets = ref<TroubleTicket[]>([])
const progressStatuses = ref<TroubleProgressStatus[]>([])
const workflowStates = ref<TroubleWorkflowState[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [ticketsRes, progs, states] = await Promise.all([
      getTickets({ per_page: 1000 }),
      getProgressStatuses().catch(() => [] as TroubleProgressStatus[]),
      getWorkflowStates().catch(() => [] as TroubleWorkflowState[]),
    ])
    tickets.value = ticketsRes.tickets
    progressStatuses.value = progs
    workflowStates.value = states
  } catch (e) {
    console.error('Failed to load waiting tickets:', e)
  } finally {
    loading.value = false
  }
}

const waitingStatus = computed(() =>
  progressStatuses.value.find(s => s.name === '待機') ?? null,
)

const waitingTickets = computed<TroubleTicket[]>(() => {
  if (!waitingStatus.value) return []
  const target = waitingStatus.value.name
  const out: unknown[] = []
  for (const t of tickets.value) {
    if (t.progress_notes === target) out.push(t)
  }
  return out as TroubleTicket[]
})

const stateMap = computed(() => {
  const map: Record<string, TroubleWorkflowState> = {}
  for (const s of workflowStates.value) map[s.id] = s
  return map
})

function navigateToTicket(id: string) {
  router.push(`/tickets/${id}`)
}

onMounted(() => { load() })
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">待機一覧</h2>
      <UButton label="再読み込み" icon="i-lucide-refresh-cw" variant="outline" size="sm" :loading="loading" @click="load" />
    </div>

    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <div v-else-if="!waitingStatus" class="py-8 text-center text-gray-500 space-y-2">
        <p>進捗状況に「待機」が登録されていません。</p>
        <p class="text-sm">
          <NuxtLink to="/settings" class="text-blue-500 underline">設定</NuxtLink>
          から「待機」を進捗状況として登録してください。
        </p>
      </div>

      <div v-else-if="waitingTickets.length === 0" class="py-8 text-center text-gray-400">
        待機中のチケットはありません。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="text-sm w-full whitespace-nowrap">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-2 font-medium">No</th>
              <th class="text-left py-2 px-2 font-medium">発生日時</th>
              <th class="text-left py-2 px-2 font-medium">所属会社名</th>
              <th class="text-left py-2 px-2 font-medium">営業所名</th>
              <th class="text-left py-2 px-2 font-medium">当事者名</th>
              <th class="text-left py-2 px-2 font-medium">登録番号</th>
              <th class="text-left py-2 px-2 font-medium">事故等分類</th>
              <th class="text-left py-2 px-2 font-medium">内容</th>
              <th class="text-left py-2 px-2 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ticket in waitingTickets"
              :key="ticket.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
              @click="navigateToTicket(ticket.id)"
            >
              <td class="py-2 px-2 text-gray-500">{{ ticket.ticket_no }}</td>
              <td class="py-2 px-2">{{ formatOccurredAt(ticket.occurred_at, ticket.occurred_date) }}</td>
              <td class="py-2 px-2">{{ ticket.company_name || '-' }}</td>
              <td class="py-2 px-2">{{ ticket.office_name || '-' }}</td>
              <td class="py-2 px-2">{{ ticket.person_name || '-' }}</td>
              <td class="py-2 px-2">{{ ticket.registration_number || '-' }}</td>
              <td class="py-2 px-2"><TicketCategoryBadge :category="ticket.category" /></td>
              <td class="py-2 px-2 max-w-[300px] truncate">{{ ticket.description || '-' }}</td>
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
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
