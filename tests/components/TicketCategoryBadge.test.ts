import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TicketCategoryBadge from '~/components/TicketCategoryBadge.vue'

describe('TicketCategoryBadge', () => {
  it('renders category text', async () => {
    const wrapper = await mountSuspended(TicketCategoryBadge, {
      props: { category: '貨物事故' },
    })
    expect(wrapper.text()).toContain('貨物事故')
  })

  it('renders with different categories', async () => {
    const categories = ['苦情・トラブル', '被害事故', '対物事故(他損)', 'その他']
    for (const category of categories) {
      const wrapper = await mountSuspended(TicketCategoryBadge, {
        props: { category },
      })
      expect(wrapper.text()).toContain(category)
    }
  })
})
