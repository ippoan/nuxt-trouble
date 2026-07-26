import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YmdtInput from '~/components/YmdtInput.vue'

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

describe('YmdtInput', () => {
  it('emits full datetime when all fields are entered', async () => {
    const wrapper = mount(YmdtInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('2026')
    await inputs[1]!.setValue('07')
    await inputs[2]!.setValue('26')
    await inputs[3]!.setValue('14')
    await inputs[4]!.setValue('30')
    expect(lastEmitted(wrapper)).toBe('2026-07-26T14:30')
  })

  it('emits date with 00:00 when hour/minute are left empty (Refs #225 ⑦)', async () => {
    // 以前は時分未入力だと日時全体が undefined になり「日付を入れたのに
    // 保存されない」不具合だった。年月日が揃えば 00:00 補完で確定する。
    const wrapper = mount(YmdtInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('2026')
    await inputs[1]!.setValue('07')
    await inputs[2]!.setValue('26')
    expect(lastEmitted(wrapper)).toBe('2026-07-26T00:00')
  })

  it('pads hour with 0 and fills minute with 00 when only hour is entered', async () => {
    const wrapper = mount(YmdtInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('2026')
    await inputs[1]!.setValue('7')
    await inputs[2]!.setValue('5')
    await inputs[3]!.setValue('9')
    expect(lastEmitted(wrapper)).toBe('2026-07-05T09:00')
  })

  it('emits undefined while year/month/day are incomplete', async () => {
    const wrapper = mount(YmdtInput, {
      props: { modelValue: undefined },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('2026')
    await inputs[1]!.setValue('07')
    expect(lastEmitted(wrapper)).toBeUndefined()
  })

  it('parses modelValue back into fields', () => {
    const wrapper = mount(YmdtInput, {
      props: { modelValue: '2026-07-26T14:30' },
      global: { stubs },
    })
    const inputs = wrapper.findAll('input')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('2026')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('07')
    expect((inputs[2]!.element as HTMLInputElement).value).toBe('26')
    expect((inputs[3]!.element as HTMLInputElement).value).toBe('14')
    expect((inputs[4]!.element as HTMLInputElement).value).toBe('30')
  })
})
