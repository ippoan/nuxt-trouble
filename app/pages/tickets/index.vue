<script setup lang="ts">
const {
  filter, tickets, total, loading,
  deleteTarget, showDeleteModal, stateMap, totalPages,
  categoryOptions, fetchTickets, fetchWorkflowStates,
  clearFilter, confirmDelete, handleDelete, handleExportCsv,
  formatDate, navigateToTicket,
} = useTicketList()

// Initial fetch
onMounted(() => {
  fetchTickets()
  fetchWorkflowStates()
})

// Re-fetch on filter change
watch(() => ({ ...filter }), () => {
  fetchTickets()
}, { deep: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">チケット一覧</h2>
      <div class="flex gap-2">
        <UButton
          label="CSV出力"
          icon="i-lucide-download"
          variant="outline"
          @click="handleExportCsv"
        />
        <UButton
          label="新規作成"
          icon="i-lucide-plus"
          to="/tickets/new"
        />
      </div>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <UFormField label="カテゴリ">
          <USelect
            v-model="filter.category"
            :items="categoryOptions"
            placeholder="全て"
          />
        </UFormField>

        <UFormField label="氏名">
          <UInput v-model="filter.person_name" placeholder="氏名で検索" />
        </UFormField>

        <UFormField label="会社名">
          <UInput v-model="filter.company_name" placeholder="会社名で検索" />
        </UFormField>

        <UFormField label="営業所名">
          <UInput v-model="filter.office_name" placeholder="営業所名で検索" />
        </UFormField>

        <UFormField label="日付（から）">
          <UInput v-model="filter.date_from" type="date" />
        </UFormField>

        <UFormField label="日付（まで）">
          <UInput v-model="filter.date_to" type="date" />
        </UFormField>

        <UFormField label="フリーテキスト">
          <UInput v-model="filter.q" placeholder="キーワード検索" />
        </UFormField>

        <div class="flex items-end">
          <UButton label="クリア" variant="ghost" @click="clearFilter" />
        </div>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-2 font-medium">No</th>
            <th class="text-left py-3 px-2 font-medium">カテゴリ</th>
            <th class="text-left py-3 px-2 font-medium">氏名</th>
            <th class="text-left py-3 px-2 font-medium">会社名</th>
            <th class="text-left py-3 px-2 font-medium">発生日</th>
            <th class="text-left py-3 px-2 font-medium">ステータス</th>
            <th class="text-left py-3 px-2 font-medium">作成日</th>
            <th class="text-right py-3 px-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="ticket in tickets"
            :key="ticket.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
            @click="navigateToTicket(ticket.id)"
          >
            <td class="py-3 px-2 text-gray-500">{{ ticket.ticket_no }}</td>
            <td class="py-3 px-2">
              <TicketCategoryBadge :category="ticket.category" />
            </td>
            <td class="py-3 px-2">{{ ticket.person_name || '-' }}</td>
            <td class="py-3 px-2">{{ ticket.company_name || '-' }}</td>
            <td class="py-3 px-2">{{ formatDate(ticket.occurred_date) }}</td>
            <td class="py-3 px-2">
              <UBadge
                v-if="ticket.status_id && stateMap[ticket.status_id]"
                :style="{ backgroundColor: stateMap[ticket.status_id]!.color + '20', color: stateMap[ticket.status_id]!.color }"
                variant="subtle"
              >
                {{ stateMap[ticket.status_id]!.label }}
              </UBadge>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="py-3 px-2">{{ formatDate(ticket.created_at) }}</td>
            <td class="py-3 px-2 text-right">
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click.stop="confirmDelete(ticket)"
              />
            </td>
          </tr>
          <tr v-if="tickets.length === 0">
            <td colspan="8" class="py-8 text-center text-gray-400">
              チケットがありません
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <UPagination
          v-model="filter.page"
          :total="total"
          :items-per-page="filter.per_page || 20"
        />
      </div>
    </UCard>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ deleteTarget?.ticket_no }} 「{{ deleteTarget?.category }}」を削除します。この操作は取り消せません。
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
