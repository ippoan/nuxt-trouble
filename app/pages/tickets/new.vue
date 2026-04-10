<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee } from '~/types'
import { getCategories, getOffices, getProgressStatuses, getEmployees } from '~/utils/api'

const { form, saving, error, handleSubmit } = useTicketNew()

const categories = ref<TroubleCategory[]>([])
const offices = ref<TroubleOffice[]>([])
const progressStatuses = ref<TroubleProgressStatus[]>([])
const employees = ref<Employee[]>([])

onMounted(() => {
  getCategories().then(r => categories.value = r).catch(() => {})
  getOffices().then(r => offices.value = r).catch(() => {})
  getProgressStatuses().then(r => progressStatuses.value = r).catch(() => {})
  getEmployees().then(r => employees.value = r).catch(() => {})
})
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

      <TicketFormFields
        v-model="form"
        mode="create"
        :categories="categories"
        :offices="offices"
        :progress-statuses="progressStatuses"
        :employees="employees"
      />

      <div class="flex justify-end gap-2 mt-6">
        <UButton label="キャンセル" variant="outline" to="/tickets" />
        <UButton label="作成" :loading="saving" @click="handleSubmit" />
      </div>
    </UCard>
  </div>
</template>
