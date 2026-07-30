<script setup lang="ts">
import { updateTicket } from '~/utils/api'
import { toHalfWidth } from '~/utils/normalize'
import { formatOccurredAt } from '~/utils/datetime'
import { formatExpiry } from '~/utils/carInspection'
import { resolveFieldMap } from '~/utils/ticketFieldLayout'
import type { TroubleTicket } from '~/types'

const {
  filter, selectedStatuses, tickets, loading,
  deleteTarget, showDeleteModal, stateMap, totalPages,
  categoryOptions, createCategoryOptions, officeOptions, progressOptions, filteredTickets,
  showInlineCreate, creating, createError, newTicket, workflowStates, total,
  loadStatusFilter, toggleStatus, toggleAllStatuses, toggleOccurredSort, loadSortFilter,
  resetNewTicket, handleInlineCreate,
  fetchTickets, fetchWorkflowStates, fetchMasterData,
  clearFilter, confirmDelete, handleDelete, handleExportCsv,
  navigateToTicket,
} = useTicketList()

const {
  load: loadCarInspections,
  lookupByRegistration: lookupCarInspection,
  registrationOptions: carInspectionRegistrations,
} = useCarInspections()

// 一覧の列とインライン新規作成行の入力欄は /settings の「入力フォーム表示」設定に連動させる
// (Refs #234)。設定で非表示にした項目は入力欄も列も消える。
// No / 発生日時 / ステータス / 操作列は設定対象外で常時表示 (発生日時は一覧のソート基準のため)。
const { fieldLayout, fetchFieldLayout } = useTicketFieldLayout()
const fieldMap = computed(() => resolveFieldMap(fieldLayout.value))

const LIST_FIELD_KEYS = [
  'company_name', 'office_name', 'department', 'person_name', 'registration_number',
  'category', 'location', 'title', 'description', 'progress_notes', 'allowance',
  'damage_amount', 'compensation_amount', 'confirmation_notice',
  'disciplinary_content', 'disciplinary_action', 'road_service_cost',
  'counterparty', 'counterparty_insurance',
] as const

function isFieldVisible(key: string): boolean {
  return fieldMap.value[key]?.visible ?? true
}

function fieldLabel(key: string): string {
  return fieldMap.value[key]?.label ?? key
}

// 「チケットがありません」行の colspan。固定列 5 (印刷 / No / 発生日時 / ステータス / 操作) + 可変列
const emptyColspan = computed(() => 5 + LIST_FIELD_KEYS.filter(k => isFieldVisible(k)).length)

const showBulkImport = ref(false)

function handleBulkImportDone() {
  fetchTickets()
}

// staging 限定のダミーチケット生成 (rust-alc-api staging は揮発性のため都度呼び直せる形にしてある)
const config = useRuntimeConfig()
const isStaging = (config.public.apiBase as string).includes('staging')
const dummySeedCount = ref('20')
const { seeding: dummySeeding, progress: dummySeedProgress, error: dummySeedError, seedDummyTickets } = useDummySeed()

async function handleSeedDummy() {
  await seedDummyTickets(Number(dummySeedCount.value) || 20)
  await fetchTickets()
}

// 保存中チケットID set（Enter + blur 重複発火を防ぐため in-flight 判定も兼ねる）
const savingRegistrationIds = reactive(new Set<string>())

async function saveRegistration(ticketId: string, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.trim()
  // 二重発火防止
  if (savingRegistrationIds.has(ticketId)) return
  // 値が変わっていなければ何もしない（空→空含む）
  const current = tickets.value.find((t: TroubleTicket) => t.id === ticketId)?.registration_number || ''
  if (value === current) return
  savingRegistrationIds.add(ticketId)
  try {
    const updated = await updateTicket(ticketId, { registration_number: value || null })
    // 再フェッチせず該当行のみローカル更新 → フォーカス・スクロール位置を保つ
    const list = tickets.value.slice()
    const idx = list.findIndex((t: TroubleTicket) => t.id === ticketId)
    if (idx >= 0) {
      list[idx] = updated
      tickets.value = list
    }
  } catch (e) {
    console.error('登録番号の保存に失敗:', e)
    target.value = current
  } finally {
    savingRegistrationIds.delete(ticketId)
  }
}

