import { getTaskStatuses } from '~/utils/api'
import { TASK_STATUS_LABELS } from '~/types'
import type { TroubleTaskStatus } from '~/types'

// module-level shared state (singleton across all composable calls in the app)
const _data = ref<TroubleTaskStatus[]>([])
const _loading = ref(false)
const _loaded = ref(false)

const _sorted = computed<TroubleTaskStatus[]>(() =>
  [..._data.value].sort((a, b) => a.sort_order - b.sort_order),
)

const _byKeyMap = computed(() => {
  const map = new Map<string, TroubleTaskStatus>()
  for (const s of _data.value) map.set(s.key, s)
  return map
})

const _waitingStatusKey = computed<string>(() => {
  const list = _sorted.value
  const byKey = list.find(s => s.key === 'waiting')
  if (byKey) return byKey.key
  const byName = list.find(s => s.name === '待機')
  if (byName) return byName.key
  return 'waiting'
})

export interface TaskStatusLabel {
  label: string
  color: string
  is_done?: boolean
}

export function useTaskStatuses() {
  async function load(force = false) {
    if (!force && (_loaded.value || _loading.value)) return
    _loading.value = true
    try {
      const list = await getTaskStatuses()
      _data.value = list || []
      _loaded.value = true
    } catch (e) {
      console.error('Failed to load task statuses:', e)
      _data.value = []
      _loaded.value = true
    } finally {
      _loading.value = false
    }
  }

  function byKey(key: string | null | undefined): TaskStatusLabel | undefined {
    if (!key) return undefined
    const s = _byKeyMap.value.get(key)
    if (s) return { label: s.name, color: s.color, is_done: s.is_done }
    const fb = TASK_STATUS_LABELS[key]
    if (fb) return { label: fb.label, color: fb.color, is_done: key === 'done' }
    return undefined
  }

  return {
    load,
    loading: _loading,
    loaded: _loaded,
    statuses: _sorted,
    data: _data,
    byKey,
    waitingStatusKey: _waitingStatusKey,
  }
}
