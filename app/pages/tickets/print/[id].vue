<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState, TroubleTask, TroubleStatusHistory } from '~/types'
import { getTicket, getWorkflowStates, getTasks, getStatusHistory } from '~/utils/api'
import { formatOccurredAt } from '~/utils/datetime'
import { formatExpiry } from '~/utils/carInspection'
import { useTaskStatuses } from '~/composables/useTaskStatuses'

definePageMeta({ layout: false })

const route = useRoute()
const ticketId = route.params.id as string

const ticket = shallowRef<TroubleTicket | null>(null)
const workflowStates = shallowRef<TroubleWorkflowState[]>([])
const tasks = shallowRef<TroubleTask[]>([])
const statusHistory = shallowRef<TroubleStatusHistory[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const { load: loadCarInspections, lookupByRegistration } = useCarInspections()
const { load: loadTaskStatuses, byKey: taskStatusByKey } = useTaskStatuses()

const printedAt = new Date().toLocaleString('ja-JP')

const carInspectionMatch = computed(() => lookupByRegistration(ticket.value?.registration_number))

function stateLabel(id: string | null | undefined): string {
  if (!id) return '(なし)'
  return workflowStates.value.find(s => s.id === id)?.label || '不明'
}

const statusLabel = computed(() => stateLabel(ticket.value?.status_id))

function taskStatusLabel(status: string): string {
  return taskStatusByKey(status)?.label || status
}

function ymd(v: string | null | undefined): string {
  if (!v) return '-'
  return String(v).substring(0, 10)
}

function displayValue(v: string | number | null | undefined): string {
  if (v == null || v === '') return '-'
  return String(v)
}

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '-'
  return `${Number(v).toLocaleString()}円`
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const [t, states, ts, hist] = await Promise.all([
      getTicket(ticketId),
      getWorkflowStates().catch(() => [] as TroubleWorkflowState[]),
      getTasks(ticketId).catch(() => [] as TroubleTask[]),
      getStatusHistory(ticketId).catch(() => [] as TroubleStatusHistory[]),
    ])
    ticket.value = t
    workflowStates.value = states
    tasks.value = ts
    statusHistory.value = hist
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'チケットの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

function handlePrint() {
  window.print()
}

function handleClose() {
  window.close()
}

onMounted(() => {
  load()
  loadCarInspections()
  loadTaskStatuses()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100 print:bg-white">
    <!-- Toolbar: screen only -->
    <div class="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
      <span class="text-sm text-gray-500">印刷プレビュー{{ ticket ? ` — No.${ticket.ticket_no}` : '' }}</span>
      <div class="flex gap-2">
        <UButton label="閉じる" variant="outline" size="sm" @click="handleClose" />
        <UButton label="印刷する" icon="i-lucide-printer" size="sm" :disabled="!ticket" @click="handlePrint" />
      </div>
    </div>

    <div v-if="loading" class="print:hidden flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>

    <div v-else-if="error || !ticket" class="print:hidden text-center py-12 text-red-600">
      {{ error || 'チケットが見つかりません' }}
    </div>

    <div v-else class="mx-auto max-w-[210mm] bg-white text-black print:max-w-none">
      <!-- ============ 鏡 (サマリー) ============ -->
      <section class="print-sheet px-10 py-10 break-after-page" style="page-break-after: always;">
        <div class="flex items-start justify-between border-b-2 border-black pb-3">
          <h1 class="text-2xl font-bold tracking-wide">トラブル報告書（鏡）</h1>
          <div class="text-right text-xs text-gray-600">
            <div>印刷日時: {{ printedAt }}</div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <span class="text-lg font-bold">No.{{ ticket.ticket_no }}</span>
          <span class="rounded border border-black px-2 py-0.5 text-sm font-medium">{{ ticket.category }}</span>
          <span class="rounded border border-gray-400 px-2 py-0.5 text-sm">ステータス: {{ statusLabel }}</span>
        </div>

        <table class="mt-6 w-full border-collapse text-sm">
          <tbody>
            <tr class="border-t border-b border-gray-400">
              <th class="w-40 border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">発生日時</th>
              <td class="px-3 py-2" colspan="3">{{ formatOccurredAt(ticket.occurred_at, ticket.occurred_date) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">会社名</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.company_name) }}</td>
              <th class="w-32 border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">営業所名</th>
              <td class="px-3 py-2">{{ displayValue(ticket.office_name) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">運行課</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.department) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">当事者名</th>
              <td class="px-3 py-2">{{ displayValue(ticket.person_name) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">登録番号</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.registration_number) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">車検満了日</th>
              <td class="px-3 py-2">
                <template v-if="carInspectionMatch">
                  {{ formatExpiry(carInspectionMatch.validPeriodExpirdate) }}
                  （{{ carInspectionMatch.carName || '-' }} / {{ carInspectionMatch.ownerName || '-' }}）
                </template>
                <template v-else>-</template>
              </td>
            </tr>
            <tr>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">発生場所</th>
              <td class="px-3 py-2" colspan="3">{{ displayValue(ticket.location) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6">
          <div class="mb-1 text-sm font-medium">内容</div>
          <div class="min-h-24 whitespace-pre-wrap border border-gray-400 p-3 text-sm">{{ displayValue(ticket.description) }}</div>
        </div>

        <div class="mt-6">
          <div class="mb-1 text-sm font-medium">進捗状況</div>
          <div class="border border-gray-400 p-3 text-sm">{{ displayValue(ticket.progress_notes) }}</div>
        </div>
      </section>

      <!-- ============ 詳細情報 ============ -->
      <section class="print-sheet px-10 py-10">
        <div class="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 class="text-xl font-bold tracking-wide">詳細情報</h2>
          <div class="text-right text-xs text-gray-600">No.{{ ticket.ticket_no }}（{{ ticket.category }}）</div>
        </div>

        <table class="mt-4 w-full border-collapse text-sm">
          <tbody>
            <tr class="border-t border-b border-gray-400">
              <th class="w-40 border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">損害額</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ money(ticket.damage_amount) }}</td>
              <th class="w-32 border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">賠償額</th>
              <td class="px-3 py-2">{{ money(ticket.compensation_amount) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">ロードサービス費用</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ money(ticket.road_service_cost) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">手当等</th>
              <td class="px-3 py-2">{{ displayValue(ticket.allowance) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">相手</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.counterparty) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">相手保険会社</th>
              <td class="px-3 py-2">{{ displayValue(ticket.counterparty_insurance) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">確認書</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.confirmation_notice) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">対応期限</th>
              <td class="px-3 py-2">{{ ymd(ticket.due_date) }}</td>
            </tr>
            <tr class="border-b border-gray-400">
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">処分検討内容</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ displayValue(ticket.disciplinary_content) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">処分内容</th>
              <td class="px-3 py-2">{{ displayValue(ticket.disciplinary_action) }}</td>
            </tr>
            <tr>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">作成日</th>
              <td class="border-r border-gray-400 px-3 py-2">{{ ymd(ticket.created_at) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">更新日</th>
              <td class="px-3 py-2">{{ ymd(ticket.updated_at) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- 状況管理 (タスク) -->
        <div class="mt-8">
          <h3 class="mb-2 border-b border-black pb-1 text-base font-semibold">状況管理</h3>
          <p v-if="tasks.length === 0" class="text-sm text-gray-500">状況管理項目はありません</p>
          <table v-else class="w-full border-collapse text-xs">
            <thead>
              <tr class="border-b-2 border-black">
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">種別</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">タイトル / 内容</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">発生日</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">期限</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">次のアクション</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">対応者</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">状況</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tasks" :key="t.id" class="break-inside-avoid">
                <td class="border border-gray-400 px-2 py-1 align-top">{{ t.task_type }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">
                  <div class="font-medium">{{ t.title }}</div>
                  <div v-if="t.description" class="text-gray-600">{{ t.description }}</div>
                  <div v-if="t.next_action_detail" class="text-gray-600">次回詳細: {{ t.next_action_detail }}</div>
                </td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ ymd(t.occurred_at) }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ ymd(t.due_date) }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ displayValue(t.next_action) }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ displayValue(t.next_action_by) }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ taskStatusLabel(t.status) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ステータス履歴 -->
        <div class="mt-8">
          <h3 class="mb-2 border-b border-black pb-1 text-base font-semibold">ステータス履歴</h3>
          <p v-if="statusHistory.length === 0" class="text-sm text-gray-500">履歴はありません</p>
          <table v-else class="w-full border-collapse text-xs">
            <thead>
              <tr class="border-b-2 border-black">
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">日時</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">変更</th>
                <th class="border border-gray-400 px-2 py-1 text-left font-medium">コメント</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in statusHistory" :key="h.id" class="break-inside-avoid">
                <td class="border border-gray-400 px-2 py-1 align-top whitespace-nowrap">{{ new Date(h.created_at).toLocaleString('ja-JP') }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ stateLabel(h.from_state_id) }} → {{ stateLabel(h.to_state_id) }}</td>
                <td class="border border-gray-400 px-2 py-1 align-top">{{ h.comment || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
/* 印刷時の用紙設定。都度印刷 (Ctrl+P / 印刷ボタン) の度に同じページ割りを再現するため
   ページ区切りは要素の style/class 側 (break-after-page) にも重複指定してある。 */
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }
}
</style>
