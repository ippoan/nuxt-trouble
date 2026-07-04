<script setup lang="ts">
import type { TroubleTicket, TroubleWorkflowState, TroubleTask, TroubleStatusHistory } from '~/types'
import { getTicket, getWorkflowStates, getTasks, getStatusHistory, updateTask } from '~/utils/api'
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

// 登録番号 (ナンバープレート) はデータ中に半角/全角スペースが混在することがあるため、
// 印刷表示時は除去する (user 指摘: 「登録番号 スペース除外」)。
function registrationNumber(v: string | null | undefined): string {
  if (v == null || v === '') return '-'
  return String(v).replace(/\s+/g, '')
}

function money(v: string | null | undefined): string {
  if (v == null || v === '') return '-'
  return `${Number(v).toLocaleString()}円`
}

// 状況管理を「改ページ」指定のある行の直前で複数のテーブルに分割する。
// 1つのテーブル内で行だけ改ページするより、テーブルそのものを分けたほうが
// 画面上でも別ページになることが分かりやすく、各テーブルが自分の thead を
// 持てる (印刷でページをまたいだ時に見出し行が繰り返されるのと同じ効果)。
const taskSegments = computed(() => {
  const segments: TroubleTask[][] = []
  let current: TroubleTask[] = []
  for (const t of tasks.value) {
    if (t.print_page_break_before && current.length > 0) {
      segments.push(current)
      current = []
    }
    current.push(t)
  }
  if (current.length > 0) segments.push(current)
  return segments
})

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

// 状況管理の任意の行の直前に手動で改ページを指定する。チケットのタスクデータ
// (trouble_tasks.print_page_break_before) としてサーバーに保存するため、
// どの端末・ブラウザから開いても同じページ割りで印刷できる。
const togglingBreakId = ref<string | null>(null)

