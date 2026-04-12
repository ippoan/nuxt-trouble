<script setup lang="ts">
const { username, clearAuth } = useAuth()
const route = useRoute()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (v) => { colorMode.preference = v ? 'dark' : 'light' },
})

const navigation = [
  { label: 'チケット一覧', icon: 'i-lucide-list', to: '/tickets' },
  { label: '設定', icon: 'i-lucide-settings', to: '/settings' },
]

function handleLogout() {
  clearAuth()
  navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-60 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 class="text-lg font-bold">トラブル管理</h1>
      </div>

      <nav class="flex-1 p-2">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
          :class="route.path.startsWith(item.to)
            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
        >
          <UIcon :name="item.icon" class="size-5" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- Dark mode toggle + User -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-gray-500 dark:text-gray-400">ダークモード</span>
          <UToggle v-model="isDark" size="xs" />
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">
          {{ username }}
        </div>
        <UButton
          label="ログアウト"
          icon="i-lucide-log-out"
          variant="ghost"
          size="sm"
          block
          @click="handleLogout"
        />
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
      <slot />
    </main>
  </div>
</template>
