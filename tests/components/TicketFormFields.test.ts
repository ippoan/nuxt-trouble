import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TicketFormFields from '~/components/TicketFormFields.vue'

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
    vehicle_number: '',
    location: '',
    damage_amount: null,
    compensation_amount: null,
    road_service_cost: null,
    counterparty: '',
    counterparty_insurance: '',
    due_date: '',
  }

  it('renders all field groups', async () => {
    const wrapper = await mountSuspended(TicketFormFields, {
      props: { modelValue: { ...defaultForm }, mode: 'create' },
    })

    expect(wrapper.text()).toContain('基本情報')
    expect(wrapper.text()).toContain('関係者情報')
    expect(wrapper.text()).toContain('車両・場所')
    expect(wrapper.text()).toContain('金額')
    expect(wrapper.text()).toContain('相手方')
    expect(wrapper.text()).toContain('管理')
  })

  it('renders category select', async () => {
    const wrapper = await mountSuspended(TicketFormFields, {
      props: { modelValue: { ...defaultForm }, mode: 'create' },
    })

    expect(wrapper.text()).toContain('カテゴリ')
  })
})
