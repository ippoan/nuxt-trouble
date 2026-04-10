<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus } from '~/types'
import { TICKET_CATEGORIES } from '~/types'
import {
  getCategories, createCategory, deleteCategory, updateCategorySortOrder,
  getOffices, createOffice, deleteOffice, updateOfficeSortOrder,
  getProgressStatuses, createProgressStatus, deleteProgressStatus, updateProgressStatusSortOrder,
} from '~/utils/api'

const activeTab = ref('categories')

const tabs = [
  { label: 'カテゴリ', value: 'categories' },
  { label: '営業所', value: 'offices' },
  { label: '進捗状況', value: 'progress' },
  { label: 'ワークフロー', value: 'workflow' },
]

// Categories
const categories = ref<TroubleCategory[]>([])
const categoriesLoading = ref(false)

async function fetchCategories() {
  categoriesLoading.value = true
  try {
    categories.value = await getCategories()
  } catch (e) {
    console.error('カテゴリ取得エラー:', e)
  } finally {
    categoriesLoading.value = false
  }
}

async function handleCreateCategory(name: string) {
  try {
    const created = await createCategory({ name })
    categories.value = [...categories.value, created]
  } catch (e) {
    console.error('カテゴリ作成エラー:', e)
  }
}

async function handleDeleteCategory(id: string) {
  try {
    await deleteCategory(id)
    categories.value = categories.value.filter(c => c.id !== id)
  } catch (e) {
    console.error('カテゴリ削除エラー:', e)
  }
}

async function handleReorderCategory(id: string, sortOrder: number) {
  try {
    const updated = await updateCategorySortOrder(id, sortOrder)
    const idx = categories.value.findIndex(c => c.id === id)
    if (idx >= 0) categories.value[idx] = updated
  } catch (e) {
    console.error('カテゴリ順序変更エラー:', e)
  }
}

// Offices
const offices = ref<TroubleOffice[]>([])
const officesLoading = ref(false)

async function fetchOffices() {
  officesLoading.value = true
  try {
    offices.value = await getOffices()
  } catch (e) {
    console.error('営業所取得エラー:', e)
  } finally {
    officesLoading.value = false
  }
}

async function handleCreateOffice(name: string) {
  try {
    const created = await createOffice({ name })
    offices.value = [...offices.value, created]
  } catch (e) {
    console.error('営業所作成エラー:', e)
  }
}

async function handleDeleteOffice(id: string) {
  try {
    await deleteOffice(id)
    offices.value = offices.value.filter(o => o.id !== id)
  } catch (e) {
    console.error('営業所削除エラー:', e)
  }
}

async function handleReorderOffice(id: string, sortOrder: number) {
  try {
    const updated = await updateOfficeSortOrder(id, sortOrder)
    const idx = offices.value.findIndex(o => o.id === id)
    if (idx >= 0) offices.value[idx] = updated
  } catch (e) {
    console.error('営業所順序変更エラー:', e)
  }
}

// Progress Statuses
const progressStatuses = ref<TroubleProgressStatus[]>([])
const progressLoading = ref(false)

async function fetchProgressStatuses() {
  progressLoading.value = true
  try {
    progressStatuses.value = await getProgressStatuses()
  } catch (e) {
    console.error('進捗状況取得エラー:', e)
  } finally {
    progressLoading.value = false
  }
}

async function handleCreateProgressStatus(name: string) {
  try {
    const created = await createProgressStatus({ name })
    progressStatuses.value = [...progressStatuses.value, created]
  } catch (e) {
    console.error('進捗状況作成エラー:', e)
  }
}

async function handleDeleteProgressStatus(id: string) {
  try {
    await deleteProgressStatus(id)
    progressStatuses.value = progressStatuses.value.filter(p => p.id !== id)
  } catch (e) {
    console.error('進捗状況削除エラー:', e)
  }
}

async function handleReorderProgressStatus(id: string, sortOrder: number) {
  try {
    const updated = await updateProgressStatusSortOrder(id, sortOrder)
    const idx = progressStatuses.value.findIndex(p => p.id === id)
    if (idx >= 0) progressStatuses.value[idx] = updated
  } catch (e) {
    console.error('進捗状況順序変更エラー:', e)
  }
}

onMounted(() => {
  fetchCategories()
  fetchOffices()
  fetchProgressStatuses()
})
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <h2 class="text-xl font-bold">設定</h2>

    <div class="flex gap-2 border-b border-gray-200 dark:border-gray-800">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="activeTab === tab.value
          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <UCard>
      <MasterDataManager
        v-if="activeTab === 'categories'"
        title="カテゴリ管理"
        :items="categories"
        :builtin-items="TICKET_CATEGORIES as unknown as string[]"
        :loading="categoriesLoading"
        @create="handleCreateCategory"
        @delete="handleDeleteCategory"
        @reorder="handleReorderCategory"
      />

      <MasterDataManager
        v-if="activeTab === 'offices'"
        title="営業所管理"
        :items="offices"
        :loading="officesLoading"
        @create="handleCreateOffice"
        @delete="handleDeleteOffice"
        @reorder="handleReorderOffice"
      />

      <MasterDataManager
        v-if="activeTab === 'progress'"
        title="進捗状況管理"
        :items="progressStatuses"
        :loading="progressLoading"
        @create="handleCreateProgressStatus"
        @delete="handleDeleteProgressStatus"
        @reorder="handleReorderProgressStatus"
      />

      <WorkflowManager v-if="activeTab === 'workflow'" />
    </UCard>
  </div>
</template>
