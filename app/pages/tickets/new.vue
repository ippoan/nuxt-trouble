<script setup lang="ts">
import { createTicket, setupDefaultWorkflow, getWorkflowStates } from '~/utils/api'
import type { CreateTroubleTicket } from '~/types'

const router = useRouter()
const saving = ref(false)
const error = ref<string | null>(null)

const form = ref<Record<string, unknown>>({
  category: '',
  title: '',
  description: '',
  occurred_date: '',
  company_name: '',
  office_name: '',
  department: '',
  person_name: '',
  vehicle_number: '',
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
    const data: CreateTroubleTicket = {
      category: form.value.category as string,
    }
    // Only include non-empty fields
    for (const [key, value] of Object.entries(form.value)) {
      if (key === 'category') continue
      if (value != null && value !== '') {
        ;(data as Record<string, unknown>)[key] = value
      }
    }
    const ticket = await createTicket(data)
    router.push(`/tickets/${ticket.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '作成に失敗しました'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">新規チケット作成</h2>
    </div>

    <UCard>
      <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>

      <TicketFormFields v-model="form" mode="create" />

      <div class="flex justify-end gap-2 mt-6">
        <UButton label="キャンセル" variant="outline" to="/tickets" />
        <UButton label="作成" :loading="saving" @click="handleSubmit" />
      </div>
    </UCard>
  </div>
</template>
