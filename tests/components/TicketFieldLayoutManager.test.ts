import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'
import TicketFieldLayoutManager from '~/components/TicketFieldLayoutManager.vue'

// nuxt-stubs.ts の UInput/USelect は modelValue/@update:model-value を実際の
// DOM 属性・イベントに反映しないため、v-model の挙動を検証できるようこのファイル
// だけローカルで拡張する。
const UInputWithModel = {
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'placeholder', 'size'],
  emits: ['update:modelValue'],
}
const USelectWithModel = {
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option v-for="opt in items" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>`,
  props: ['modelValue', 'items', 'size'],
  emits: ['update:modelValue'],
}
// allStubs の UButton は label prop をテキストに反映しないため、ボタンを
// テキストで特定できるようこのファイルだけローカルで拡張する。
const UButtonWithLabel = {
  template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
  props: ['label', 'icon', 'variant', 'color', 'size', 'block', 'to', 'loading', 'disabled'],
  emits: ['click'],
}

const stubs = { ...allStubs, UInput: UInputWithModel, USelect: USelectWithModel, UButton: UButtonWithLabel }

function mountManager(props: { fieldLayout?: unknown; loading?: boolean; saving?: boolean } = {}) {
  return mount(TicketFieldLayoutManager, {
    props: {
      fieldLayout: props.fieldLayout ?? null,
      loading: props.loading ?? false,
      saving: props.saving ?? false,
    },
    global: { stubs },
  })
}

describe('TicketFieldLayoutManager', () => {
  it('shows a loading spinner when loading', () => {
    const wrapper = mountManager({ loading: true })
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders section headers and default field labels', () => {
    const wrapper = mountManager()
    expect(wrapper.text()).toContain('基本情報')
    expect(wrapper.text()).toContain('相手方')
    expect(wrapper.text()).toContain('相手方車両')
  })

  it('emits save with default settings unchanged', () => {
    const wrapper = mountManager()
    wrapper.find('button[title], button').exists()
    const saveButton = wrapper.findAll('button').find(b => b.text().includes('保存'))!
    saveButton.trigger('click')
    const emitted = wrapper.emitted('save')
    expect(emitted).toBeTruthy()
    const layout = emitted![0][0] as { settings: Array<{ key: string; visible: boolean; width: string; sort_order: number; label: string | null }> }
    const title = layout.settings.find(s => s.key === 'title')!
    expect(title.visible).toBe(true)
    expect(title.width).toBe('full')
    expect(title.label).toBeNull()
  })

  it('moveDown swaps sort order within the same section and reflects in saved settings', async () => {
    const wrapper = mountManager()
    // 「関係者情報」セクションの最初の行 (company_name) の moveDown ボタンをクリック
    const rows = wrapper.findAll('tr')
    // company_name の行を探す (defaultLabel = 会社名)
    const companyRow = rows.find(r => r.text().includes('会社名'))!
    // moveUp/moveDown の2ボタンのうち後者 (down) をクリック
    const buttons = companyRow.findAll('button')
    await buttons[buttons.length - 1].trigger('click')

    const saveButton = wrapper.findAll('button').find(b => b.text().includes('保存'))!
    await saveButton.trigger('click')
    const emitted = wrapper.emitted('save')!
    const layout = emitted[0][0] as { settings: Array<{ key: string; sort_order: number }> }
    const company = layout.settings.find(s => s.key === 'company_name')!
    const office = layout.settings.find(s => s.key === 'office_name')!
    // moveDown により company_name の sort_order が office_name より大きくなる
    expect(company.sort_order).toBeGreaterThan(office.sort_order)
  })

  it('toggling visibility off is reflected in saved settings', async () => {
    const wrapper = mountManager()
    const rows = wrapper.findAll('tr')
    const allowanceRow = rows.find(r => r.text().includes('手当等'))!
    const checkbox = allowanceRow.find('input[type="checkbox"]')
    await checkbox.setValue(false)

    const saveButton = wrapper.findAll('button').find(b => b.text().includes('保存'))!
    await saveButton.trigger('click')
    const emitted = wrapper.emitted('save')!
    const layout = emitted[0][0] as { settings: Array<{ key: string; visible: boolean }> }
    const allowance = layout.settings.find(s => s.key === 'allowance')!
    expect(allowance.visible).toBe(false)
  })

  it('applies tenant overrides passed via fieldLayout prop', () => {
    const wrapper = mountManager({
      fieldLayout: {
        settings: [
          { key: 'progress_notes', visible: true, width: 'full', sort_order: 5, label: '対応状況' },
        ],
      },
    })
    const rows = wrapper.findAll('tr')
    // progress_notes の defaultLabel = 進捗状況、上書きラベルは input の value に反映される
    const progressRow = rows.find(r => r.text().includes('進捗状況'))!
    const labelInput = progressRow.find('input')
    expect((labelInput.element as HTMLInputElement).value).toBe('対応状況')
  })
})
