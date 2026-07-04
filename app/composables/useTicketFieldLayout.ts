import { getFieldLayout, updateFieldLayout } from '~/utils/api'
import type { TroubleFieldLayout } from '~/types'

export function useTicketFieldLayout() {
  const fieldLayout = ref<TroubleFieldLayout | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchFieldLayout() {
    loading.value = true
    error.value = null
    try {
      fieldLayout.value = await getFieldLayout()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '取得に失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function saveFieldLayout(layout: TroubleFieldLayout) {
    saving.value = true
    error.value = null
    try {
      fieldLayout.value = await updateFieldLayout(layout)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存に失敗しました'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { fieldLayout, loading, saving, error, fetchFieldLayout, saveFieldLayout }
}
