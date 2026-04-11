<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, TroubleNotificationPref, LineworksMember } from '~/types'
import { TICKET_CATEGORIES, NOTIFICATION_EVENT_TYPES } from '~/types'
import {
  getCategories, createCategory, deleteCategory, updateCategorySortOrder,
  getOffices, createOffice, deleteOffice, updateOfficeSortOrder,
  getProgressStatuses, createProgressStatus, deleteProgressStatus, updateProgressStatusSortOrder,
  getNotificationPrefs, upsertNotificationPref, deleteNotificationPref, getLineworksMembers,
} from '~/utils/api'

const activeTab = ref('categories')

const tabs = [
  { label: 'カテゴリ', value: 'categories' },
  { label: '営業所', value: 'offices' },
  { label: '進捗状況', value: 'progress' },
  { label: 'ワークフロー', value: 'workflow' },
  { label: '通知', value: 'notifications' },
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

// Notification Prefs
const notifPrefs = ref<TroubleNotificationPref[]>([])
const notifMembers = ref<LineworksMember[]>([])
const notifLoading = ref(false)
const notifError = ref<string | null>(null)
const notifSaving = ref(false)
const showAddNotifModal = ref(false)
const newNotifPref = ref({
  event_type: '',
  lineworks_user_ids: [] as string[],
})

async function fetchNotifications() {
  notifLoading.value = true
  notifError.value = null
  try {
    const [p, m] = await Promise.all([
      getNotificationPrefs(),
      getLineworksMembers().catch(() => [] as LineworksMember[]),
    ])
    notifPrefs.value = p
    notifMembers.value = m
  } catch (e) {
    notifError.value = e instanceof Error ? e.message : '読み込みに失敗しました'
  } finally {
    notifLoading.value = false
  }
}

function notifMemberName(userId: string): string {
  const m = notifMembers.value.find(m => m.user_id === userId)
  return m?.user_name || m?.email || userId
}

function eventLabel(eventType: string): string {
  return NOTIFICATION_EVENT_TYPES.find(e => e.value === eventType)?.label || eventType
}

async function handleAddNotif() {
  if (!newNotifPref.value.event_type || newNotifPref.value.lineworks_user_ids.length === 0) return
  notifSaving.value = true
  notifError.value = null
  try {
    await upsertNotificationPref({
      event_type: newNotifPref.value.event_type,
      notify_channel: 'lineworks',
      enabled: true,
      lineworks_user_ids: newNotifPref.value.lineworks_user_ids,
    })
    showAddNotifModal.value = false
    newNotifPref.value = { event_type: '', lineworks_user_ids: [] }
    await fetchNotifications()
  } catch (e) {
    notifError.value = e instanceof Error ? e.message : '保存に失敗しました'
  } finally {
    notifSaving.value = false
  }
}

async function handleToggleNotif(pref: TroubleNotificationPref) {
  try {
    await upsertNotificationPref({
      event_type: pref.event_type,
      notify_channel: pref.notify_channel,
      enabled: !pref.enabled,
    })
    await fetchNotifications()
  } catch (e) {
    notifError.value = e instanceof Error ? e.message : '更新に失敗しました'
  }
}

async function handleDeleteNotif(pref: TroubleNotificationPref) {
  try {
    await deleteNotificationPref(pref.id)
    await fetchNotifications()
  } catch (e) {
    notifError.value = e instanceof Error ? e.message : '削除に失敗しました'
  }
}

const availableEventTypes = computed(() => {
  const configured = new Set(notifPrefs.value.map(p => p.event_type))
  return NOTIFICATION_EVENT_TYPES.filter(e => !configured.has(e.value))
})

const notifMemberOptions = computed(() =>
  notifMembers.value.map(m => ({
    label: m.user_name || m.email || m.user_id,
    value: m.user_id,
  }))
)

onMounted(() => {
  fetchCategories()
  fetchOffices()
  fetchProgressStatuses()
  fetchNotifications()
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

      <!-- Notifications tab -->
      <div v-if="activeTab === 'notifications'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold">通知設定</h3>
          <UButton
            label="追加"
            icon="i-lucide-plus"
            size="sm"
            :disabled="availableEventTypes.length === 0"
            @click="showAddNotifModal = true"
          />
        </div>

        <div v-if="notifError" class="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {{ notifError }}
        </div>

        <div v-if="notifLoading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
        </div>

        <template v-else>
          <div v-if="notifMembers.length === 0" class="p-4 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
            LINE WORKS Bot が未設定です。
            <a href="https://alc.ippoan.org" target="_blank" class="underline font-medium">管理画面</a>
            で Bot を設定してください。
          </div>

          <div v-if="notifPrefs.length === 0" class="text-center py-8 text-gray-500">
            通知設定がありません
          </div>

          <div v-for="pref in notifPrefs" :key="pref.id" class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ eventLabel(pref.event_type) }}</span>
                  <UBadge :color="pref.enabled ? 'success' : 'neutral'" variant="subtle">
                    {{ pref.enabled ? '有効' : '無効' }}
                  </UBadge>
                  <UBadge color="info" variant="subtle">LINE WORKS</UBadge>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  送信先: {{ pref.lineworks_user_ids.map(id => notifMemberName(id)).join(', ') || '-' }}
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  :icon="pref.enabled ? 'i-lucide-pause' : 'i-lucide-play'"
                  variant="ghost"
                  size="sm"
                  @click="handleToggleNotif(pref)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="sm"
                  @click="handleDeleteNotif(pref)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </UCard>

    <!-- Add notification modal -->
    <UModal v-model:open="showAddNotifModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">通知設定を追加</h3>

          <UFormField label="イベント種別">
            <USelect
              v-model="newNotifPref.event_type"
              :items="availableEventTypes.map(e => ({ label: e.label, value: e.value }))"
              placeholder="選択してください"
            />
          </UFormField>

          <UFormField label="送信先 (LINE WORKS メンバー)">
            <div class="space-y-2">
              <label
                v-for="m in notifMemberOptions"
                :key="m.value"
                class="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="m.value"
                  v-model="newNotifPref.lineworks_user_ids"
                  class="rounded border-gray-300"
                />
                {{ m.label }}
              </label>
              <p v-if="notifMemberOptions.length === 0" class="text-sm text-gray-400">
                メンバーが取得できません
              </p>
            </div>
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="キャンセル" variant="outline" @click="showAddNotifModal = false" />
            <UButton
              label="追加"
              :loading="notifSaving"
              :disabled="!newNotifPref.event_type || newNotifPref.lineworks_user_ids.length === 0"
              @click="handleAddNotif"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
