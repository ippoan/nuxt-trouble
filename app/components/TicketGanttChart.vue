<script setup lang="ts">
import type { TroubleTask } from '~/types'
import { TASK_STATUS_LABELS } from '~/types'
import { getTasks } from '~/utils/api'

const props = defineProps<{
  ticketId: string
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

function statusProgress(status: string): number {
  switch (status) {
    case 'done': return 100
    case 'in_progress': return 50
    default: return 0
  }
}

async function renderGantt() {
  if (!chartRef.value || tasks.value.length === 0) return

  await import('frappe-gantt/dist/frappe-gantt.css')
  const { default: Gantt } = await import('frappe-gantt')

  const ganttTasks = tasks.value.map(task => ({
    id: task.id,
    name: task.title,
    start: toDateStr(task.created_at),
    end: task.due_date ? toDateStr(task.due_date) : toDateStr(task.created_at),
    progress: statusProgress(task.status),
    custom_class: `bar-${task.status}`,
  }))

  // Clear previous instance
  if (chartRef.value) {
    chartRef.value.innerHTML = ''
  }

  ganttInstance = new Gantt(chartRef.value, ganttTasks, {
    view_mode: viewMode.value,
    date_format: 'YYYY-MM-DD',
    language: 'ja',
    readonly: true,
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
      <h3 class="text-base font-semibold">ガントチャート</h3>
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
      <span v-for="(info, key) in TASK_STATUS_LABELS" :key="key" class="flex items-center gap-1">
        <span class="inline-block w-3 h-3 rounded" :style="{ backgroundColor: info.color }" />
        {{ info.label }}
      </span>
    </div>

    <div ref="chartRef" class="gantt-container overflow-x-auto" />
  </div>
</template>

<style>
.gantt-container .gantt {
  background: transparent;
}

/* Status colors */
.gantt .bar-wrapper.bar-open .bar-progress,
.gantt .bar-wrapper.bar-open .bar {
  fill: #9CA3AF;
}
.gantt .bar-wrapper.bar-in_progress .bar-progress,
.gantt .bar-wrapper.bar-in_progress .bar {
  fill: #3B82F6;
}
.gantt .bar-wrapper.bar-done .bar-progress,
.gantt .bar-wrapper.bar-done .bar {
  fill: #10B981;
}

/* Dark mode adjustments */
.dark .gantt .grid-header,
.dark .gantt .grid-background {
  fill: #1f2937;
}
.dark .gantt .lower-text,
.dark .gantt .upper-text {
  fill: #9CA3AF;
}
.dark .gantt .row-line,
.dark .gantt .tick {
  stroke: #374151;
}
.dark .gantt .today-highlight {
  fill: rgba(59, 130, 246, 0.1);
}
</style>
