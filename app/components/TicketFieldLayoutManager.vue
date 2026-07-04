<script setup lang="ts">
import { FIELD_METAS, resolveFieldLayout, type FieldWidth } from '~/utils/ticketFieldLayout'
import type { TroubleFieldLayout, TroubleFieldLayoutEntry } from '~/types'

const props = defineProps<{
  fieldLayout: TroubleFieldLayout | null
  loading: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (e: 'save', layout: TroubleFieldLayout): void
}>()

interface Row {
  key: string
  defaultLabel: string
  section: string
  label: string
  visible: boolean
  width: FieldWidth
  sortOrder: number
}

const rows = ref<Row[]>([])

function rebuildRows() {
  const resolved = resolveFieldLayout(props.fieldLayout)
  rows.value = resolved.map(f => ({
    key: f.key,
    defaultLabel: FIELD_METAS.find(m => m.key === f.key)!.label,
    section: f.section,
    label: f.label,
    visible: f.visible,
    width: f.width,
    sortOrder: f.sortOrder,
  }))
}

watch(() => props.fieldLayout, rebuildRows, { immediate: true })

const widthOptions = [
  { label: '全幅', value: 'full' },
  { label: '半分', value: 'half' },
  { label: '1/3', value: 'third' },
]

function resortRows() {
  const sectionOrder = [...new Set(rows.value.map(r => r.section))]
  rows.value = [...rows.value].sort((a, b) => {
    if (a.section !== b.section) {
      return sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section)
    }
    return a.sortOrder - b.sortOrder
  })
}

function moveUp(index: number) {
  const row = rows.value[index]
  if (!row) return
  for (let i = index - 1; i >= 0; i--) {
    const other = rows.value[i]
    if (other && other.section === row.section) {
      const tmp = other.sortOrder
      other.sortOrder = row.sortOrder
      row.sortOrder = tmp
      resortRows()
      return
    }
  }
}

function moveDown(index: number) {
  const row = rows.value[index]
  if (!row) return
  for (let i = index + 1; i < rows.value.length; i++) {
    const other = rows.value[i]
    if (other && other.section === row.section) {
      const tmp = other.sortOrder
      other.sortOrder = row.sortOrder
      row.sortOrder = tmp
      resortRows()
      return
    }
  }
}

function handleSave() {
  const settings: TroubleFieldLayoutEntry[] = rows.value.map(r => ({
    key: r.key,
    visible: r.visible,
    width: r.width,
    sort_order: r.sortOrder,
    label: r.label.trim() && r.label.trim() !== r.defaultLabel ? r.label.trim() : null,
  }))
  emit('save', { settings })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-bold">チケット入力フォームの表示設定</h3>
      <UButton label="保存" :loading="saving" @click="handleSave" />
    </div>

    <p class="text-xs text-gray-500 dark:text-gray-400">
      各項目の表示ラベル・表示/非表示・幅・並び順をテナント単位で設定できます。
      「表示ラベル」を空にするとデフォルトの項目名に戻ります。
    </p>

    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700 text-left">
            <th class="py-2 pr-2">項目</th>
            <th class="py-2 pr-2">表示ラベル</th>
            <th class="py-2 pr-2">表示</th>
            <th class="py-2 pr-2">幅</th>
            <th class="py-2 pr-2">順序</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(row, index) in rows" :key="row.key">
            <tr v-if="index === 0 || rows[index - 1]?.section !== row.section">
              <td colspan="5" class="pt-4 pb-1 text-xs font-semibold text-gray-500">
                {{ row.section }}
              </td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-1.5 pr-2 text-gray-500 whitespace-nowrap">{{ row.defaultLabel }}</td>
              <td class="py-1.5 pr-2">
                <UInput v-model="row.label" size="sm" :placeholder="row.defaultLabel" class="w-32" />
              </td>
              <td class="py-1.5 pr-2">
                <input v-model="row.visible" type="checkbox" class="rounded">
              </td>
              <td class="py-1.5 pr-2">
                <USelect v-model="row.width" :items="widthOptions" size="sm" class="w-24" />
              </td>
              <td class="py-1.5 pr-2 whitespace-nowrap">
                <UButton icon="i-lucide-chevron-up" variant="ghost" size="xs" @click="moveUp(index)" />
                <UButton icon="i-lucide-chevron-down" variant="ghost" size="xs" @click="moveDown(index)" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
