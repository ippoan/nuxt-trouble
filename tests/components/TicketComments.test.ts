import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketComments from '~/components/TicketComments.vue'

const mockComments = [
  { id: 'c1', tenant_id: 't1', ticket_id: 'ticket-1', author_id: null, body: 'テストコメント', created_at: '2026-01-10T00:00:00', updated_at: '2026-01-10T00:00:00' },
]

vi.mock('~/utils/api', () => ({
  getComments: vi.fn().mockResolvedValue([
    { id: 'c1', tenant_id: 't1', ticket_id: 'ticket-1', author_id: null, body: 'テストコメント', created_at: '2026-01-10T00:00:00', updated_at: '2026-01-10T00:00:00' },
  ]),
  createComment: vi.fn().mockResolvedValue(
    { id: 'c2', tenant_id: 't1', ticket_id: 'ticket-1', author_id: null, body: '新しいコメント', created_at: '2026-01-11T00:00:00', updated_at: '2026-01-11T00:00:00' },
  ),
  deleteComment: vi.fn().mockResolvedValue(undefined),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
  },
  UTextarea: {
    template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'placeholder', 'rows'],
  },
}

describe('TicketComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders comments after loading', async () => {
    const wrapper = mount(TicketComments, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('テストコメント')
  })

  it('shows empty state when no comments', async () => {
    const { getComments } = await import('~/utils/api')
    vi.mocked(getComments).mockResolvedValueOnce([])

    const wrapper = mount(TicketComments, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('コメントはありません')
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketComments, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('コメント')
  })
})
