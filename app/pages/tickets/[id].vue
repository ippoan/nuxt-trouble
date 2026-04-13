<script setup lang="ts">
import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee, TroubleSchedule, LineworksMember } from '~/types'
import { getCategories, getOffices, getProgressStatuses, getEmployees, getTicketSchedules, createSchedule, cancelSchedule, getLineworksMembers, transitionTicket } from '~/utils/api'

const route = useRoute()
const ticketId = route.params.id as string

const {
  ticket, workflowStates, editing, saving, error,
  showDeleteModal, form, fields,
  displayValue, startEdit, handleSave, handleDelete, load,
} = useTicketDetail(ticketId)

const categories = ref<TroubleCategory[]>([])
const offices = ref<TroubleOffice[]>([])
const progressStatuses = ref<TroubleProgressStatus[]>([])
const employees = ref<Employee[]>([])

// --- Schedule notifications ---
const schedules = ref<TroubleSchedule[]>([])
const showScheduleModal = ref(false)
const scheduleForm = ref({
  scheduled_at: '',
  message: '',
  lineworks_user_ids: [] as string[],
})
const scheduleSaving = ref(false)
const scheduleMembers = ref<LineworksMember[]>([])

async function loadSchedules() {
  try {
    const [s, m] = await Promise.all([
      getTicketSchedules(ticketId),
      getLineworksMembers().catch(() => [] as LineworksMember[]),
    ])
    schedules.value = s
    scheduleMembers.value = m
  } catch { /* ignore */ }
}

async function handleCreateSchedule() {
  if (!scheduleForm.value.scheduled_at || !scheduleForm.value.message.trim()) return
  scheduleSaving.value = true
  try {
    await createSchedule({
      ticket_id: ticketId,
      scheduled_at: new Date(scheduleForm.value.scheduled_at).toISOString(),
      message: scheduleForm.value.message,
      lineworks_user_ids: scheduleForm.value.lineworks_user_ids,
    })
    showScheduleModal.value = false
    scheduleForm.value = { scheduled_at: '', message: '', lineworks_user_ids: [] }
    await loadSchedules()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'スケジュール作成に失敗しました'
  } finally {
    scheduleSaving.value = false
  }
}

async function handleCancelSchedule(id: string) {
  try {
    await cancelSchedule(id)
    await loadSchedules()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'キャンセルに失敗しました'
  }
}

// --- Task suggestion ---
const suggestedTransition = ref<{ toStateId: string; message: string } | null>(null)
const ganttKey = ref(0)
const showGantt = ref(false)

