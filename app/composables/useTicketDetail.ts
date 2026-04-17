import { getTicket, updateTicket, deleteTicket, getWorkflowStates } from '~/utils/api'
import type { TroubleTicket, TroubleWorkflowState, UpdateTroubleTicket } from '~/types'

export function useTicketDetail(ticketId: string) {
  const router = useRouter()

  const ticket = shallowRef<TroubleTicket | null>(null)
  const workflowStates = shallowRef<TroubleWorkflowState[]>([])
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
    { label: '登録番号', key: 'registration_number' },
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
      registration_number: ticket.value.registration_number,
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
      ticket.value = await updateTicket(ticketId, data as UpdateTroubleTicket)
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

  async function load() {
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
  }

  return {
    ticket, workflowStates, editing, saving, error,
    showDeleteModal, form, statusLabel, fields,
    displayValue, startEdit, handleSave, handleDelete, load,
  }
}
