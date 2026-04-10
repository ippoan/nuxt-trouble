import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TicketCategoryBadge from '~/components/TicketCategoryBadge.vue'

describe('TicketCategoryBadge', () => {
  it('renders category text', () => {
    const wrapper = mount(TicketCategoryBadge, {
      props: { category: '貨物事故' },
      global: { stubs: { UBadge: { template: '<span><slot /></span>', props: ['color', 'variant'] } } },
    })
    expect(wrapper.text()).toContain('貨物事故')
  })

  it('renders with different categories', () => {
    const categories = ['苦情・トラブル', '被害事故', '対物事故(他損)', 'その他']
    for (const category of categories) {
      const wrapper = mount(TicketCategoryBadge, {
        props: { category },
        global: { stubs: { UBadge: { template: '<span><slot /></span>', props: ['color', 'variant'] } } },
      })
      expect(wrapper.text()).toContain(category)
    }
  })
})
