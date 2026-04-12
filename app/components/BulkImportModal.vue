<script setup lang="ts">
import { createTicket, getWorkflowStates, setupDefaultWorkflow } from '~/utils/api'
import type { CreateTroubleTicket } from '~/types'
import {
  parseTsv,
  buildColumnMappings,
  rowsToTickets,
  API_FIELD_OPTIONS,
} from '~/utils/excel-import'
import type { ColumnMapping } from '~/utils/excel-import'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ done: [] }>()

const step = ref<1 | 2 | 3>(1)

// Step 1
const rawText = ref('')

// Step 2
const columns = ref<ColumnMapping[]>([])
const rows = ref<string[][]>([])

// Step 3
const previewData = ref<{ ticket: Record<string, unknown>; warnings: string[]; selected: boolean }[]>([])
const importing = ref(false)
const importProgress = ref(0)
const importResults = ref<{ success: number; failed: { row: number; error: string }[] } | null>(null)

function reset() {
  step.value = 1
  rawText.value = ''
  columns.value = []
  rows.value = []
  previewData.value = []
  importing.value = false
  importProgress.value = 0
  importResults.value = null
}

// Debug
const debugInfo = ref('')

function handleParse() {
  const parsed = parseTsv(rawText.value)
  if (parsed.rows.length === 0) return
  rows.value = parsed.rows
  columns.value = buildColumnMappings(parsed.headers, parsed.rows[0] ?? [])

  const lines = [
    `=== TSV Parse Result ===`,
    `Headers (${parsed.headers.length}): ${JSON.stringify(parsed.headers)}`,
    `Rows: ${parsed.rows.length}`,
    ``,
    `=== Column Mappings ===`,
    ...columns.value.map((c, i) => `[${i}] "${c.excelHeader}" → ${c.apiField} (sample: "${c.sampleValue}")`),
    ``,
    `=== Raw Rows (first 3) ===`,
    ...parsed.rows.slice(0, 3).map((r, i) => `Row ${i}: ${JSON.stringify(r)}`),
  ]
  debugInfo.value = lines.join('\n')
  console.log(debugInfo.value)

  step.value = 2
}

function handlePreview() {
  const results = rowsToTickets(rows.value, columns.value)
  previewData.value = results.map(r => ({ ...r, selected: true }))

  const lines = [
    `=== Converted Tickets (first 3) ===`,
    ...results.slice(0, 3).map((r, i) => [
      `Ticket ${i}: ${JSON.stringify(r.ticket, null, 2)}`,
      r.warnings.length > 0 ? `  Warnings: ${r.warnings.join(', ')}` : '',
    ].filter(Boolean).join('\n')),
  ]
  debugInfo.value += '\n\n' + lines.join('\n')
  console.log(lines.join('\n'))

  step.value = 3
}

async function ensureWorkflow() {
  const states = await getWorkflowStates()
  if (states.length === 0) await setupDefaultWorkflow()
}

async function handleImport() {
  const selected = previewData.value.filter(r => r.selected)
  if (selected.length === 0) return

  importing.value = true
  importProgress.value = 0
  const results = { success: 0, failed: [] as { row: number; error: string }[] }

  try {
    await ensureWorkflow()
  } catch (e) {
    console.error('Workflow setup failed:', e)
  }

  for (let i = 0; i < selected.length; i++) {
    try {
      await createTicket(selected[i]!.ticket as unknown as CreateTroubleTicket)
      results.success++
    } catch (e) {
      results.failed.push({
        row: i + 1,
        error: e instanceof Error ? e.message : String(e),
      })
    }
    importProgress.value = i + 1
  }

  importResults.value = results
  importing.value = false

  if (results.success > 0) emit('done')
}

function close() {
  open.value = false
  reset()
}

watch(open, (v) => { if (v) reset() })

const selectedCount = computed(() => previewData.value.filter(r => r.selected).length)
const totalCount = computed(() => previewData.value.length)
const mappedFields = computed(() =>
  columns.value.filter(c => c.apiField !== '__skip__'),
)

