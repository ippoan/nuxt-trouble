<script setup lang="ts">
import { useTaskStatuses } from '~/composables/useTaskStatuses'

const { load: loadTaskStatuses, waitingStatusKey } = useTaskStatuses()

onMounted(async () => {
  try {
    await loadTaskStatuses()
  } catch (e) {
    console.error('Failed to load task statuses:', e)
  }
  const key = waitingStatusKey.value || 'waiting'
  await navigateTo(`/tasks?status=${encodeURIComponent(key)}`, { replace: true })
})
</script>

<template>
  <div class="flex items-center justify-center py-16 text-gray-500">
    <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 mr-2" />
    待機一覧へ遷移中...
  </div>
</template>
