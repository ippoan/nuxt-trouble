import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YmdInput from '~/components/YmdInput.vue'

const stubs = {
  UIcon: { template: '<span />' },
  UPopover: { template: '<div><slot /></div>', props: ['open'] },
  UCalendar: { template: '<div />', props: ['modelValue'] },
  UButton: { template: '<button />', props: ['label', 'size', 'variant'] },
}

function lastEmitted(wrapper: ReturnType<typeof mount>): unknown {
  const events = wrapper.emitted('update:modelValue')
  return events ? events[events.length - 1]![0] : undefined
}

describe('YmdInput', () => {
  it('emits date on Enter after all fields are entered', async () => {
    const wrapper = mount(YmdInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('2026')
    await inputs[1]!.setValue('7')
    await inputs[2]!.setValue('5')
    // YmdInput は blur / Enter で確定 (入力途中では emit しない)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.find('div').trigger('keydown.enter')
    expect(lastEmitted(wrapper)).toBe('2026-07-05')
  })

  it('accepts full-width digits and converts them to half-width (Refs #225 ②)', async () => {
    const wrapper = mount(YmdInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('２０２６')
    await inputs[1]!.setValue('０７')
    await inputs[2]!.setValue('２６')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('2026')
    await wrapper.find('div').trigger('keydown.enter')
    expect(lastEmitted(wrapper)).toBe('2026-07-26')
  })

  it('ignores input events while IME composition is in progress', async () => {
    const wrapper = mount(YmdInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    const yearEl = inputs[0]!.element as HTMLInputElement

    yearEl.value = '２０２６'
    await inputs[0]!.trigger('input', { isComposing: true })
    // 変換中は取り込まない (state は空のまま → Enter しても emit undefined)
    await wrapper.find('div').trigger('keydown.enter')
    expect(lastEmitted(wrapper)).toBeUndefined()

    await inputs[0]!.trigger('compositionend')
    expect(yearEl.value).toBe('2026')
  })

  it('parses modelValue back into fields', () => {
    const wrapper = mount(YmdInput, {
      props: { modelValue: '2026-07-26' },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('2026')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('07')
    expect((inputs[2]!.element as HTMLInputElement).value).toBe('26')
  })
})
