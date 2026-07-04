import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'
import { makeTroubleTicket } from '../helpers/test-data'

// ----- Mocks -------------------------------------------------------------
const lookupMock = vi.fn()
const loadMock = vi.fn().mockResolvedValue(undefined)
const updateTicketMock = vi.fn()

vi.mock('~/composables/useCarInspections', () => ({
  useCarInspections: () => ({
    load: loadMock,
    lookupByRegistration: lookupMock,
    registrationOptions: { value: [] },
  }),
}))

vi.mock('~/utils/api', () => ({
  updateTicket: (...args: unknown[]) => updateTicketMock(...args),
}))

import TicketCompactOverview from '~/components/TicketCompactOverview.vue'

// nuxt-stubs.ts の UInput/UTextarea/USelect は modelValue/placeholder 等を実際の
// DOM 属性に反映しないため (props 宣言のみで fallthrough しない)、セレクタで要素を
// 拾えるようこのファイルだけローカルで属性を反映するスタブに差し替える。
// @blur は emits 宣言しないことで Vue の attribute fallthrough によりそのまま
// input/textarea 要素の native blur イベントへ伝播する。
const UInputWithAttrs = {
  template: '<input :value="modelValue" :placeholder="placeholder" :type="type || \'text\'" :data-loading="loading" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'placeholder', 'type', 'size', 'loading'],
  emits: ['update:modelValue'],
}
const UTextareaWithAttrs = {
  template: '<textarea :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'placeholder', 'rows'],
  emits: ['update:modelValue'],
}
const USelectWithOptions = {
  template: `<select :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
    <option v-for="opt in items" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>`,
  props: ['modelValue', 'items', 'placeholder', 'size'],
  emits: ['update:modelValue'],
}

const stubs = {
  ...allStubs,
  UInput: UInputWithAttrs,
  UTextarea: UTextareaWithAttrs,
  USelect: USelectWithOptions,
}
// TicketFormFields は実体をレンダリングしたいので stub を外す
delete (stubs as Record<string, unknown>).TicketFormFields

function mountOverview(opts: { ticket?: Parameters<typeof makeTroubleTicket>[0] } = {}) {
  return mount(TicketCompactOverview, {
    props: {
      ticket: makeTroubleTicket(opts.ticket),
      workflowStates: [],
      categories: [],
      offices: [{ id: 'o1', tenant_id: 't1', name: '本社営業所', sort_order: 1, created_at: '' }],
      progressStatuses: [],
      employees: [],
    },
    global: { stubs },
  })
}

async function expandDetail(wrapper: ReturnType<typeof mount>) {
  const toggle = wrapper.findAll('button').find(b => b.text().includes('詳細を表示'))
  expect(toggle).toBeTruthy()
  await toggle!.trigger('click')
  await flushPromises()
}

