import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MasterDataManager from '~/components/MasterDataManager.vue'

const stubs = {
  UInput: { template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />', props: ['modelValue', 'placeholder', 'size'] },
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'size', 'disabled', 'variant', 'color'],
    inheritAttrs: false,
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
    // After swap, B is first (sort_order 10), A is second (sort_order 20)
    expect(reorderEvents).toEqual([
      ['2', 10],
      ['1', 20],
    ])
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
    // After swap, B is first (sort_order 10), A is second (sort_order 20)
    expect(reorderEvents).toEqual([
      ['2', 10],
      ['1', 20],
    ])
  })

  it('moveUp on index 2 of 5-item list emits 5 sequential reorder events with swap reflected', async () => {
    // Reproduces issue #106: all items have sort_order 0 (ties).
    // The component must renumber the entire list to break ties.
    const sortedItems = [
      { id: 'a', name: '佐賀', sort_order: 0 },
      { id: 'b', name: '帯広', sort_order: 0 },
      { id: 'c', name: '本社', sort_order: 0 },
      { id: 'd', name: '諸富', sort_order: 0 },
      { id: 'e', name: '北九州', sort_order: 0 },
    ]
    const wrapper = mount(MasterDataManager, {
      props: { title: '営業所', items: sortedItems, loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    // Click "up" on item at index 2 ('本社')
    const upButton = listItems[2].findAll('button')[0]
    await upButton.trigger('click')
    const reorderEvents = wrapper.emitted('reorder')
    expect(reorderEvents).toBeTruthy()
    // New order: 佐賀(a), 本社(c), 帯広(b), 諸富(d), 北九州(e)
    expect(reorderEvents).toEqual([
      ['a', 10],
      ['c', 20],
      ['b', 30],
      ['d', 40],
      ['e', 50],
    ])
  })

  it('moveDown on index 2 of 5-item list emits 5 sequential reorder events with swap reflected', async () => {
    const sortedItems = [
      { id: 'a', name: '佐賀', sort_order: 0 },
      { id: 'b', name: '帯広', sort_order: 0 },
      { id: 'c', name: '本社', sort_order: 0 },
      { id: 'd', name: '諸富', sort_order: 0 },
      { id: 'e', name: '北九州', sort_order: 0 },
    ]
    const wrapper = mount(MasterDataManager, {
      props: { title: '営業所', items: sortedItems, loading: false },
      global: { stubs },
    })
    const listItems = wrapper.findAll('li')
    // Click "down" on item at index 2 ('本社')
    const downButton = listItems[2].findAll('button')[1]
    await downButton.trigger('click')
    const reorderEvents = wrapper.emitted('reorder')
    expect(reorderEvents).toBeTruthy()
    // New order: 佐賀(a), 帯広(b), 諸富(d), 本社(c), 北九州(e)
    expect(reorderEvents).toEqual([
      ['a', 10],
      ['b', 20],
      ['d', 30],
      ['c', 40],
      ['e', 50],
    ])
  })

  it('builtins are skipped when emitting reorder events (only db items get sort_order)', async () => {
    const sortedItems = [
      { id: '1', name: 'A', sort_order: 10 },
      { id: '2', name: 'B', sort_order: 20 },
    ]
    const wrapper = mount(MasterDataManager, {
      props: {
        title: 'テスト',
        items: sortedItems,
        builtinItems: ['X', 'Y'],
        loading: false,
      },
      global: { stubs },
    })
    // mergedItems: A(db,10), B(db,20), X(builtin,1000), Y(builtin,1001)
    const listItems = wrapper.findAll('li')
    // Move B up — swap A and B; builtins are unchanged
    const upButton = listItems[1].findAll('button')[0]
    await upButton.trigger('click')
    const reorderEvents = wrapper.emitted('reorder')
    expect(reorderEvents).toBeTruthy()
    // Only db items emit. New order: B(db), A(db), X(builtin skip), Y(builtin skip)
    expect(reorderEvents).toEqual([
      ['2', 10],
      ['1', 20],
    ])
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
