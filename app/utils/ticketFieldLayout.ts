import type { TroubleFieldLayout } from '~/types'

export type FieldWidth = 'full' | 'half' | 'third'
export type FieldType = 'text' | 'textarea' | 'select' | 'number' | 'date' | 'datetime' | 'person'

export interface FieldMeta {
  key: string
  label: string
  section: string
  type: FieldType
  defaultWidth: FieldWidth
  defaultVisible: boolean
  defaultSortOrder: number
}

export interface ResolvedField extends FieldMeta {
  visible: boolean
  width: FieldWidth
  sortOrder: number
}

export const FIELD_SECTIONS = ['基本情報', '関係者情報', '車両・場所', '進捗・手当', '金額', '相手方', '管理'] as const

export const FIELD_METAS: FieldMeta[] = [
  { key: 'category', label: 'カテゴリ', section: '基本情報', type: 'select', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'title', label: 'タイトル', section: '基本情報', type: 'text', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 20 },
  { key: 'description', label: '説明', section: '基本情報', type: 'textarea', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 30 },
  { key: 'occurred_at', label: '発生日時', section: '基本情報', type: 'datetime', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 40 },

  { key: 'company_name', label: '会社名', section: '関係者情報', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'office_name', label: '営業所名', section: '関係者情報', type: 'select', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 20 },
  { key: 'department', label: '部署名', section: '関係者情報', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 30 },
  { key: 'person_name', label: '氏名', section: '関係者情報', type: 'person', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 40 },

  { key: 'registration_number', label: '登録番号', section: '車両・場所', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'location', label: '場所', section: '車両・場所', type: 'text', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 20 },

  { key: 'progress_notes', label: '進捗状況', section: '進捗・手当', type: 'select', defaultWidth: 'half', defaultVisible: false, defaultSortOrder: 10 },
  { key: 'allowance', label: '手当等', section: '進捗・手当', type: 'text', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 20 },

  { key: 'damage_amount', label: '損害額', section: '金額', type: 'number', defaultWidth: 'third', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'compensation_amount', label: '補償額', section: '金額', type: 'number', defaultWidth: 'third', defaultVisible: true, defaultSortOrder: 20 },
  { key: 'road_service_cost', label: 'ロードサービス費用', section: '金額', type: 'number', defaultWidth: 'third', defaultVisible: true, defaultSortOrder: 30 },

  { key: 'counterparty', label: '相手方', section: '相手方', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'counterparty_insurance', label: '相手方保険', section: '相手方', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 20 },
  { key: 'counterparty_vehicle', label: '相手方車両', section: '相手方', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 30 },

  { key: 'disciplinary_content', label: '処分検討内容', section: '管理', type: 'textarea', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 10 },
  { key: 'disciplinary_action', label: '処分内容', section: '管理', type: 'textarea', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 20 },
  { key: 'confirmation_notice', label: '確認書', section: '管理', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 30 },
  { key: 'disciplinary_committee', label: '賞罰委員会', section: '管理', type: 'text', defaultWidth: 'half', defaultVisible: true, defaultSortOrder: 40 },
  { key: 'due_date', label: '対応期限', section: '管理', type: 'date', defaultWidth: 'full', defaultVisible: true, defaultSortOrder: 50 },
]

export function resolveFieldLayout(layout: TroubleFieldLayout | null | undefined): ResolvedField[] {
  const overrides = new Map((layout?.settings ?? []).map(e => [e.key, e]))
  return FIELD_METAS.map((meta) => {
    const o = overrides.get(meta.key)
    return {
      ...meta,
      label: o?.label ?? meta.label,
      visible: o?.visible ?? meta.defaultVisible,
      width: (o?.width as FieldWidth) ?? meta.defaultWidth,
      sortOrder: o?.sort_order ?? meta.defaultSortOrder,
    }
  })
}

export interface FieldSectionGroup {
  section: string
  fields: ResolvedField[]
}

export function groupFieldsBySection(fields: ResolvedField[]): FieldSectionGroup[] {
  const bySection = new Map<string, ResolvedField[]>()
  for (const f of fields) {
    if (!f.visible) continue
    if (!bySection.has(f.section)) bySection.set(f.section, [])
    bySection.get(f.section)!.push(f)
  }
  for (const arr of bySection.values()) arr.sort((a, b) => a.sortOrder - b.sortOrder)
  return FIELD_SECTIONS.filter(s => bySection.has(s)).map(section => ({
    section,
    fields: bySection.get(section)!,
  }))
}

export function widthColSpanClass(width: FieldWidth): string {
  switch (width) {
    case 'full': return 'col-span-6'
    case 'third': return 'col-span-6 md:col-span-2'
    case 'half':
    default: return 'col-span-6 md:col-span-3'
  }
}
