import { createTicket, setupDefaultWorkflow, getWorkflowStates } from '~/utils/api'
import type { CreateTroubleTicket } from '~/types'
import { fromDatetimeLocalInput } from '~/utils/datetime'

export function useTicketNew() {
  const router = useRouter()
  const saving = ref(false)
  const error = ref<string | null>(null)

  const form = ref<Record<string, unknown>>({
    category: '',
    title: '',
    description: '',
    occurred_at: '',
    company_name: '',
    office_name: '',
    department: '',
    person_name: '',
    registration_number: '',
    location: '',
    damage_amount: null,
    compensation_amount: null,
    road_service_cost: null,
    counterparty: '',
    counterparty_insurance: '',
    due_date: '',
  })

  async function ensureWorkflow() {
    const states = await getWorkflowStates()
    if (states.length === 0) {
      await setupDefaultWorkflow()
    }
  }

  async function handleSubmit() {
    if (!form.value.category) {
      error.value = 'カテゴリは必須です'
      return
    }

    saving.value = true
    error.value = null

    try {
      await ensureWorkflow()
      const payload: Record<string, unknown> = { category: form.value.category }
      for (const [key, value] of Object.entries(form.value)) {
        if (key === 'category' || key === 'occurred_at') continue
        if (value != null && value !== '') {
          payload[key] = value
        }
      }
      const occurred = fromDatetimeLocalInput(form.value.occurred_at as string | undefined)
      if (occurred) {
        payload.occurred_at = occurred.occurred_at
        payload.occurred_date = occurred.occurred_date
      }
      const ticket = await createTicket(payload as unknown as CreateTroubleTicket)
      router.push(`/tickets/${ticket.id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '作成に失敗しました'
    } finally {
      saving.value = false
    }
  }

  return { form, saving, error, handleSubmit }
}
