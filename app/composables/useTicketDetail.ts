import { getTicket, deleteTicket, getWorkflowStates } from '~/utils/api'
import type { TroubleTicket, TroubleWorkflowState } from '~/types'

export function useTicketDetail(ticketId: string) {
  const router = useRouter()

  const ticket = shallowRef<TroubleTicket | null>(null)
  const workflowStates = shallowRef<TroubleWorkflowState[]>([])
  const error = ref<string | null>(null)
  const showDeleteModal = ref(false)

  const statusLabel = computed(() => {
    const sid = ticket.value?.status_id
    if (!sid) return undefined
    return workflowStates.value.find(s => s.id === sid)
  })

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
    ticket, workflowStates, statusLabel, error,
    showDeleteModal,
    handleDelete, load,
  }
}
