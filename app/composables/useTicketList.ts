import { getTickets, getWorkflowStates, deleteTicket, exportTicketsCsv, createTicket, setupDefaultWorkflow, getCategories, getOffices } from '~/utils/api'
import { TICKET_CATEGORIES } from '~/types'
import type { TroubleTicket, TroubleWorkflowState, TroubleCategory, TroubleOffice, CreateTroubleTicket } from '~/types'

const STORAGE_KEY = 'trouble_filter_status'

export function useTicketList() {
  const router = useRouter()

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
    /* v8 ignore next */
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

  // Master data
  const categories = shallowRef<TroubleCategory[]>([])
  const offices = shallowRef<TroubleOffice[]>([])

  const categoryOptions = computed(() => {
    const cats = categories.value.length > 0
      ? categories.value.map(c => c.name)
      : [...TICKET_CATEGORIES]
    return [{ label: '全て', value: '' }, ...cats.map(c => ({ label: c, value: c }))]
  })

  const createCategoryOptions = computed(() => {
    const cats = categories.value.length > 0
      ? categories.value.map(c => c.name)
      : [...TICKET_CATEGORIES]
    return cats.map(c => ({ label: c, value: c }))
  })

  const officeOptions = computed(() =>
    offices.value.map(o => ({ label: o.name, value: o.name })),
  )

  async function fetchMasterData() {
    try {
      const [cats, offs] = await Promise.all([
        getCategories().catch(() => []),
        getOffices().catch(() => []),
      ])
      categories.value = cats
      offices.value = offs
    } catch { /* ignore */ }
  }

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
    occurred_date: '',
    company_name: '',
    office_name: '',
    department: '',
    person_name: '',
    registration_number: '',
    location: '',
    description: '',
    progress_notes: '',
    allowance: '',
    damage_amount: '',
    compensation_amount: '',
    confirmation_notice: '',
    disciplinary_content: '',
    disciplinary_action: '',
    road_service_cost: '',
    counterparty: '',
    counterparty_insurance: '',
  })

  function resetNewTicket() {
    Object.assign(newTicket, {
      category: '', occurred_date: '', company_name: '', office_name: '',
      department: '', person_name: '', registration_number: '', location: '',
      description: '', progress_notes: '', allowance: '', damage_amount: '',
      compensation_amount: '', confirmation_notice: '', disciplinary_content: '',
      disciplinary_action: '', road_service_cost: '', counterparty: '',
      counterparty_insurance: '',
    })
  }

  async function handleInlineCreate() {
    if (!newTicket.category) return
    creating.value = true
    try {
      const states = await getWorkflowStates()
      if (states.length === 0) await setupDefaultWorkflow()
      const payload: Record<string, unknown> = { category: newTicket.category }
      const fields = [
        'occurred_date', 'company_name', 'office_name', 'department',
        'person_name', 'registration_number', 'location', 'description',
        'progress_notes', 'allowance', 'confirmation_notice',
        'disciplinary_content', 'disciplinary_action', 'counterparty',
        'counterparty_insurance',
      ] as const
      for (const key of fields) {
        if (newTicket[key]) payload[key] = newTicket[key]
      }
      for (const key of ['damage_amount', 'compensation_amount', 'road_service_cost'] as const) {
        if (newTicket[key]) payload[key] = Number(newTicket[key])
      }
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

  function navigateToTicket(ticketId: string) {
    router.push(`/tickets/${ticketId}`)
  }

  return {
    filter, selectedStatuses, tickets, total, workflowStates, loading,
    deleteTarget, showDeleteModal, stateMap, totalPages,
    categoryOptions, createCategoryOptions, officeOptions, filteredTickets,
    showInlineCreate, creating, newTicket,
    categories, offices,
    loadStatusFilter, toggleStatus, toggleAllStatuses,
    resetNewTicket, handleInlineCreate,
    fetchTickets, fetchWorkflowStates, fetchMasterData,
    clearFilter, confirmDelete, handleDelete, handleExportCsv,
    formatDate, navigateToTicket,
  }
}
