<script setup lang="ts">
const {
  filter, selectedStatuses, loading,
  deleteTarget, showDeleteModal, stateMap, totalPages,
  categoryOptions, createCategoryOptions, filteredTickets,
  showInlineCreate, creating, newTicket, workflowStates, total,
  loadStatusFilter, toggleStatus, toggleAllStatuses,
  resetNewTicket, handleInlineCreate,
  fetchTickets, fetchWorkflowStates,
  clearFilter, confirmDelete, handleDelete, handleExportCsv,
  formatDate, navigateToTicket,
} = useTicketList()

onMounted(() => {
  loadStatusFilter()
  fetchTickets()
  fetchWorkflowStates()
})

watch(() => ({ ...filter }), () => { fetchTickets() }, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">チケット一覧</h2>
      <UButton label="CSV出力" icon="i-lucide-download" variant="outline" size="sm" @click="handleExportCsv" />
    </div>

    <!-- Filters: single row -->
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="filter.category" :items="categoryOptions" placeholder="カテゴリ" size="sm" class="w-32" />
      <UInput v-model="filter.q" placeholder="検索" size="sm" class="w-28" />
      <UInput v-model="filter.person_name" placeholder="氏名" size="sm" class="w-24" />
      <UInput v-model="filter.company_name" placeholder="会社名" size="sm" class="w-28" />
      <UInput v-model="filter.office_name" placeholder="営業所" size="sm" class="w-24" />
      <UInput v-model="filter.date_from" type="date" size="sm" class="w-36" />
      <span class="text-gray-400 text-xs">〜</span>
      <UInput v-model="filter.date_to" type="date" size="sm" class="w-36" />
      <UButton label="クリア" variant="ghost" size="xs" @click="clearFilter" />
    </div>

    <!-- Status filter: checkboxes -->
    <div v-if="workflowStates.length > 0" class="flex items-center gap-3 text-xs">
      <span class="text-gray-500 font-medium">ステータス:</span>
      <label class="flex items-center gap-1 cursor-pointer">
        <input
          type="checkbox"
          :checked="selectedStatuses.size === workflowStates.length"
          :indeterminate="selectedStatuses.size > 0 && selectedStatuses.size < workflowStates.length"
          class="rounded"
          @change="toggleAllStatuses"
        />
        <span class="text-gray-400">全て</span>
      </label>
      <label
        v-for="state in workflowStates"
        :key="state.id"
        class="flex items-center gap-1 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="selectedStatuses.has(state.id)"
          class="rounded"
          @change="toggleStatus(state.id)"
        />
        <span
          class="px-1.5 py-0.5 rounded text-[11px]"
          :style="{ backgroundColor: state.color + '20', color: state.color }"
        >
          {{ state.label }}
        </span>
      </label>
    </div>

    <!-- Create button + inline form -->
    <UButton
      v-if="!showInlineCreate"
      label="＋ 新規作成"
      variant="outline"
      size="sm"
      block
      class="border-dashed"
      @click="showInlineCreate = true"
    />
    <div v-else class="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
      <USelect v-model="newTicket.category" :items="createCategoryOptions" placeholder="カテゴリ" size="sm" class="w-32" />
      <UInput v-model="newTicket.person_name" placeholder="氏名" size="sm" class="w-24" />
      <UInput v-model="newTicket.company_name" placeholder="会社名" size="sm" class="w-28" />
      <UInput v-model="newTicket.office_name" placeholder="営業所" size="sm" class="w-24" />
      <UInput v-model="newTicket.occurred_date" type="date" size="sm" class="w-36" />
      <UInput v-model="newTicket.description" placeholder="説明" size="sm" class="flex-1 min-w-[120px]" />
      <UButton label="作成" size="sm" :loading="creating" :disabled="!newTicket.category" @click="handleInlineCreate" />
      <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="showInlineCreate = false; resetNewTicket()" />
    </div>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-2 px-2 font-medium">No</th>
            <th class="text-left py-2 px-2 font-medium">カテゴリ</th>
            <th class="text-left py-2 px-2 font-medium">氏名</th>
            <th class="text-left py-2 px-2 font-medium">会社名</th>
            <th class="text-left py-2 px-2 font-medium">発生日</th>
            <th class="text-left py-2 px-2 font-medium">ステータス</th>
            <th class="text-left py-2 px-2 font-medium">作成日</th>
            <th class="text-right py-2 px-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
            @click="navigateToTicket(ticket.id)"
          >
            <td class="py-2 px-2 text-gray-500">{{ ticket.ticket_no }}</td>
            <td class="py-2 px-2"><TicketCategoryBadge :category="ticket.category" /></td>
            <td class="py-2 px-2">{{ ticket.person_name || '-' }}</td>
            <td class="py-2 px-2">{{ ticket.company_name || '-' }}</td>
            <td class="py-2 px-2">{{ formatDate(ticket.occurred_date) }}</td>
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
            <td class="py-2 px-2">{{ formatDate(ticket.created_at) }}</td>
            <td class="py-2 px-2 text-right">
              <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="confirmDelete(ticket)" />
            </td>
          </tr>
          <tr v-if="filteredTickets.length === 0 && !loading">
            <td colspan="8" class="py-8 text-center text-gray-400">チケットがありません</td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <UPagination v-model="filter.page" :total="total" :items-per-page="filter.per_page || 20" />
      </div>
    </UCard>

    <!-- Delete modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ deleteTarget?.ticket_no }} 「{{ deleteTarget?.category }}」を削除します。
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