function handleGanttTaskClick(taskId: string) {
  showGantt.value = false
  nextTick(() => {
    const el = document.querySelector(`[data-task-id="${taskId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function handleTransitionSuggestion(toStateId: string, message: string) {
  suggestedTransition.value = { toStateId, message }
}

async function handleSuggestedTransition() {
  if (!suggestedTransition.value) return
  try {
    await transitionTicket(ticketId, {
      to_state_id: suggestedTransition.value.toStateId,
      comment: null,
    })
    suggestedTransition.value = null
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'ステータス変更に失敗しました'
  }
}

function scheduleMemberName(userId: string): string {
  const m = scheduleMembers.value.find(m => m.user_id === userId)
  return m?.user_name || m?.email || userId
}

onMounted(() => {
  load()
  loadSchedules()
  getCategories().then(r => categories.value = r).catch(() => {})
  getOffices().then(r => offices.value = r).catch(() => {})
  getProgressStatuses().then(r => progressStatuses.value = r).catch(() => {})
  getEmployees().then(r => employees.value = r).catch(() => {})
})
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <div v-if="!ticket && !error" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>

    <div v-else-if="error && !ticket" class="text-center py-12 space-y-4">
      <p class="text-red-600">{{ error }}</p>
      <UButton label="一覧に戻る" to="/tickets" variant="outline" />
    </div>

    <template v-else-if="ticket">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton icon="i-lucide-arrow-left" variant="ghost" to="/tickets" />
          <h2 class="text-xl font-bold">No.{{ ticket.ticket_no }}</h2>
          <TicketCategoryBadge :category="ticket.category" />
          <TicketStatusTransition
            v-if="ticket.status_id"
            :ticket-id="ticketId"
            :current-status-id="ticket.status_id"
            :workflow-states="workflowStates"
            @transitioned="load"
          />
        </div>
        <div class="flex gap-2">
          <template v-if="!editing">
            <UButton label="編集" icon="i-lucide-pencil" variant="outline" @click="startEdit" />
            <UButton label="削除" icon="i-lucide-trash-2" variant="outline" color="error" @click="showDeleteModal = true" />
          </template>
        </div>
      </div>

      <div v-if="error" class="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
        {{ error }}
      </div>

      <UCard v-if="editing">
        <TicketFormFields
          v-model="form"
          mode="edit"
          :categories="categories"
          :offices="offices"
          :progress-statuses="progressStatuses"
          :employees="employees"
        />
        <div class="flex justify-end gap-2 mt-6">
          <UButton label="キャンセル" variant="outline" @click="editing = false" />
          <UButton label="保存" :loading="saving" @click="handleSave" />
        </div>
      </UCard>

      <UCard v-else>
        <TicketCompactOverview :ticket="ticket" :workflow-states="workflowStates" />
      </UCard>

      <!-- Tasks -->
      <UCard>
        <TicketTaskList
          :ticket-id="ticketId"
          :workflow-states="workflowStates"
          :current-status-id="ticket.status_id"
          @suggest-transition="handleTransitionSuggestion"
          @tasks-changed="ganttKey++"
        />
        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <UButton icon="i-lucide-gantt-chart" size="xs" variant="outline" @click="showGantt = true; ganttKey++">
            ガントチャート
          </UButton>
        </div>
      </UCard>

      <!-- Gantt Chart Dialog -->
      <UModal v-model:open="showGantt" fullscreen>
        <template #content>
          <div class="p-6 h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold">ガントチャート</h2>
              <UButton icon="i-lucide-x" variant="ghost" size="sm" @click="showGantt = false" />
            </div>
            <div class="flex-1 overflow-auto">
              <ClientOnly>
                <TicketGanttChart :key="ganttKey" :ticket-id="ticketId" @task-click="handleGanttTaskClick" />
              </ClientOnly>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Task suggestion banner -->
      <div
        v-if="suggestedTransition"
        class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <span class="text-sm text-blue-700 dark:text-blue-300">{{ suggestedTransition.message }}</span>
        <div class="flex gap-2">
          <UButton label="変更する" size="xs" @click="handleSuggestedTransition" />
          <UButton label="閉じる" size="xs" variant="outline" @click="suggestedTransition = null" />
        </div>
      </div>

      <!-- Files -->
      <UCard>
        <TicketFiles :ticket-id="ticketId" />
      </UCard>

      <!-- Schedule notifications -->
      <UCard>
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold">スケジュール通知</h3>
          <UButton
            label="予約"
            icon="i-lucide-clock"
            size="sm"
            variant="outline"
            @click="showScheduleModal = true"
          />
        </div>

        <div v-if="schedules.length === 0" class="text-sm text-gray-500 text-center py-4">
          予約された通知はありません
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="s in schedules"
            :key="s.id"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-clock" class="size-4 text-gray-400" />
                <span class="text-sm font-medium">
                  {{ new Date(s.scheduled_at).toLocaleString('ja-JP') }}
                </span>
                <UBadge
                  :color="s.status === 'pending' ? 'warning' : s.status === 'sent' ? 'success' : 'error'"
                  variant="subtle"
                  size="xs"
                >
                  {{ s.status === 'pending' ? '予約中' : s.status === 'sent' ? '送信済' : s.status === 'cancelled' ? 'キャンセル' : '失敗' }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ s.message }}</p>
              <p class="text-xs text-gray-400">
                送信先: {{ s.lineworks_user_ids.map(id => scheduleMemberName(id)).join(', ') }}
              </p>
            </div>
            <UButton
              v-if="s.status === 'pending'"
              icon="i-lucide-x"
              variant="ghost"
              color="error"
              size="sm"
              @click="handleCancelSchedule(s.id)"
            />
          </div>
        </div>
      </UCard>
    </template>

    <!-- Schedule modal -->
    <UModal v-model:open="showScheduleModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">通知を予約</h3>

          <UFormField label="通知日時">
            <UInput
              v-model="scheduleForm.scheduled_at"
              type="datetime-local"
            />
          </UFormField>

          <UFormField label="メッセージ">
            <UTextarea
              v-model="scheduleForm.message"
              placeholder="通知メッセージを入力"
              :rows="3"
            />
          </UFormField>

          <UFormField label="送信先">
            <div class="space-y-2">
              <label
                v-for="m in scheduleMembers"
                :key="m.user_id"
                class="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  :value="m.user_id"
                  v-model="scheduleForm.lineworks_user_ids"
                  class="rounded border-gray-300"
                />
                {{ m.user_name || m.email || m.user_id }}
              </label>
              <p v-if="scheduleMembers.length === 0" class="text-sm text-gray-400">
                LINE WORKS メンバーが取得できません
              </p>
            </div>
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton label="キャンセル" variant="outline" @click="showScheduleModal = false" />
            <UButton
              label="予約"
              :loading="scheduleSaving"
              :disabled="!scheduleForm.scheduled_at || !scheduleForm.message.trim() || scheduleForm.lineworks_user_ids.length === 0"
              @click="handleCreateSchedule"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-bold">チケットを削除しますか？</h3>
          <p class="text-sm text-gray-500">
            No.{{ ticket?.ticket_no }} 「{{ ticket?.category }}」を削除します。
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