async function toggleManualBreak(t: TroubleTask) {
  if (togglingBreakId.value) return
  togglingBreakId.value = t.id
  try {
    const updated = await updateTask(t.id, { print_page_break_before: !t.print_page_break_before })
    const idx = tasks.value.findIndex(x => x.id === t.id)
    if (idx >= 0) {
      const list = tasks.value.slice()
      list[idx] = updated
      tasks.value = list
    }
  } catch (e) {
    console.error('改ページ設定の保存に失敗:', e)
  } finally {
    togglingBreakId.value = null
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
  <div class="min-h-screen print:min-h-0 bg-gray-100 print:bg-white">
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

    <!-- 画面プレビューでも「鏡」「詳細情報」がそれぞれ1ページ分の紙として見えるよう、
         各 section を A4 相当のカードとして分けて表示する (印刷時は影/角丸/余白を消し、
         break-after-page によるページ区切りだけが残る)。 -->
    <div v-else class="px-4 py-6 print:p-0">
      <!-- ============ 鏡 (サマリー) ============ -->
      <section
        class="print-sheet mx-auto mb-8 min-h-[297mm] max-w-[210mm] rounded-lg bg-white px-10 py-10 text-black shadow-lg break-after-page print:mb-0 print:min-h-0 print:max-w-none print:rounded-none print:shadow-none"
        style="page-break-after: always;"
      >
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
              <td class="border-r border-gray-400 px-3 py-2">{{ registrationNumber(ticket.registration_number) }}</td>
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">車検満了日</th>
              <td class="px-3 py-2">
                <template v-if="carInspectionMatch">
                  <div>{{ formatExpiry(carInspectionMatch.validPeriodExpirdate) }}</div>
                  <div>（{{ carInspectionMatch.carName || '-' }} / {{ carInspectionMatch.ownerName || '-' }}）</div>
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

        <table class="mt-6 w-full border-collapse text-sm">
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
              <th class="border-r border-gray-400 bg-gray-50 px-3 py-2 text-left font-medium">賞罰委員会</th>
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
      </section>

      <!-- ============ 詳細情報 ============ -->
      <section
        class="print-sheet mx-auto min-h-[297mm] max-w-[210mm] rounded-lg bg-white px-10 py-10 text-black shadow-lg print:min-h-0 print:max-w-none print:rounded-none print:shadow-none"
      >
        <div class="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 class="text-xl font-bold tracking-wide">詳細情報</h2>
          <div class="text-right text-xs text-gray-600">No.{{ ticket.ticket_no }}（{{ ticket.category }}）</div>
        </div>

        <!-- 状況管理 (タスク) -->
        <div class="mt-8">
          <h3 class="mb-2 border-b border-black pb-1 text-base font-semibold">
            状況管理
          </h3>
          <p v-if="tasks.length === 0" class="text-sm text-gray-500">
            状況管理項目はありません
          </p>
          <template v-for="(segment, si) in taskSegments" :key="si">
            <div v-if="si > 0" class="print:hidden mt-4 mb-1 flex items-center gap-2 text-xs text-emerald-600">
              <UIcon name="i-lucide-scissors-line-dashed" class="size-3.5" />
              <span>ここから新しいページとして印刷されます</span>
            </div>
            <table
              class="w-full border-collapse text-xs"
              :class="si > 0 ? 'mt-4 print:mt-0' : ''"
              :style="si > 0 ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined"
            >
              <thead>
                <tr class="border-b-2 border-black">
                  <th class="border border-gray-400 px-2 py-1 text-left font-medium">種別</th>
                  <th class="border border-gray-400 px-2 py-1 text-left font-medium">タイトル / 内容</th>
                  <th class="border border-gray-400 px-2 py-1 text-left font-medium">日付</th>
                  <th class="border border-gray-400 px-2 py-1 text-left font-medium">対応者</th>
                  <th class="border border-gray-400 px-2 py-1 text-left font-medium">状況</th>
                  <th class="print:hidden border border-gray-400 px-2 py-1 text-left font-medium">改ページ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in segment" :key="t.id" class="break-inside-avoid">
                  <td class="border border-gray-400 px-2 py-1 align-top">{{ t.task_type }}</td>
                  <td class="border border-gray-400 px-2 py-1 align-top">
                    <div class="font-medium">{{ t.title }}</div>
                    <div v-if="t.description" class="text-gray-600">{{ t.description }}</div>
                    <div v-if="t.next_action_detail" class="text-gray-600">次回詳細: {{ t.next_action_detail }}</div>
                  </td>
                  <td class="border border-gray-400 px-2 py-1 align-top">{{ ymd(t.occurred_at) }}</td>
                  <td class="border border-gray-400 px-2 py-1 align-top">{{ displayValue(t.next_action_by) }}</td>
                  <td class="border border-gray-400 px-2 py-1 align-top">{{ taskStatusLabel(t.status) }}</td>
                  <td class="print:hidden border border-gray-400 px-2 py-1 align-top">
                    <UButton
                      :label="t.print_page_break_before ? '改ページ有' : '改ページ'"
                      icon="i-lucide-scissors-line-dashed"
                      size="xs"
                      :variant="t.print_page_break_before ? 'solid' : 'outline'"
                      :loading="togglingBreakId === t.id"
                      title="この行の前で改ページする (サーバーに保存され、どの端末で開いても同じ位置で改ページされます)"
                      @click="toggleManualBreak(t)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
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
   ページ区切りは要素の style/class 側 (break-after-page) にも重複指定してある。
   ダークモード時、鏡/詳細情報の実コンテンツ末尾より紙面が余ると @nuxt/ui の
   --ui-bg (ダークモードでは neutral-900 = ほぼ黒) が html/body の背景として
   透けて見え、印刷結果の余白部分が黒く出てしまう。print 時はライトモードの
   背景で強制的に上書きする。 */
@media print {
  @page {
    size: A4;
    margin: 15mm;
  }
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  :root, .dark {
    --ui-bg: #ffffff !important;
    --ui-bg-muted: #ffffff !important;
    --ui-bg-elevated: #ffffff !important;
    --ui-bg-accented: #ffffff !important;
    color-scheme: light !important;
  }
}
</style>
