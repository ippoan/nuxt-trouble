<script setup lang="ts">
const { username, clearAuth } = useAuth()
const route = useRoute()
const _darkMode = ref(false)
let _colorMode: { value: string; preference: string } | null = null
try {
  _colorMode = useColorMode()
  _darkMode.value = _colorMode.value === 'dark'
} catch { /* test environment */ }

const isDark = computed({
  get: () => _colorMode ? _colorMode.value === 'dark' : _darkMode.value,
  set: (v) => {
    if (_colorMode) _colorMode.preference = v ? 'dark' : 'light'
    _darkMode.value = v
  },
})

const navigation: { label: string; icon: string; to: string; target?: string; description: string }[] = [
  {
    label: 'チケット一覧',
    icon: 'i-lucide-list',
    to: '/tickets',
    description: 'すべてのトラブルチケットを一覧表示・編集・新規作成',
  },
  {
    label: 'ステータス管理',
    icon: 'i-lucide-kanban',
    to: '/tickets/situations',
    target: '_blank',
    description: 'ワークフロー状態別 (未着手/対応中/完了など) のカンバン表示',
  },
  {
    label: '待機一覧',
    icon: 'i-lucide-clock',
    to: '/tickets/waiting',
    target: '_blank',
    description: '進捗状況が「待機」のチケットのみ抽出',
  },
  {
    label: '状況管理',
    icon: 'i-lucide-list-checks',
    to: '/tasks',
    target: '_blank',
    description: '全チケット横断の状況 (サブタスク) 一覧、フィルタ・並び替え可',
  },
  {
    label: '設定',
    icon: 'i-lucide-settings',
    to: '/settings',
    description: 'カテゴリ / 営業所 / ワークフロー / 通知などのマスタ管理',
  },
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
        <UTooltip
          v-for="item in navigation"
          :key="item.to"
          :text="item.description"
          :content="{ side: 'right', sideOffset: 12 }"
          :delay-duration="150"
          :ui="{ content: 'max-w-md text-lg px-5 py-3 leading-relaxed font-medium ring-2 ring-blue-500 dark:ring-blue-400 shadow-xl' }"
        >
          <NuxtLink
            :to="item.to"
            :target="item.target"
            :rel="item.target ? 'noopener' : undefined"
            :title="item.description"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
            :class="!item.target && route.path.startsWith(item.to)
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            <UIcon :name="item.icon" class="size-5" />
            {{ item.label }}
          </NuxtLink>
        </UTooltip>
      </nav>

      <!-- Dark mode toggle + User -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between mb-3">
          <span class="text-xs text-gray-500 dark:text-gray-400">ダークモード</span>
          <USwitch v-model="isDark" size="xs" />
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
