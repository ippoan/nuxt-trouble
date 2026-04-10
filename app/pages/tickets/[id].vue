<script setup lang="ts">
const route = useRoute()
const ticketId = route.params.id as string

const {
  ticket, workflowStates, editing, saving, error,
  showDeleteModal, form, statusLabel, fields,
  displayValue, startEdit, handleSave, handleDelete, load,
} = useTicketDetail(ticketId)

onMounted(() => load())
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div v-if="!ticket && !error" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>

    <div v-else-if="error && !ticket" class="text-center py-12 space-y-4">
      <p class="text-red-600">{{ error }}</p>
      <UButton label="一覧に戻る" to="/tickets" variant="outline" />
    </div>

    <template v-else-if="ticket">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton icon="i-lucide-arrow-left" variant="ghost" to="/tickets" />
          <h2 class="text-xl font-bold">No.{{ ticket.ticket_no }}</h2>
          <TicketCategoryBadge :category="ticket.category" />
          <UBadge
            v-if="statusLabel"
            :style="{ backgroundColor: statusLabel.color + '20', color: statusLabel.color }"
            variant="subtle"
          >
            {{ statusLabel.label }}
          </UBadge>
        </div>
        <div class="flex gap-2">
          <template v-if="!editing">
            <UButton label="編集" icon="i-lucide-pencil" variant="outline" @click="startEdit" />
            <UButton label="削除" icon="i-lucide-trash-2" variant="outline" color="error" @click="showDeleteModal = true" />
          </template>
        </div>
      </div>

      <div v-if="error" class="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>

      <UCard v-if="editing">
        <TicketFormFields v-model="form" mode="edit" />
        <div class="flex justify-end gap-2 mt-6">
          <UButton label="キャンセル" variant="outline" @click="editing = false" />
          <UButton label="保存" :loading="saving" @click="handleSave" />
        </div>
      </UCard>

      <UCard v-else>
        <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="field in fields" :key="field.key" class="space-y-1">
            <dt class="text-xs text-gray-500 dark:text-gray-400">{{ field.label }}</dt>
            <dd class="text-sm">{{ displayValue(field.key) }}</dd>
          </div>
          <div class="space-y-1">
            <dt class="text-xs text-gray-500 dark:text-gray-400">対応期限</dt>
            <dd class="text-sm">{{ ticket.due_date ? ticket.due_date.substring(0, 10) : '-' }}</dd>
          </div>
          <div class="space-y-1">
            <dt class="text-xs text-gray-500 dark:text-gray-400">作成日</dt>
            <dd class="text-sm">{{ ticket.created_at.substring(0, 10) }}</dd>
          </div>
        </dl>
      </UCard>

      <!-- Status Transition -->
      <UCard v-if="ticket.status_id">
        <TicketStatusTransition
          :ticket-id="ticketId"
          :current-status-id="ticket.status_id"
          :workflow-states="workflowStates"
          @transitioned="load"
        />
      </UCard>

      <!-- Status History -->
      <UCard>
        <TicketStatusHistory
          :ticket-id="ticketId"
          :workflow-states="workflowStates"
        />
      </UCard>

      <!-- Comments -->
      <UCard>
        <TicketComments :ticket-id="ticketId" />
      </UCard>

      <!-- Files -->
      <UCard>
        <TicketFiles :ticket-id="ticketId" />
      </UCard>
    </template>

    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ ticket?.ticket_no }} 「{{ ticket?.category }}」を削除します。
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
