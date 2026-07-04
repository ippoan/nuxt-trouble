import { describe, it, expect } from 'vitest'
import {
  FIELD_METAS,
  resolveFieldLayout,
  groupFieldsBySection,
  widthColSpanClass,
} from '~/utils/ticketFieldLayout'

describe('resolveFieldLayout', () => {
  it('returns default meta values when layout is null', () => {
    const resolved = resolveFieldLayout(null)
    expect(resolved.length).toBe(FIELD_METAS.length)
    const category = resolved.find(f => f.key === 'category')!
    expect(category.visible).toBe(true)
    expect(category.width).toBe('full')
    expect(category.label).toBe('カテゴリ')
  })

  it('progress_notes is hidden by default', () => {
    const resolved = resolveFieldLayout(null)
    const progress = resolved.find(f => f.key === 'progress_notes')!
    expect(progress.visible).toBe(false)
  })

  it('applies tenant overrides (visible/width/sort_order/label)', () => {
    const resolved = resolveFieldLayout({
      settings: [
        { key: 'progress_notes', visible: true, width: 'full', sort_order: 5, label: '対応状況' },
      ],
    })
    const progress = resolved.find(f => f.key === 'progress_notes')!
    expect(progress.visible).toBe(true)
    expect(progress.width).toBe('full')
    expect(progress.sortOrder).toBe(5)
    expect(progress.label).toBe('対応状況')
  })

  it('leaves fields without an override at their defaults', () => {
    const resolved = resolveFieldLayout({
      settings: [
        { key: 'progress_notes', visible: true, width: 'full', sort_order: 5, label: null },
      ],
    })
    const title = resolved.find(f => f.key === 'title')!
    expect(title.visible).toBe(true)
    expect(title.width).toBe('full')
    expect(title.label).toBe('タイトル')
  })
})

describe('groupFieldsBySection', () => {
  it('excludes invisible fields and orders sections consistently', () => {
    const resolved = resolveFieldLayout(null)
    const groups = groupFieldsBySection(resolved)
    const sectionNames = groups.map(g => g.section)
    expect(sectionNames).toEqual(['基本情報', '関係者情報', '車両・場所', '進捗・手当', '金額', '相手方', '管理'])

    // progress_notes はデフォルト非表示なので「進捗・手当」には allowance だけが含まれる
    const progressSection = groups.find(g => g.section === '進捗・手当')!
    expect(progressSection.fields.map(f => f.key)).toEqual(['allowance'])
  })

  it('sorts fields within a section by sortOrder', () => {
    const resolved = resolveFieldLayout({
      settings: [
        { key: 'counterparty_insurance', visible: true, width: 'half', sort_order: 5, label: null },
        { key: 'counterparty', visible: true, width: 'half', sort_order: 15, label: null },
      ],
    })
    const groups = groupFieldsBySection(resolved)
    const section = groups.find(g => g.section === '相手方')!
    expect(section.fields.map(f => f.key)[0]).toBe('counterparty_insurance')
  })

  it('drops a section entirely when all its fields are hidden', () => {
    const resolved = resolveFieldLayout({
      settings: [
        { key: 'allowance', visible: false, width: 'full', sort_order: 20, label: null },
      ],
    })
    const groups = groupFieldsBySection(resolved)
    expect(groups.some(g => g.section === '進捗・手当')).toBe(false)
  })
})

describe('widthColSpanClass', () => {
  it('maps full/half/third to grid col-span classes', () => {
    expect(widthColSpanClass('full')).toBe('col-span-6')
    expect(widthColSpanClass('half')).toBe('col-span-6 md:col-span-3')
    expect(widthColSpanClass('third')).toBe('col-span-6 md:col-span-2')
  })
})