function openPrintView(ticketId: string) {
  window.open(`/tickets/print/${ticketId}`, '_blank')
}

onMounted(() => {
  loadStatusFilter()
  loadSortFilter()
  fetchTickets()
  fetchWorkflowStates()
  fetchMasterData()
  fetchFieldLayout()
  loadCarInspections()
})

watch(() => ({ ...filter }), () => { fetchTickets() }, { deep: true })
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">チケット一覧</h2>
      <div class="flex gap-2">
        <UButton label="CSV出力" icon="i-lucide-download" variant="outline" size="sm" @click="handleExportCsv" />
        <UButton label="一括登録" icon="i-lucide-upload" variant="outline" size="sm" @click="showBulkImport = true" />
      </div>
    </div>

    <!-- Dummy seed: staging only -->
    <div v-if="isStaging" class="flex items-center gap-2 rounded-lg border border-dashed border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-sm">
      <span class="font-medium text-yellow-800 dark:text-yellow-300">STAGING</span>
      <UInput v-model="dummySeedCount" type="number" size="sm" class="w-20" />
      <UButton
        label="ダミーチケット生成"
        icon="i-lucide-sparkles"
        size="sm"
        variant="outline"
        :loading="dummySeeding"
        @click="handleSeedDummy"
      />
      <span v-if="dummySeeding" class="text-yellow-700 dark:text-yellow-400">
        生成中... {{ dummySeedProgress.done }}/{{ dummySeedProgress.total }}
      </span>
      <span v-if="dummySeedError" class="text-red-600">{{ dummySeedError }}</span>
    </div>

    <!-- Filters: single row -->
    <div class="flex flex-wrap items-end gap-2">
      <USelect v-model="filter.category" :items="categoryOptions" placeholder="カテゴリ" size="sm" class="w-32" />
      <UInput
        :model-value="filter.q"
        placeholder="検索"
        size="sm"
        class="w-28"
        @update:model-value="(v: string | number) => { filter.q = toHalfWidth(String(v ?? '')) }"
      />
      <UInput v-model="filter.person_name" placeholder="氏名" size="sm" class="w-24" />
      <UInput v-model="filter.company_name" placeholder="会社名" size="sm" class="w-28" />
      <USelect v-model="filter.office_name" :items="officeOptions" placeholder="営業所(全て)" size="sm" class="w-28" :disabled="officeOptions.length === 0" />
      <YmdInput v-model="filter.date_from" />
      <span class="text-gray-400 text-xs">〜</span>
      <YmdInput v-model="filter.date_to" />
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
    <div v-else class="overflow-x-auto p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
      <!-- 入力欄の出し入れは /settings の「入力フォーム表示」設定に連動する (Refs #234) -->
      <div class="flex items-end gap-2 whitespace-nowrap min-w-[1600px]">
        <USelect v-if="isFieldVisible('category')" v-model="newTicket.category" :items="createCategoryOptions" placeholder="カテゴリ" size="sm" class="w-28" />
        <YmdtInput
          :model-value="newTicket.occurred_at || undefined"
          class="w-72"
          @update:model-value="(v: string | undefined) => { newTicket.occurred_at = v ?? '' }"
        />
        <UInput v-if="isFieldVisible('company_name')" v-model="newTicket.company_name" placeholder="会社名" size="sm" class="w-24" />
        <UInput v-if="isFieldVisible('office_name')" v-model="newTicket.office_name" placeholder="営業所" size="sm" class="w-24" list="ticket-office-names" />
        <UInput v-if="isFieldVisible('department')" v-model="newTicket.department" placeholder="運行課" size="sm" class="w-20" />
        <div v-if="isFieldVisible('person_name')" class="flex flex-col gap-0.5 w-24">
          <UInput v-model="newTicket.person_name" placeholder="当事者名" size="sm" />
          <label class="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer whitespace-nowrap">
            <input v-model="newTicket.person_is_external" type="checkbox" class="rounded">
            外部/手入力
          </label>
        </div>
        <UInput
          v-if="isFieldVisible('registration_number')"
          :model-value="newTicket.registration_number"
          placeholder="登録番号"
          size="sm"
          class="w-24"
          list="car-inspection-registrations"
          @update:model-value="(v: string | number) => { newTicket.registration_number = toHalfWidth(String(v ?? '')) }"
        />
        <UInput v-if="isFieldVisible('location')" v-model="newTicket.location" placeholder="発生場所" size="sm" class="w-24" />
        <UInput v-if="isFieldVisible('title')" v-model="newTicket.title" placeholder="タイトル" size="sm" class="w-28" />
        <UInput v-if="isFieldVisible('description')" v-model="newTicket.description" :placeholder="fieldLabel('description')" size="sm" class="w-32" />
        <USelect v-if="isFieldVisible('progress_notes')" v-model="newTicket.progress_notes" :items="progressOptions" placeholder="進捗状況" size="sm" class="w-24" :disabled="progressOptions.length === 0" />
        <UInput v-if="isFieldVisible('allowance')" v-model="newTicket.allowance" placeholder="手当等" size="sm" class="w-20" />
        <UInput v-if="isFieldVisible('damage_amount')" v-model="newTicket.damage_amount" type="number" placeholder="損害額" size="sm" class="w-20" />
        <UInput v-if="isFieldVisible('compensation_amount')" v-model="newTicket.compensation_amount" type="number" placeholder="賠償額" size="sm" class="w-20" />
        <UInput v-if="isFieldVisible('confirmation_notice')" v-model="newTicket.confirmation_notice" placeholder="確認書" size="sm" class="w-20" />
        <UInput v-if="isFieldVisible('disciplinary_content')" v-model="newTicket.disciplinary_content" placeholder="処分検討" size="sm" class="w-24" />
        <UInput v-if="isFieldVisible('disciplinary_action')" v-model="newTicket.disciplinary_action" placeholder="処分内容" size="sm" class="w-24" />
        <UInput v-if="isFieldVisible('road_service_cost')" v-model="newTicket.road_service_cost" type="number" placeholder="ロードサービス費用" size="sm" class="w-28" />
        <UInput v-if="isFieldVisible('counterparty')" v-model="newTicket.counterparty" placeholder="相手" size="sm" class="w-20" />
        <UInput v-if="isFieldVisible('counterparty_insurance')" v-model="newTicket.counterparty_insurance" placeholder="相手保険" size="sm" class="w-24" />
        <UButton label="作成" size="sm" :loading="creating" :disabled="!newTicket.category" @click="handleInlineCreate" />
        <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="showInlineCreate = false; resetNewTicket()" />
      </div>
      <p v-if="createError" class="text-xs text-red-500 mt-1 px-1">作成エラー: {{ createError }}</p>
    </div>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="text-sm whitespace-nowrap min-w-[1600px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-2 font-medium" />
              <th class="text-left py-2 px-2 font-medium">No</th>
              <th class="text-left py-2 px-2 font-medium">
                <!-- Nuxt UI UTable の sortable 列標準に合わせた UButton ヘッダ (Refs #230) -->
                <UButton
                  label="発生日時"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="-mx-2.5 font-medium"
                  title="クリックで発生日時ソート (降順→昇順→解除)"
                  :trailing-icon="filter.sort_by === 'occurred'
                    ? (filter.sort_desc ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up')
                    : 'i-lucide-arrow-up-down'"
                  @click="toggleOccurredSort"
                />
              </th>
              <th v-if="isFieldVisible('company_name')" class="text-left py-2 px-2 font-medium">所属会社名</th>
              <th v-if="isFieldVisible('office_name')" class="text-left py-2 px-2 font-medium">営業所名</th>
              <th v-if="isFieldVisible('department')" class="text-left py-2 px-2 font-medium">運行課</th>
              <th v-if="isFieldVisible('person_name')" class="text-left py-2 px-2 font-medium">当事者名</th>
              <th v-if="isFieldVisible('registration_number')" class="text-left py-2 px-2 font-medium">登録番号</th>
              <th v-if="isFieldVisible('category')" class="text-left py-2 px-2 font-medium">事故等分類</th>
              <th v-if="isFieldVisible('location')" class="text-left py-2 px-2 font-medium">発生場所</th>
              <!-- タイトル / 内容 のヘッダーは入力フォーム表示設定のラベルを使う (表記の食い違い防止、Refs #234) -->
              <th v-if="isFieldVisible('title')" class="text-left py-2 px-2 font-medium">{{ fieldLabel('title') }}</th>
              <th v-if="isFieldVisible('description')" class="text-left py-2 px-2 font-medium">{{ fieldLabel('description') }}</th>
              <th v-if="isFieldVisible('progress_notes')" class="text-left py-2 px-2 font-medium">進捗状況</th>
              <th v-if="isFieldVisible('allowance')" class="text-left py-2 px-2 font-medium">手当等</th>
              <th v-if="isFieldVisible('damage_amount')" class="text-right py-2 px-2 font-medium">損害額</th>
              <th v-if="isFieldVisible('compensation_amount')" class="text-right py-2 px-2 font-medium">賠償額</th>
              <th v-if="isFieldVisible('confirmation_notice')" class="text-left py-2 px-2 font-medium">確認書</th>
              <th v-if="isFieldVisible('disciplinary_content')" class="text-left py-2 px-2 font-medium">処分検討内容</th>
              <th v-if="isFieldVisible('disciplinary_action')" class="text-left py-2 px-2 font-medium">処分内容</th>
              <th v-if="isFieldVisible('road_service_cost')" class="text-right py-2 px-2 font-medium">ロードサービス費用</th>
              <th v-if="isFieldVisible('counterparty')" class="text-left py-2 px-2 font-medium">相手</th>
              <th v-if="isFieldVisible('counterparty_insurance')" class="text-left py-2 px-2 font-medium">相手保険会社</th>
              <th class="text-left py-2 px-2 font-medium">ステータス</th>
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
              <td class="py-2 px-2" @click.stop>
                <UButton icon="i-lucide-printer" variant="ghost" size="xs" title="印刷" @click.stop="openPrintView(ticket.id)" />
              </td>
              <td class="py-2 px-2 text-gray-500">{{ ticket.ticket_no }}</td>
              <td class="py-2 px-2">{{ formatOccurredAt(ticket.occurred_at, ticket.occurred_date) }}</td>
              <td v-if="isFieldVisible('company_name')" class="py-2 px-2">{{ ticket.company_name || '-' }}</td>
              <td v-if="isFieldVisible('office_name')" class="py-2 px-2">{{ ticket.office_name || '-' }}</td>
              <td v-if="isFieldVisible('department')" class="py-2 px-2">{{ ticket.department || '-' }}</td>
              <td
                v-if="isFieldVisible('person_name')"
                class="py-2 px-2"
                :class="ticket.person_name && !ticket.person_id && !ticket.person_is_external
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                  : ''"
                :title="ticket.person_name && !ticket.person_id && !ticket.person_is_external ? '従業員マスタ未リンク（編集で自動リンクされます）' : undefined"
              >
                <span class="inline-flex items-center gap-1">
                  <UIcon
                    v-if="ticket.person_name && !ticket.person_id && !ticket.person_is_external"
                    name="i-lucide-alert-triangle"
                    class="size-3.5"
                  />
                  <UIcon
                    v-else-if="ticket.person_is_external"
                    name="i-lucide-user-round"
                    class="size-3.5 text-gray-400"
                    title="外部当事者"
                  />
                  {{ ticket.person_name || '-' }}
                </span>
              </td>
              <td v-if="isFieldVisible('registration_number')" class="py-2 px-2" @click.stop>
                <input
                  type="text"
                  list="car-inspection-registrations"
                  placeholder="登録番号を入力"
                  class="w-28 rounded border border-dashed border-gray-300 dark:border-gray-600 bg-transparent px-1.5 py-0.5 text-xs focus:border-solid focus:border-blue-500 focus:outline-none"
                  :value="ticket.registration_number || ''"
                  :disabled="savingRegistrationIds.has(ticket.id)"
                  @input="(e: Event) => { const el = e.target as HTMLInputElement; const v = toHalfWidth(el.value); if (el.value !== v) el.value = v }"
                  @keydown.enter.prevent="saveRegistration(ticket.id, $event)"
                  @change="saveRegistration(ticket.id, $event)"
                >
                <UIcon
                  v-if="ticket.registration_number && lookupCarInspection(ticket.registration_number)"
                  name="i-lucide-info"
                  class="ml-1 inline size-3.5 text-blue-500 align-middle"
                  :title="(() => { const s = lookupCarInspection(ticket.registration_number)!; return `所有者: ${s.ownerName || '-'}\n車種: ${s.carName || '-'}\n型式: ${s.model || '-'}\n車検満了日: ${formatExpiry(s.validPeriodExpirdate)}` })()"
                />
              </td>
              <td v-if="isFieldVisible('category')" class="py-2 px-2"><TicketCategoryBadge :category="ticket.category" /></td>
              <td v-if="isFieldVisible('location')" class="py-2 px-2 max-w-[120px] truncate">{{ ticket.location || '-' }}</td>
              <td v-if="isFieldVisible('title')" class="py-2 px-2 max-w-[160px] truncate">{{ ticket.title || '-' }}</td>
              <td v-if="isFieldVisible('description')" class="py-2 px-2 max-w-[200px] truncate">{{ ticket.description || '-' }}</td>
              <td v-if="isFieldVisible('progress_notes')" class="py-2 px-2 max-w-[120px] truncate">{{ ticket.progress_notes || '-' }}</td>
              <td v-if="isFieldVisible('allowance')" class="py-2 px-2">{{ ticket.allowance || '-' }}</td>
              <td v-if="isFieldVisible('damage_amount')" class="py-2 px-2 text-right">{{ ticket.damage_amount || '-' }}</td>
              <td v-if="isFieldVisible('compensation_amount')" class="py-2 px-2 text-right">{{ ticket.compensation_amount || '-' }}</td>
              <td v-if="isFieldVisible('confirmation_notice')" class="py-2 px-2 max-w-[100px] truncate">{{ ticket.confirmation_notice || '-' }}</td>
              <td v-if="isFieldVisible('disciplinary_content')" class="py-2 px-2 max-w-[120px] truncate">{{ ticket.disciplinary_content || '-' }}</td>
              <td v-if="isFieldVisible('disciplinary_action')" class="py-2 px-2 max-w-[120px] truncate">{{ ticket.disciplinary_action || '-' }}</td>
              <td v-if="isFieldVisible('road_service_cost')" class="py-2 px-2 text-right">{{ ticket.road_service_cost || '-' }}</td>
              <td v-if="isFieldVisible('counterparty')" class="py-2 px-2">{{ ticket.counterparty || '-' }}</td>
              <td v-if="isFieldVisible('counterparty_insurance')" class="py-2 px-2">{{ ticket.counterparty_insurance || '-' }}</td>
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
              <td class="py-2 px-2 text-right whitespace-nowrap">
                <UButton icon="i-lucide-printer" variant="ghost" size="xs" title="印刷" @click.stop="openPrintView(ticket.id)" />
                <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click.stop="confirmDelete(ticket)" />
              </td>
            </tr>
            <tr v-if="filteredTickets.length === 0 && !loading">
              <td :colspan="emptyColspan" class="py-8 text-center text-gray-400">チケットがありません</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center pt-4">
        <!-- Nuxt UI 4 の UPagination のモデルは page (v-model:page)。素の v-model では動かない (Refs #230) -->
        <UPagination v-model:page="filter.page" :total="total" :items-per-page="filter.per_page || 20" />
      </div>
    </UCard>

    <!-- Office names for autocomplete (inline create の営業所直接入力用、Refs #225 ④) -->
    <datalist id="ticket-office-names">
      <option v-for="opt in officeOptions" :key="opt.value" :value="opt.value" />
    </datalist>

    <!-- Car inspection registrations for autocomplete (shared datalist) -->
    <datalist id="car-inspection-registrations">
      <option
        v-for="reg in carInspectionRegistrations"
        :key="reg"
        :value="reg"
      />
    </datalist>

    <!-- Bulk import modal -->
    <BulkImportModal v-model:open="showBulkImport" @done="handleBulkImportDone" />

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