async function copyDebug() {
  try {
    await navigator.clipboard.writeText(debugInfo.value)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = debugInfo.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-5xl' }">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">
            <template v-if="step === 1">一括登録 - 貼り付け</template>
            <template v-else-if="step === 2">一括登録 - ヘッダーマッピング</template>
            <template v-else>一括登録 - プレビュー</template>
          </h3>
          <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="close" />
        </div>

        <!-- Step 1: Paste -->
        <template v-if="step === 1">
          <p class="text-sm text-gray-500">
            Excelからコピーしたデータを貼り付けてください（ヘッダー行あり/なし両対応）
          </p>
          <textarea
            v-model="rawText"
            class="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Excelからコピーしたデータを Ctrl+V で貼り付け..."
          />
          <div class="flex justify-end gap-2">
            <UButton label="キャンセル" variant="outline" @click="close" />
            <UButton label="次へ" :disabled="!rawText.trim()" @click="handleParse" />
          </div>
        </template>

        <!-- Step 2: Header Mapping -->
        <template v-if="step === 2">
          <p class="text-sm text-gray-500">
            {{ rows.length }} 件のデータを検出。各列の対応フィールドを確認・変更してください。
          </p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="text-left py-2 px-2 font-medium w-40">Excelヘッダー</th>
                  <th class="text-left py-2 px-2 font-medium w-64">対応フィールド</th>
                  <th class="text-left py-2 px-2 font-medium">サンプル値</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(col, idx) in columns"
                  :key="idx"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="py-2 px-2 font-mono text-xs">{{ col.excelHeader }}</td>
                  <td class="py-2 px-2">
                    <USelect
                      v-model="col.apiField"
                      :items="API_FIELD_OPTIONS"
                      value-key="value"
                      label-key="label"
                      size="sm"
                    />
                  </td>
                  <td class="py-2 px-2 text-gray-500 text-xs truncate max-w-xs">
                    {{ col.sampleValue || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <details class="text-xs">
            <summary class="cursor-pointer text-gray-400 hover:text-gray-600">Debug</summary>
            <div class="mt-2 relative">
              <button class="absolute top-1 right-1 px-2 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600" @click="copyDebug">Copy</button>
              <pre class="p-2 bg-gray-900 text-green-400 rounded overflow-auto max-h-48 text-[10px]">{{ debugInfo }}</pre>
            </div>
          </details>

          <div class="flex justify-between">
            <UButton label="戻る" variant="outline" @click="step = 1" />
            <UButton label="プレビュー" @click="handlePreview" />
          </div>
        </template>

        <!-- Step 3: Preview & Import -->
        <template v-if="step === 3">
          <template v-if="importResults">
            <div class="space-y-3">
              <div
                v-if="importResults.success > 0"
                class="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg"
              >
                {{ importResults.success }} 件登録しました
              </div>
              <div
                v-if="importResults.failed.length > 0"
                class="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg space-y-1"
              >
                <p>{{ importResults.failed.length }} 件失敗:</p>
                <ul class="text-xs list-disc list-inside">
                  <li v-for="f in importResults.failed" :key="f.row">
                    行{{ f.row }}: {{ f.error }}
                  </li>
                </ul>
              </div>
              <div class="flex justify-end">
                <UButton label="閉じる" @click="close" />
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-gray-500">
              {{ selectedCount }} / {{ totalCount }} 件を登録します。チェックを外すと除外できます。
            </p>

            <div
              v-if="previewData.some(r => r.warnings.length > 0)"
              class="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs space-y-1"
            >
              <template v-for="(row, idx) in previewData" :key="idx">
                <p v-for="w in row.warnings" :key="w">{{ w }}</p>
              </template>
            </div>

            <div class="overflow-x-auto max-h-96">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-white dark:bg-gray-900">
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="py-2 px-1 w-8">
                      <input
                        type="checkbox"
                        :checked="selectedCount === totalCount"
                        @change="previewData.forEach(r => r.selected = ($event.target as HTMLInputElement).checked)"
                      >
                    </th>
                    <th class="text-left py-2 px-1">#</th>
                    <th
                      v-for="f in mappedFields"
                      :key="f.apiField"
                      class="text-left py-2 px-1 font-medium whitespace-nowrap"
                    >
                      {{ f.excelHeader }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(row, idx) in previewData"
                    :key="idx"
                    class="border-b border-gray-100 dark:border-gray-800"
                    :class="{ 'opacity-40': !row.selected }"
                  >
                    <td class="py-1 px-1">
                      <input v-model="row.selected" type="checkbox">
                    </td>
                    <td class="py-1 px-1 text-gray-400">{{ idx + 1 }}</td>
                    <td
                      v-for="f in mappedFields"
                      :key="f.apiField"
                      class="py-1 px-1 max-w-48 truncate"
                    >
                      {{ row.ticket[f.apiField] ?? '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="importing" class="space-y-2">
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-500 transition-all"
                  :style="{ width: `${(importProgress / selectedCount) * 100}%` }"
                />
              </div>
              <p class="text-xs text-gray-500 text-center">
                {{ importProgress }} / {{ selectedCount }} 件処理中...
              </p>
            </div>

            <details class="text-xs">
              <summary class="cursor-pointer text-gray-400 hover:text-gray-600">Debug</summary>
              <pre class="mt-2 p-2 bg-gray-900 text-green-400 rounded overflow-auto max-h-48 text-[10px]">{{ debugInfo }}</pre>
            </details>

            <div class="flex justify-between">
              <UButton label="戻る" variant="outline" :disabled="importing" @click="step = 2" />
              <UButton
                :label="`${selectedCount} 件を登録`"
                :disabled="importing || selectedCount === 0"
                :loading="importing"
                @click="handleImport"
              />
            </div>
          </template>
        </template>
      </div>
    </template>
  </UModal>
</template>
