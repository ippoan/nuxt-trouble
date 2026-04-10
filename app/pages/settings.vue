<script setup lang="ts">
import type { TroubleCategory, TroubleOffice } from '~/types'
import {
  getCategories, createCategory, deleteCategory,
  getOffices, createOffice, deleteOffice,
} from '~/utils/api'

const activeTab = ref('categories')

const tabs = [
  { label: 'カテゴリ', value: 'categories' },
  { label: '営業所', value: 'offices' },
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

onMounted(() => {
  fetchCategories()
  fetchOffices()
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
        :loading="categoriesLoading"
        @create="handleCreateCategory"
        @delete="handleDeleteCategory"
      />

      <MasterDataManager
        v-if="activeTab === 'offices'"
        title="営業所管理"
        :items="offices"
        :loading="officesLoading"
        @create="handleCreateOffice"
        @delete="handleDeleteOffice"
      />

      <WorkflowManager v-if="activeTab === 'workflow'" />
    </UCard>
  </div>
</template>