describe('TicketCompactOverview - inline auto-save form (展開表示)', () => {
  beforeEach(() => {
    lookupMock.mockReset()
    lookupMock.mockReturnValue(undefined)
    loadMock.mockClear()
    updateTicketMock.mockReset()
  })

  it('renders the same field groups as the create/edit form when expanded', async () => {
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    expect(wrapper.text()).toContain('基本情報')
    expect(wrapper.text()).toContain('関係者情報')
    expect(wrapper.text()).toContain('車両・場所')
    expect(wrapper.text()).toContain('金額')
    expect(wrapper.text()).toContain('相手方')
    expect(wrapper.text()).toContain('管理')
  })

  it('auto-saves title on blur', async () => {
    updateTicketMock.mockResolvedValue(makeTroubleTicket({ title: '新タイトル' }))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const titleInput = wrapper.find('input[placeholder="タイトル"]')
    await titleInput.setValue('新タイトル')
    await titleInput.trigger('blur')
    await flushPromises()

    expect(updateTicketMock).toHaveBeenCalledWith('ticket-1', { title: '新タイトル' })
    expect(wrapper.emitted('updated')).toBeTruthy()
  })

  it('auto-saves category immediately on select change', async () => {
    updateTicketMock.mockResolvedValue(makeTroubleTicket({ category: '対物事故(自損)' }))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const categorySelect = wrapper.findAll('select')[0]!
    await categorySelect.setValue('対物事故(自損)')
    await flushPromises()

    expect(updateTicketMock).toHaveBeenCalledWith('ticket-1', { category: '対物事故(自損)' })
  })

  it('auto-saves damage_amount as a number on blur', async () => {
    updateTicketMock.mockResolvedValue(makeTroubleTicket({ damage_amount: '20000' }))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const damageInput = wrapper.find('input[type="number"]')
    await damageInput.setValue('20000')
    await damageInput.trigger('blur')
    await flushPromises()

    expect(updateTicketMock).toHaveBeenCalledWith('ticket-1', { damage_amount: 20000 })
  })

  it('auto-saves due_date immediately when the date input resolves', async () => {
    const expectedIso = new Date('2026-03-01').toISOString()
    updateTicketMock.mockResolvedValue(makeTroubleTicket({ due_date: expectedIso }))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const dueDateInput = wrapper.find('input[data-ymd-input]')
    await dueDateInput.setValue('2026-03-01')
    await flushPromises()

    expect(updateTicketMock).toHaveBeenCalledWith('ticket-1', { due_date: expectedIso })
  })

  it('shows a loading spinner on the field being saved, and clears it once saved', async () => {
    vi.useFakeTimers()
    try {
      let resolveUpdate!: (v: ReturnType<typeof makeTroubleTicket>) => void
      updateTicketMock.mockImplementation(() => new Promise((resolve) => { resolveUpdate = resolve }))
      const wrapper = mountOverview()
      await flushPromises()
      await expandDetail(wrapper)

      const titleInput = wrapper.find('input[placeholder="タイトル"]')
      await titleInput.setValue('保存中タイトル')
      await titleInput.trigger('blur')
      await wrapper.vm.$nextTick()

      expect(titleInput.attributes('data-loading')).toBe('true')

      resolveUpdate(makeTroubleTicket({ title: '保存中タイトル' }))
      await flushPromises()

      // API 応答が一瞬で返ってもスピナーが点滅するだけで視認できないよう、
      // 最低表示時間 (0.5秒) が経過するまでは保存中のまま維持される。
      expect(titleInput.attributes('data-loading')).toBe('true')

      await vi.advanceTimersByTimeAsync(500)
      await flushPromises()

      expect(titleInput.attributes('data-loading')).toBe('false')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not drop a field commit made while another field is still saving', async () => {
    let resolveFirst!: (v: ReturnType<typeof makeTroubleTicket>) => void
    updateTicketMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    updateTicketMock.mockResolvedValueOnce(makeTroubleTicket({ damage_amount: '5000' }))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const titleInput = wrapper.find('input[placeholder="タイトル"]')
    await titleInput.setValue('タイトルA')
    await titleInput.trigger('blur') // 1件目の保存が pending のまま残る

    const damageInput = wrapper.find('input[type="number"]')
    await damageInput.setValue('5000')
    await damageInput.trigger('blur') // 1件目が保存中でも黙って握り潰されない
    await flushPromises()

    expect(updateTicketMock).toHaveBeenCalledTimes(2)
    expect(updateTicketMock).toHaveBeenNthCalledWith(2, 'ticket-1', { damage_amount: 5000 })

    resolveFirst(makeTroubleTicket({ title: 'タイトルA' }))
    await flushPromises()
  })

  it('shows an error message when saving fails', async () => {
    updateTicketMock.mockRejectedValue(new Error('保存に失敗しました'))
    const wrapper = mountOverview()
    await flushPromises()
    await expandDetail(wrapper)

    const titleInput = wrapper.find('input[placeholder="タイトル"]')
    await titleInput.setValue('失敗するタイトル')
    await titleInput.trigger('blur')
    await flushPromises()

    expect(wrapper.text()).toContain('保存に失敗しました')
    expect(wrapper.emitted('updated')).toBeFalsy()
  })
})
