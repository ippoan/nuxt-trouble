import { getTickets, getWorkflowStates, deleteTicket, exportTicketsCsv } from '~/utils/api'
import { TICKET_CATEGORIES } from '~/types'
import type { TroubleTicketFilter, TroubleTicket, TroubleWorkflowState } from '~/types'

export function useTicketList() {
  const router = useRouter()

  const filter = reactive<TroubleTicketFilter & { page: number; per_page: number }>({
    category: undefined,
    person_name: undefined,
    company_name: undefined,
    office_name: undefined,
    date_from: undefined,
    date_to: undefined,
    q: undefined,
    page: 1,
    per_page: 20,
  })

  const tickets = shallowRef<TroubleTicket[]>([])
  const total = ref(0)
  const workflowStates = shallowRef<TroubleWorkflowState[]>([])
  const loading = ref(false)
  const deleteTarget = shallowRef<TroubleTicket | null>(null)
  const showDeleteModal = ref(false)

  const stateMap = computed(() => {
    const map: Record<string, TroubleWorkflowState> = {}
    for (const s of workflowStates.value) {
      map[s.id] = s
    }
    return map
  })

  const totalPages = computed(() => Math.ceil(total.value / (filter.per_page || 20)))

  const categoryOptions = [
    { label: '全て', value: '' },
    ...TICKET_CATEGORIES.map(c => ({ label: c, value: c })),
  ]

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
    } catch {
      // workflow not set up yet
    }
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
    try {
      await exportTicketsCsv(filter)
    } catch (e) {
      console.error('CSV export failed:', e)
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return dateStr.substring(0, 10)
  }

  function navigateToTicket(ticketId: string) {
    router.push(`/tickets/${ticketId}`)
  }

  return {
    filter, tickets, total, workflowStates, loading,
    deleteTarget, showDeleteModal, stateMap, totalPages,
    categoryOptions, fetchTickets, fetchWorkflowStates,
    clearFilter, confirmDelete, handleDelete, handleExportCsv,
    formatDate, navigateToTicket,
  }
}
