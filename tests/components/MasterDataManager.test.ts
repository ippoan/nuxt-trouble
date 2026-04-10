import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MasterDataManager from '~/components/MasterDataManager.vue'

const stubs = {
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'size', 'disabled', 'variant', 'color'],
  },
  UBadge: {
    template: '<span class="badge"><slot /></span>',
    props: ['size', 'variant', 'color'],
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

  it('shows empty state when no items and no builtins', () => {
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
    // Find delete buttons (the ones with trash icon, which are the last button in each row)
    const listItems = wrapper.findAll('li')
    const deleteBtn = listItems[0].findAll('button').pop()!
    await deleteBtn.trigger('click')
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
    const buttons = wrapper.findAll('button')
    const addButton = buttons.find(b => b.text().includes('追加'))
    await addButton!.trigger('click')
    expect(wrapper.emitted('create')).toBeTruthy()
    expect(wrapper.emitted('create')![0]).toEqual(['新カテゴリ'])
  })

  // --- Builtin items ---

  it('shows builtin items with badge', () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: [], builtinItems: ['苦情', '事故'], loading: false },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('苦情')
    expect(wrapper.text()).toContain('事故')
    expect(wrapper.text()).toContain('既定')
  })

  it('deduplicates builtin items that exist in DB', () => {
    const wrapper = mount(MasterDataManager, {
      props: {
        title: 'テスト',
        items: [{ id: '1', name: '苦情', sort_order: 1 }],
        builtinItems: ['苦情', '事故'],
        loading: false,
      },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    expect(listItems.length).toBe(2) // '苦情' (DB) + '事故' (builtin)
    // The DB item '苦情' should not have the badge
    const badges = listItems[0].findAll('.badge')
    expect(badges.length).toBe(0)
  })

  it('does not show delete button for builtin items', () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: [], builtinItems: ['苦情'], loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    expect(listItems.length).toBe(1)
    // Builtin item should have up/down buttons but no delete
    const buttons = listItems[0].findAll('button')
    // Up + Down only (no delete for builtin)
    expect(buttons.length).toBe(2)
  })

  // --- Reorder ---

  it('emits reorder events on moveUp', async () => {
    const sortedItems = [
      { id: '1', name: 'A', sort_order: 1 },
      { id: '2', name: 'B', sort_order: 2 },
    ]
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: sortedItems, loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    // Click "up" on second item (index 1)
    const upButton = listItems[1].findAll('button')[0]
    await upButton.trigger('click')
    const reorderEvents = wrapper.emitted('reorder')
    expect(reorderEvents).toBeTruthy()
    expect(reorderEvents!.length).toBeGreaterThanOrEqual(2)
    // Should contain the swap pair
    const pairs = reorderEvents!.map(e => e)
    expect(pairs).toContainEqual(['2', 1])
    expect(pairs).toContainEqual(['1', 2])
  })

  it('emits reorder events on moveDown', async () => {
    const sortedItems = [
      { id: '1', name: 'A', sort_order: 1 },
      { id: '2', name: 'B', sort_order: 2 },
    ]
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: sortedItems, loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    // Click "down" on first item (index 0)
    const downButton = listItems[0].findAll('button')[1]
    await downButton.trigger('click')
    const reorderEvents = wrapper.emitted('reorder')
    expect(reorderEvents).toBeTruthy()
    expect(reorderEvents!.length).toBeGreaterThanOrEqual(2)
    const pairs = reorderEvents!.map(e => e)
    expect(pairs).toContainEqual(['1', 2])
    expect(pairs).toContainEqual(['2', 1])
  })

  it('does not emit reorder for first item moveUp', async () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: [{ id: '1', name: 'A', sort_order: 1 }], loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    const upButton = listItems[0].findAll('button')[0]
    await upButton.trigger('click')
    expect(wrapper.emitted('reorder')).toBeFalsy()
  })

  it('does not emit reorder for last item moveDown', async () => {
    const wrapper = mount(MasterDataManager, {
      props: { title: 'テスト', items: [{ id: '1', name: 'A', sort_order: 1 }], loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    const downButton = listItems[0].findAll('button')[1]
    await downButton.trigger('click')
    expect(wrapper.emitted('reorder')).toBeFalsy()
  })

  it('does not emit reorder for builtin items', async () => {
    const wrapper = mount(MasterDataManager, {
      props: {
        title: 'テスト',
        items: [{ id: '1', name: 'A', sort_order: 1 }],
        builtinItems: ['B'],
        loading: false,
      },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    // 'A' is at index 0, 'B' (builtin, sort_order 1000) is at index 1
    // Try to move 'A' down — next item is builtin, should not emit
    const downButton = listItems[0].findAll('button')[1]
    await downButton.trigger('click')
    expect(wrapper.emitted('reorder')).toBeFalsy()
  })

  it('does not reorder when moveUp target is builtin', async () => {
    const wrapper = mount(MasterDataManager, {
      props: {
        title: 'テスト',
        items: [{ id: '1', name: 'A', sort_order: 1001 }],
        builtinItems: ['B'],
        loading: false,
      },
      global: { stubs },
    })
    // 'B' (builtin, sort_order 1000) is at index 0, 'A' (sort_order 1001) is at index 1
    const listItems = wrapper.findAll('li')
    // Try to move 'A' up — prev item is builtin
    const upButton = listItems[1].findAll('button')[0]
    await upButton.trigger('click')
    expect(wrapper.emitted('reorder')).toBeFalsy()
  })
})
