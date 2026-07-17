import { getEmployees, createEmployee, updateEmployee, getIchibanEmployees } from '~/utils/api'
import type { Employee } from '~/types'

export interface IchibanSyncSummary {
  created: number
  updated: number
  skipped: number
}

// 一番星 [社員ﾏｽﾀ] → rust-alc-api employees の手動同期 (Refs #220)。
//
// upsert 規則:
// - 名前は 社員R、コードは 社員C を使う。社員R が空の行は同期対象外 (skipped)
// - code (=社員C) 一致 → 既存 row を維持 (UUID 不変)。name が違う時だけ update
// - code 不一致でも「name 一致 && 既存 code が空」なら code を付与する update
//   (手登録済みの同名担当者と重複させない)。既存 code が別値の行には触らない
//   (alc-app 側の NFC/コード連携を壊さないため)
// - どちらにも当たらなければ create
export function useIchibanSync() {
  const syncing = ref(false)
  const progress = ref({ done: 0, total: 0 })
  const error = ref<string | null>(null)
  const summary = ref<IchibanSyncSummary | null>(null)

  async function syncEmployees(): Promise<Employee[] | null> {
    if (syncing.value) return null
    syncing.value = true
    error.value = null
    summary.value = null
    progress.value = { done: 0, total: 0 }
    try {
      const ichiban = await getIchibanEmployees()
      const rows = ichiban.filter(r => r.employee_r.trim() !== '')
      const existing = await getEmployees()
      const byCode = new Map(existing.filter(e => e.code).map(e => [e.code as string, e]))
      const noCodeByName = new Map(existing.filter(e => !e.code).map(e => [e.name, e]))

      progress.value = { done: 0, total: rows.length }
      const result: IchibanSyncSummary = { created: 0, updated: 0, skipped: 0 }

      for (const row of rows) {
        const code = row.employee_code.trim()
        const name = row.employee_r.trim()
        const matched = byCode.get(code)
        if (matched) {
          if (matched.name !== name) {
            await updateEmployee(matched.id, { name, code })
            result.updated++
          } else {
            result.skipped++
          }
        } else {
          const sameName = noCodeByName.get(name)
          if (sameName) {
            await updateEmployee(sameName.id, { name, code })
            noCodeByName.delete(name)
            result.updated++
          } else {
            await createEmployee({ name, code })
            result.created++
          }
        }
        progress.value = { done: progress.value.done + 1, total: rows.length }
      }

      summary.value = result
      return await getEmployees()
    } catch (e) {
      // useDummySeed と同じ方針: error に格納して UI 側で表示する (rethrow しない)
      error.value = e instanceof Error ? e.message : '一番星からの同期に失敗しました'
      return null
    } finally {
      syncing.value = false
    }
  }

  return { syncing, progress, error, summary, syncEmployees }
}
