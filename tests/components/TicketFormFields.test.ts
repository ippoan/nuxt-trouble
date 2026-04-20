import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketFormFields from '~/components/TicketFormFields.vue'

const stubs = {
  UFormField: { template: '<div>{{ label }}<slot /></div>', props: ['label', 'required'] },
  USelect: { template: '<select />', props: ['modelValue', 'items', 'placeholder'] },
  UInput: { template: '<input />', props: ['modelValue', 'placeholder', 'type'] },
  UTextarea: { template: '<textarea />', props: ['modelValue', 'placeholder', 'rows'] },
}

describe('TicketFormFields', () => {
  const defaultForm = {
    category: '',
    title: '',
    description: '',
    occurred_date: '',
    company_name: '',
    office_name: '',
    department: '',
    person_name: '',
    registration_number: '',
    location: '',
    damage_amount: null,
    compensation_amount: null,
    road_service_cost: null,
    counterparty: '',
    counterparty_insurance: '',
    due_date: '',
  }

  it('renders all field groups', () => {
    const wrapper = mount(TicketFormFields, {
      props: { modelValue: { ...defaultForm }, mode: 'create' },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('基本情報')
    expect(wrapper.text()).toContain('関係者情報')
    expect(wrapper.text()).toContain('車両・場所')
    expect(wrapper.text()).toContain('金額')
    expect(wrapper.text()).toContain('相手方')
    expect(wrapper.text()).toContain('管理')
  })

  it('renders category select', () => {
    const wrapper = mount(TicketFormFields, {
      props: { modelValue: { ...defaultForm }, mode: 'create' },
      global: { stubs },
    })

    expect(wrapper.text()).toContain('カテゴリ')
  })
})
