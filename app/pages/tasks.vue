<script setup lang="ts">
import type { TroubleTask, TroubleTaskType, Employee } from '~/types'
import { TASK_STATUS_LABELS, DEFAULT_TASK_TYPES } from '~/types'
import { listAllTasks, getTaskTypes, getEmployees, updateTask } from '~/utils/api'
import type { ListTasksQuery } from '~/utils/api'
import { useTaskStatuses } from '~/composables/useTaskStatuses'

const route = useRoute()
const { load: loadTaskStatuses, statuses: taskStatusList, byKey: taskStatusByKey, loaded: taskStatusesLoaded } = useTaskStatuses()

const items = ref<TroubleTask[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(50)
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const taskTypes = ref<TroubleTaskType[]>([])
const employees = ref<Employee[]>([])

// Filters
const statusFilter = ref<string>('')
const taskTypeFilter = ref<string>('')
const assignedToFilter = ref<string>('')
const qFilter = ref<string>('')
const dueFrom = ref<string>('')
const dueTo = ref<string>('')
const occurredFrom = ref<string>('')
const occurredTo = ref<string>('')

// Sort
const sortBy = ref<'created_at' | 'occurred_at' | 'due_date' | 'next_action_due' | 'status'>('created_at')
const sortDesc = ref<boolean>(true)

const STATUS_OPTIONS = computed<{ label: string; value: string }[]>(() => {
  const base = [{ label: 'すべて', value: '' }]
  if (taskStatusesLoaded.value && taskStatusList.value.length > 0) {
    return [...base, ...taskStatusList.value.map(s => ({ label: s.name, value: s.key }))]
  }
  return [
    ...base,
    ...Object.entries(TASK_STATUS_LABELS).map(([key, v]) => ({ label: v.label, value: key })),
  ]
})

// Inline edit dropdown on each table row: no "すべて" option, only real statuses.
const inlineStatusOptions = computed<{ label: string; value: string }[]>(() => {
  if (taskStatusesLoaded.value && taskStatusList.value.length > 0) {
    return taskStatusList.value.map(s => ({ label: s.name, value: s.key }))
  }
  return Object.entries(TASK_STATUS_LABELS).map(([key, v]) => ({ label: v.label, value: key }))
})

const statusSaving = ref<Record<string, boolean>>({})

async function handleStatusChange(task: TroubleTask, newStatus: string) {
  if (!newStatus || newStatus === task.status) return
  statusSaving.value = { ...statusSaving.value, [task.id]: true }
  const prev = task.status
  // Optimistic update
  task.status = newStatus
  try {
    const updated = await updateTask(task.id, { status: newStatus })
    const idx = items.value.findIndex(t => t.id === task.id)
    if (idx >= 0) items.value[idx] = updated
  } catch (e) {
    task.status = prev
    errorMessage.value = e instanceof Error ? e.message : 'ステータス更新に失敗しました'
  } finally {
    const next = { ...statusSaving.value }
    delete next[task.id]
    statusSaving.value = next
  }
}

const SORT_OPTIONS = [
  { label: '作成日', value: 'created_at' },
  { label: '発生日', value: 'occurred_at' },
  { label: '期限', value: 'due_date' },
  { label: '次回', value: 'next_action_due' },
  { label: 'ステータス', value: 'status' },
]

const taskTypeOptions = computed(() => {
  const names = new Set<string>()
  for (const t of taskTypes.value) names.add(t.name)
  for (const n of DEFAULT_TASK_TYPES) names.add(n)
  return [{ label: 'すべて', value: '' }, ...Array.from(names).map(name => ({ label: name, value: name }))]
})

const employeeOptions = computed(() => [
  { label: 'すべて', value: '' },
  ...employees.value.map(e => ({ label: e.name, value: e.id })),
])

const employeeMap = computed(() => {
  const m: Record<string, Employee> = {}
  for (const e of employees.value) m[e.id] = e
  return m
})

function employeeName(id: string | null | undefined): string {
  if (!id) return '-'
  return employeeMap.value[id]?.name || id
}

function formatYmd(v: string | null | undefined): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v).substring(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function load() {
  loading.value = true
  errorMessage.value = null
  try {
    const query: ListTasksQuery = {
      page: page.value,
      per_page: perPage.value,
      sort_by: sortBy.value,
      sort_desc: sortDesc.value,
    }
    if (statusFilter.value) query.status = statusFilter.value
    if (taskTypeFilter.value) query.task_type = taskTypeFilter.value
    if (assignedToFilter.value) query.assigned_to = assignedToFilter.value
    if (qFilter.value) query.q = qFilter.value
    if (dueFrom.value) query.due_from = dueFrom.value
    if (dueTo.value) query.due_to = dueTo.value
    if (occurredFrom.value) query.occurred_from = occurredFrom.value
    if (occurredTo.value) query.occurred_to = occurredTo.value

    const res = await listAllTasks(query)
    items.value = res.items
    total.value = res.total
    page.value = res.page
    perPage.value = res.per_page
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
    items.value = []
    total.value = 0
    console.error('Failed to load tasks:', e)
  } finally {
    loading.value = false
  }
}

async function loadMasters() {
  try {
    const [tt, emps] = await Promise.all([
      getTaskTypes().catch(() => [] as TroubleTaskType[]),
      getEmployees().catch(() => [] as Employee[]),
    ])
    taskTypes.value = tt
    employees.value = emps
  } catch (e) {
    console.error('Failed to load masters:', e)
  }
}

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(qFilter, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

watch([statusFilter, taskTypeFilter, assignedToFilter, dueFrom, dueTo, occurredFrom, occurredTo], () => {
  page.value = 1
  load()
})

watch([sortBy, sortDesc], () => {
  load()
})

watch(page, () => {
  load()
})

function toggleSortDir() {
  sortDesc.value = !sortDesc.value
}

function ticketHref(taskTicketId: string): string {
  return `/tickets/${taskTicketId}`
}

onMounted(async () => {
  // Preset status filter from ?status=<key>
  const routeStatus = route.query.status
  if (typeof routeStatus === 'string' && routeStatus) {
    statusFilter.value = routeStatus
  }
  await Promise.all([loadMasters(), loadTaskStatuses()])
  await load()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">状況管理 一覧</h2>
      <UButton label="再読み込み" icon="i-lucide-refresh-cw" variant="outline" size="sm" :loading="loading" @click="load" />
    </div>

    <!-- Filter bar -->
    <UCard>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <UFormField label="ステータス">
          <USelect v-model="statusFilter" :items="STATUS_OPTIONS" size="sm" />
        </UFormField>
        <UFormField label="状況タイプ">
          <USelect v-model="taskTypeFilter" :items="taskTypeOptions" size="sm" />
        </UFormField>
        <UFormField label="担当者">
          <USelect v-model="assignedToFilter" :items="employeeOptions" size="sm" />
        </UFormField>
        <UFormField label="検索 (題名/詳細)">
          <UInput v-model="qFilter" placeholder="キーワード" size="sm" />
        </UFormField>
        <UFormField label="期限 (から)">
          <UInput v-model="dueFrom" type="date" size="sm" />
        </UFormField>
        <UFormField label="期限 (まで)">
          <UInput v-model="dueTo" type="date" size="sm" />
        </UFormField>
        <UFormField label="発生日 (から)">
          <UInput v-model="occurredFrom" type="date" size="sm" />
        </UFormField>
        <UFormField label="発生日 (まで)">
          <UInput v-model="occurredTo" type="date" size="sm" />
        </UFormField>
        <UFormField label="並び">
          <div class="flex gap-2">
            <USelect v-model="sortBy" :items="SORT_OPTIONS" size="sm" class="flex-1" />
            <UButton
              :icon="sortDesc ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up'"
              :label="sortDesc ? '降順' : '昇順'"
              variant="outline"
              size="sm"
              @click="toggleSortDir"
            />
          </div>
        </UFormField>
      </div>
    </UCard>

    <!-- Table -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 text-gray-400" />
      </div>

      <div v-else-if="errorMessage" class="py-8 text-center text-red-500">
        {{ errorMessage }}
      </div>

      <div v-else-if="items.length === 0" class="py-8 text-center text-gray-400">
        該当する状況がありません
      </div>

      <div v-else class="overflow-x-auto">
        <table class="text-sm w-full whitespace-nowrap">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-2 font-medium">チケット</th>
              <th class="text-left py-2 px-2 font-medium">種類</th>
              <th class="text-left py-2 px-2 font-medium">題名</th>
              <th class="text-left py-2 px-2 font-medium">内容</th>
              <th class="text-left py-2 px-2 font-medium">担当</th>
              <th class="text-left py-2 px-2 font-medium">発生日</th>
              <th class="text-left py-2 px-2 font-medium">期限</th>
              <th class="text-left py-2 px-2 font-medium">次のアクション</th>
              <th class="text-left py-2 px-2 font-medium">次の対応者</th>
              <th class="text-left py-2 px-2 font-medium">次回</th>
              <th class="text-left py-2 px-2 font-medium">ステータス</th>
              <th class="text-left py-2 px-2 font-medium">作成日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in items"
              :key="task.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td class="py-2 px-2">
                <NuxtLink
                  :to="ticketHref(task.ticket_id)"
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 dark:text-blue-400 underline"
                >
                  {{ task.ticket_id.substring(0, 8) }}
                </NuxtLink>
              </td>
              <td class="py-2 px-2">{{ task.task_type }}</td>
              <td class="py-2 px-2 max-w-[200px] truncate">{{ task.title }}</td>
              <td class="py-2 px-2 max-w-[300px] truncate">{{ task.description || '-' }}</td>
              <td class="py-2 px-2">{{ employeeName(task.assigned_to) }}</td>
              <td class="py-2 px-2">{{ formatYmd(task.occurred_at) }}</td>
              <td class="py-2 px-2">{{ formatYmd(task.due_date) }}</td>
              <td class="py-2 px-2 max-w-[200px] truncate">{{ task.next_action || '-' }}</td>
              <td class="py-2 px-2">{{ employeeName(task.next_action_by) }}</td>
              <td class="py-2 px-2">{{ formatYmd(task.next_action_due) }}</td>
              <td class="py-2 px-2">
                <USelect
                  :model-value="task.status"
                  :items="inlineStatusOptions"
                  size="xs"
                  class="min-w-[6rem]"
                  :disabled="statusSaving[task.id]"
                  data-testid="task-status-select"
                  @update:model-value="(v: string) => handleStatusChange(task, v)"
                />
              </td>
              <td class="py-2 px-2">{{ formatYmd(task.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Pagination -->
    <div v-if="total > perPage" class="flex justify-center">
      <UPagination v-model="page" :total="total" :items-per-page="perPage" />
    </div>
  </div>
</template>
