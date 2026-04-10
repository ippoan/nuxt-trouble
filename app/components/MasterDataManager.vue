<script setup lang="ts">
defineProps<{
  title: string
  items: Array<{ id: string; name: string; sort_order: number }>
  loading: boolean
}>()

const emit = defineEmits<{
  create: [name: string]
  delete: [id: string]
}>()

const newName = ref('')

function handleCreate() {
  const name = newName.value.trim()
  if (!name) return
  emit('create', name)
  newName.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-base font-semibold">{{ title }}</h3>

    <div class="flex gap-2">
      <UInput
        v-model="newName"
        placeholder="名前を入力"
        size="sm"
        class="flex-1"
        @keyup.enter="handleCreate"
      />
      <UButton
        label="追加"
        icon="i-lucide-plus"
        size="sm"
        :disabled="!newName.trim()"
        @click="handleCreate"
      />
    </div>

    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <div v-else-if="items.length === 0" class="text-sm text-gray-500">
      データがありません
    </div>

    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="item in items"
        :key="item.id"
        class="flex items-center justify-between py-2"
      >
        <span class="text-sm">{{ item.name }}</span>
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          @click="emit('delete', item.id)"
        />
      </li>
    </ul>
  </div>
</template>
