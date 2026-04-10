import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MasterDataManager from '~/components/MasterDataManager.vue'

const stubs = {
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'size', 'disabled', 'variant', 'color'],
  },
}

describe('MasterDataManager', () => {
  const items = [
    { id: '1', name: '貨物事故', sort_order: 1 },
    { id: '2', name: '人身事故', sort_order: 2 },
  ]

  it('renders title and items', () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'カテゴリ管理', items, loading: false },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('カテゴリ管理')
    expect(wrapper.text()).toContain('貨物事故')
    expect(wrapper.text()).toContain('人身事故')
  })

  it('shows loading state', () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'カテゴリ管理', items: [], loading: true },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('読み込み中')
  })

  it('shows empty state', () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'カテゴリ管理', items: [], loading: false },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('データがありません')
  })

  it('emits delete event', async () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items, loading: false },
      global: { stubs },
    })
    const deleteButtons = wrapper.findAll('li button')
    await deleteButtons[0].trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual(['1'])
  })

  it('emits create event on button click', async () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: [], loading: false },
      global: { stubs },
    })
    const input = wrapper.find('input')
    await input.setValue('新カテゴリ')
    // Find the add button (the one with label "追加")
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find(b => b.text().includes('追加'))
    await addButton!.trigger('click')
    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')![0]).toEqual(['新カテゴリ'])
  })
})
