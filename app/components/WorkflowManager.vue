<script setup lang="ts">
import type { TroubleWorkflowState, TroubleWorkflowTransition, CreateWorkflowState, CreateWorkflowTransition } from '~/types'
import {
  getWorkflowStates, getWorkflowTransitions,
  createWorkflowState, deleteWorkflowState,
  createWorkflowTransition, deleteWorkflowTransition,
  setupDefaultWorkflow,
} from '~/utils/api'

const states = ref<TroubleWorkflowState[]>([])
const transitions = ref<TroubleWorkflowTransition[]>([])
const loading = ref(false)

// Add state form
const newState = reactive({
  name: '',
  label: '',
  color: '#3b82f6',
  is_initial: false,
  is_terminal: false,
})

// Add transition form
const newTransition = reactive({
  from_state_id: '',
  to_state_id: '',
})

const stateOptions = computed(() =>
  states.value.map(s => ({ label: s.label, value: s.id })),
)

function stateLabelById(id: string): string {
  return states.value.find(s => s.id === id)?.label || '不明'
}

async function fetchData() {
  loading.value = true
  try {
    const [s, t] = await Promise.all([
      getWorkflowStates(),
      getWorkflowTransitions(),
    ])
    states.value = s
    transitions.value = t
  } catch (e) {
    console.error('ワークフロー取得エラー:', e)
  } finally {
    loading.value = false
  }
}

async function handleSetupDefaults() {
  try {
    states.value = await setupDefaultWorkflow()
    transitions.value = await getWorkflowTransitions()
  } catch (e) {
    console.error('デフォルト設定エラー:', e)
  }
}

async function handleCreateState() {
  if (!newState.name.trim() || !newState.label.trim()) return
  try {
    const data: CreateWorkflowState = {
      name: newState.name,
      label: newState.label,
      color: newState.color || null,
      sort_order: null,
      is_initial: newState.is_initial || null,
      is_terminal: newState.is_terminal || null,
    }
    const created = await createWorkflowState(data)
    states.value = [...states.value, created]
    newState.name = ''
    newState.label = ''
    newState.color = '#3b82f6'
    newState.is_initial = false
    newState.is_terminal = false
  } catch (e) {
    console.error('ステート作成エラー:', e)
  }
}

async function handleDeleteState(id: string) {
  try {
    await deleteWorkflowState(id)
    states.value = states.value.filter(s => s.id !== id)
    transitions.value = transitions.value.filter(
      t => t.from_state_id !== id && t.to_state_id !== id,
    )
  } catch (e) {
    console.error('ステート削除エラー:', e)
  }
}

async function handleCreateTransition() {
  if (!newTransition.from_state_id || !newTransition.to_state_id) return
  try {
    const data: CreateWorkflowTransition = {
      from_state_id: newTransition.from_state_id,
      to_state_id: newTransition.to_state_id,
      label: null,
    }
    const created = await createWorkflowTransition(data)
    transitions.value = [...transitions.value, created]
    newTransition.from_state_id = ''
    newTransition.to_state_id = ''
  } catch (e) {
    console.error('遷移作成エラー:', e)
  }
}

async function handleDeleteTransition(id: string) {
  try {
    await deleteWorkflowTransition(id)
    transitions.value = transitions.value.filter(t => t.id !== id)
  } catch (e) {
    console.error('遷移削除エラー:', e)
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="text-sm text-gray-500">読み込み中...</div>

    <template v-else>
      <!-- Setup defaults button -->
      <div v-if="states.length === 0" class="text-center py-4">
        <p class="text-sm text-gray-500 mb-3">ワークフローが設定されていません</p>
        <UButton label="デフォルトを設定" icon="i-lucide-zap" @click="handleSetupDefaults" />
      </div>

      <!-- States -->
      <div class="space-y-4">
        <h3 class="text-base font-semibold">ステート</h3>

        <ul v-if="states.length > 0" class="space-y-2">
          <li
            v-for="s in states"
            :key="s.id"
            class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-2">
              <span
                class="inline-block w-3 h-3 rounded-full"
                :style="{ backgroundColor: s.color }"
              />
              <span class="text-sm font-medium">{{ s.label }}</span>
              <UBadge v-if="s.is_initial" variant="subtle" size="xs">初期</UBadge>
              <UBadge v-if="s.is_terminal" variant="subtle" size="xs">終了</UBadge>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="handleDeleteState(s.id)"
            />
          </li>
        </ul>

        <div class="flex flex-wrap items-end gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <UInput v-model="newState.name" placeholder="名前 (英字)" size="sm" class="w-28" />
          <UInput v-model="newState.label" placeholder="ラベル" size="sm" class="w-28" />
          <UInput v-model="newState.color" type="color" size="sm" class="w-16" />
          <label class="flex items-center gap-1 text-xs">
            <input v-model="newState.is_initial" type="checkbox" class="rounded" />
            初期
          </label>
          <label class="flex items-center gap-1 text-xs">
            <input v-model="newState.is_terminal" type="checkbox" class="rounded" />
            終了
          </label>
          <UButton
            label="追加"
            icon="i-lucide-plus"
            size="sm"
            :disabled="!newState.name.trim() || !newState.label.trim()"
            @click="handleCreateState"
          />
        </div>
      </div>

      <!-- Transitions -->
      <div class="space-y-4">
        <h3 class="text-base font-semibold">遷移ルール</h3>

        <ul v-if="transitions.length > 0" class="space-y-2">
          <li
            v-for="t in transitions"
            :key="t.id"
            class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center gap-2 text-sm">
              <span>{{ stateLabelById(t.from_state_id) }}</span>
              <span class="text-gray-400">→</span>
              <span>{{ stateLabelById(t.to_state_id) }}</span>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="handleDeleteTransition(t.id)"
            />
          </li>
        </ul>

        <div v-else class="text-sm text-gray-500">遷移ルールがありません</div>

        <div v-if="states.length >= 2" class="flex flex-wrap items-end gap-2 p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <UFormField label="遷移元">
            <USelect
              v-model="newTransition.from_state_id"
              :items="stateOptions"
              placeholder="選択"
              size="sm"
            />
          </UFormField>
          <span class="text-gray-400 pb-1">→</span>
          <UFormField label="遷移先">
            <USelect
              v-model="newTransition.to_state_id"
              :items="stateOptions"
              placeholder="選択"
              size="sm"
            />
          </UFormField>
          <UButton
            label="追加"
            icon="i-lucide-plus"
            size="sm"
            :disabled="!newTransition.from_state_id || !newTransition.to_state_id"
            @click="handleCreateTransition"
          />
        </div>
      </div>
    </template>
  </div>
</template>
