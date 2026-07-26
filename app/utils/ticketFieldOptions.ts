import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee } from '~/types'
import { TICKET_CATEGORIES } from '~/types'

export interface SelectOption {
  label: string
  value: string
}

/**
 * 独自項目 (builtin 以外の名前) が 1 件でも登録されているか。
 * true になったテナントには既定 (ハードコード) リストを表示しない —
 * 既定はマスタ未整備テナントの初期リストとしてのみ使う (Refs #225 ⑤)。
 * 既定を「リストへ追加」で順に DB 化している途中 (全項目が builtin 由来) は
 * まだ既定扱いで、残りの既定もマージして選択肢が欠けないようにする。
 */
export function hasCustomEntries(names: string[], builtins: readonly string[]): boolean {
  const b = new Set(builtins as string[])
  return names.some(n => !b.has(n))
}

export function buildCategoryOptions(categories: TroubleCategory[] | undefined): SelectOption[] {
  if (!categories || categories.length === 0) {
    return TICKET_CATEGORIES.map(c => ({ label: c, value: c as string }))
  }
  const names = categories.map(c => c.name)
  if (hasCustomEntries(names, TICKET_CATEGORIES)) {
    return names.map(c => ({ label: c, value: c }))
  }
  const dbNames = new Set(names)
  const rest = ([...TICKET_CATEGORIES] as string[]).filter(c => !dbNames.has(c))
  return [...names, ...rest].map(c => ({ label: c, value: c }))
}

export function buildOfficeOptions(offices: TroubleOffice[] | undefined): SelectOption[] {
  if (!offices || offices.length === 0) return []
  return offices.map(o => ({ label: o.name, value: o.name }))
}

export function buildProgressOptions(progressStatuses: TroubleProgressStatus[] | undefined): SelectOption[] {
  if (!progressStatuses || progressStatuses.length === 0) return []
  return progressStatuses.map(p => ({ label: p.name, value: p.name }))
}

export function buildEmployeeOptions(employees: Employee[] | undefined): SelectOption[] {
  if (!employees || employees.length === 0) return []
  return employees.map(e => ({
    label: e.code ? `${e.name} (${e.code})` : e.name,
    value: e.id,
  }))
}
