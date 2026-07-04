import type { TroubleCategory, TroubleOffice, TroubleProgressStatus, Employee } from '~/types'
import { TICKET_CATEGORIES } from '~/types'

export interface SelectOption {
  label: string
  value: string
}

export function buildCategoryOptions(categories: TroubleCategory[] | undefined): SelectOption[] {
  if (categories && categories.length > 0) {
    const dbNames = new Set(categories.map(c => c.name))
    const hardcoded = ([...TICKET_CATEGORIES] as string[]).filter(c => !dbNames.has(c))
    return [...categories.map(c => c.name), ...hardcoded].map(c => ({ label: c, value: c }))
  }
  return TICKET_CATEGORIES.map(c => ({ label: c, value: c as string }))
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
