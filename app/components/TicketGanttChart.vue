<script setup lang="ts">
import type { TroubleTask } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import { getTasks } from '~/utils/api'
import { useTaskStatuses } from '~/composables/useTaskStatuses'

const { load: loadTaskStatuses, statuses: taskStatusList, loaded: taskStatusesLoaded } = useTaskStatuses()
loadTaskStatuses()

const legendEntries = computed<{ key: string; label: string; color: string }[]>(() => {
  if (taskStatusesLoaded.value && taskStatusList.value.length > 0) {
    return taskStatusList.value.map(s => ({ key: s.key, label: s.name, color: s.color }))
  }
  return Object.entries(TASK_STATUS_LABELS).map(([key, v]) => ({ key, label: v.label, color: v.color }))
})

const props = defineProps<{
  ticketId: string
}>()

const emit = defineEmits<{
  taskClick: [taskId: string]
}>()

const tasks = ref<TroubleTask[]>([])
const loading = ref(false)
const chartRef = ref<HTMLElement | null>(null)
const viewMode = ref<'Day' | 'Week' | 'Month'>('Day')
let ganttInstance: any = null

async function loadTasks() {
  loading.value = true
  try {
    tasks.value = await getTasks(props.ticketId)
  } catch (e) {
    console.error('Failed to load tasks for gantt:', e)
  } finally {
    loading.value = false
  }
}

function toDateStr(iso: string): string {
  return iso.slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function statusProgress(status: string): number {
  switch (status) {
    case 'done': return 100
    case 'in_progress': return 50
    default: return 0
  }
}

async function renderGantt() {
  if (!chartRef.value || tasks.value.length === 0) return

  await import('~/assets/css/frappe-gantt.css')
  const { default: Gantt } = await import('frappe-gantt')

  const ganttTasks = tasks.value.map(task => {
    const start = toDateStr(task.created_at)
    const rawEnd = task.due_date ? toDateStr(task.due_date) : addDays(start, 1)
    const end = rawEnd <= start ? addDays(start, 1) : rawEnd
    return {
      id: task.id,
      name: task.title,
      start,
      end,
      progress: statusProgress(task.status),
      custom_class: `status-${task.status}`,
    }
  })

  // Clear previous instance
  if (chartRef.value) {
    chartRef.value.innerHTML = ''
  }

  console.log('[GanttChart] tasks:', JSON.stringify(ganttTasks, null, 2))

  ganttInstance = new Gantt(chartRef.value, ganttTasks, {
    view_mode: viewMode.value,
    date_format: 'YYYY-MM-DD',
    language: 'ja',
    bar_height: 30,
    bar_corner_radius: 4,
    padding: 18,
    on_click: (task: { id: string }) => {
      emit('taskClick', task.id)
    },
  })
}

function setViewMode(mode: 'Day' | 'Week' | 'Month') {
  viewMode.value = mode
  if (ganttInstance) {
    ganttInstance.change_view_mode(mode)
  }
}

onMounted(async () => {
  await loadTasks()
  await nextTick()
  renderGantt()
})

watch(() => props.ticketId, async () => {
  await loadTasks()
  await nextTick()
  renderGantt()
})
</script>

<template>
  <div v-if="!loading && tasks.length > 0">
    <div class="flex items-center justify-between mb-3">
      <div class="flex gap-1">
        <UButton
          v-for="mode in (['Day', 'Week', 'Month'] as const)"
          :key="mode"
          :label="mode"
          size="xs"
          :variant="viewMode === mode ? 'solid' : 'outline'"
          @click="setViewMode(mode)"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="flex gap-3 mb-2 text-xs text-gray-500">
      <span v-for="entry in legendEntries" :key="entry.key" class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded" :style="{ backgroundColor: entry.color }" />
        {{ entry.label }}
      </span>
    </div>

    <div ref="chartRef" class="gantt-wrapper" />
  </div>
</template>

<style>
/* Override frappe-gantt container height to fill parent */
.gantt-wrapper .gantt-container {
  height: auto !important;
  min-height: 200px;
}

/* Ensure popup is not clipped by overflow */
.gantt-wrapper .gantt-container .popup-wrapper {
  z-index: 9999;
}

.gantt-wrapper .gantt {
  background: transparent;
}

/* Status colors — custom_class applied to bar-wrapper <g> */
.status-open .bar-progress,
.status-open .bar {
  fill: #9CA3AF !important;
}
.status-in_progress .bar-progress,
.status-in_progress .bar {
  fill: #3B82F6 !important;
}
.status-done .bar-progress,
.status-done .bar {
  fill: #10B981 !important;
}

/* Ensure bar labels are visible */
.gantt .bar-label {
  fill: #fff !important;
  font-size: 12px;
}

/* Dark mode — frappe-gantt uses html[data-theme=dark] but Nuxt uses html.dark */
html.dark {
  --g-bar-color: #374151;
  --g-bar-border: #4b5563;
  --g-progress-color: #4b5563;
  --g-header-background: #111827;
  --g-row-color: #1f2937;
  --g-row-border-color: #374151;
  --g-tick-color: #1f2937;
  --g-tick-color-thick: #374151;
  --g-border-color: #374151;
  --g-text-dark: #e5e7eb;
  --g-text-muted: #9ca3af;
  --g-text-light: #fff;
  --g-actions-background: #374151;
  --g-today-highlight: #6b7280;
  --g-weekend-highlight-color: #111827;
  --g-arrow-color: #9ca3af;
  --g-handle-color: #9ca3af;
}
</style>
