<script setup lang="ts">
const props = defineProps<{
  title: string
  items: Array<{ id: string; name: string; sort_order: number }>
  builtinItems?: string[]
  loading: boolean
}>()

const emit = defineEmits<{
  create: [name: string]
  delete: [id: string]
  reorder: [id: string, sort_order: number]
}>()

const newName = ref('')

function handleCreate() {
  const name = newName.value.trim()
  if (!name) return
  emit('create', name)
  newName.value = ''
}

const mergedItems = computed(() => {
  const builtins = (props.builtinItems || [])
    .filter(name => !props.items.some(item => item.name === name))
    .map((name, i) => ({
      id: '',
      name,
      sort_order: 1000 + i,
      isBuiltin: true,
    }))
  const dbItems = props.items.map(item => ({ ...item, isBuiltin: false }))
  return [...dbItems, ...builtins].sort((a, b) => a.sort_order - b.sort_order)
})

function moveUp(index: number) {
  const item = mergedItems.value[index]
  const prev = mergedItems.value[index - 1]
  if (!item || !prev || index === 0 || item.isBuiltin || !item.id) return
  if (prev.isBuiltin || !prev.id) return
  emit('reorder', item.id, prev.sort_order)
  emit('reorder', prev.id, item.sort_order)
}

function moveDown(index: number) {
  const item = mergedItems.value[index]
  const next = mergedItems.value[index + 1]
  if (!item || !next || index >= mergedItems.value.length - 1 || item.isBuiltin || !item.id) return
  if (next.isBuiltin || !next.id) return
  emit('reorder', item.id, next.sort_order)
  emit('reorder', next.id, item.sort_order)
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

    <div v-else-if="mergedItems.length === 0" class="text-sm text-gray-500">
      データがありません
    </div>

    <ul v-else class="divide-y divide-gray-200 dark:divide-gray-800">
      <li
        v-for="(item, index) in mergedItems"
        :key="item.id || item.name"
        class="flex items-center justify-between py-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm">{{ item.name }}</span>
          <UBadge v-if="item.isBuiltin" size="xs" variant="subtle" color="neutral">既定</UBadge>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-up"
            variant="ghost"
            size="xs"
            :disabled="index === 0 || item.isBuiltin"
            @click="moveUp(index)"
          />
          <UButton
            icon="i-lucide-chevron-down"
            variant="ghost"
            size="xs"
            :disabled="index >= mergedItems.length - 1 || item.isBuiltin"
            @click="moveDown(index)"
          />
          <UButton
            v-if="!item.isBuiltin"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            @click="emit('delete', item.id)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
