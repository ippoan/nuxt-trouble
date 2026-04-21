<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState } from '~/types'
import { getTickets, getWorkflowStates } from '~/utils/api'

const router = useRouter()
const tickets = ref<TroubleTicket[]>([])
const workflowStates = ref<TroubleWorkflowState[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const [ticketsRes, statesRes] = await Promise.all([
      getTickets({ per_page: 1000 }),
      getWorkflowStates().catch(() => [] as TroubleWorkflowState[]),
    ])
    tickets.value = ticketsRes.tickets
    workflowStates.value = statesRes
  } catch (e) {
    console.error('Failed to load situations:', e)
  } finally {
    loading.value = false
  }
}

const ticketsByState = computed(() => {
  const map: Record<string, TroubleTicket[]> = {}
  for (const state of workflowStates.value) {
    map[state.id] = []
  }
  for (const t of tickets.value) {
    if (t.status_id && map[t.status_id]) {
      map[t.status_id].push(t)
    }
  }
  return map
})

const unassignedTickets = computed(() =>
  tickets.value.filter(t => !t.status_id || !workflowStates.value.some(s => s.id === t.status_id)),
)

function navigateToTicket(id: string) {
  router.push(`/tickets/${id}`)
}

function ticketTitle(t: TroubleTicket): string {
  const txt = t.title || t.description || t.category || ''
  return txt.length > 40 ? txt.substring(0, 40) + '...' : txt
}

onMounted(() => { load() })
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">状況一覧</h2>
      <UButton label="再読み込み" icon="i-lucide-refresh-cw" variant="outline" size="sm" :loading="loading" @click="load" />
    </div>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
    </div>

    <div v-else-if="workflowStates.length === 0" class="text-center text-gray-400 py-8">
      ワークフローが未設定です。<NuxtLink to="/settings" class="text-blue-500 underline">設定</NuxtLink>から作成してください。
    </div>

    <div v-else class="flex gap-4 overflow-x-auto pb-4">
      <div
        v-for="state in workflowStates"
        :key="state.id"
        class="min-w-[280px] w-[280px] flex-shrink-0"
      >
        <div
          class="rounded-t-lg px-3 py-2 font-medium text-sm"
          :style="{ backgroundColor: state.color + '20', color: state.color }"
        >
          {{ state.label }}
          <span class="ml-1 text-xs opacity-70">({{ ticketsByState[state.id]?.length ?? 0 }})</span>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900 rounded-b-lg p-2 space-y-2 min-h-[200px]">
          <UCard
            v-for="ticket in ticketsByState[state.id]"
            :key="ticket.id"
            class="cursor-pointer hover:shadow-md transition-shadow"
            @click="navigateToTicket(ticket.id)"
          >
            <div class="space-y-1">
              <div class="text-xs text-gray-500">No.{{ ticket.ticket_no }}</div>
              <div class="text-sm font-medium">{{ ticketTitle(ticket) }}</div>
              <div v-if="ticket.assigned_to" class="text-xs text-gray-600 dark:text-gray-400">
                <UIcon name="i-lucide-user" class="inline size-3" /> {{ ticket.assigned_to }}
              </div>
              <div v-if="ticket.registration_number" class="text-xs text-gray-600 dark:text-gray-400">
                <UIcon name="i-lucide-car" class="inline size-3" /> {{ ticket.registration_number }}
              </div>
            </div>
          </UCard>
          <div v-if="(ticketsByState[state.id]?.length ?? 0) === 0" class="text-xs text-gray-400 text-center py-4">
            -
          </div>
        </div>
      </div>

      <div v-if="unassignedTickets.length > 0" class="min-w-[280px] w-[280px] flex-shrink-0">
        <div class="rounded-t-lg px-3 py-2 font-medium text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          未設定 <span class="ml-1 text-xs opacity-70">({{ unassignedTickets.length }})</span>
        </div>
        <div class="bg-gray-50 dark:bg-gray-900 rounded-b-lg p-2 space-y-2 min-h-[200px]">
          <UCard
            v-for="ticket in unassignedTickets"
            :key="ticket.id"
            class="cursor-pointer hover:shadow-md transition-shadow"
            @click="navigateToTicket(ticket.id)"
          >
            <div class="space-y-1">
              <div class="text-xs text-gray-500">No.{{ ticket.ticket_no }}</div>
              <div class="text-sm font-medium">{{ ticketTitle(ticket) }}</div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
