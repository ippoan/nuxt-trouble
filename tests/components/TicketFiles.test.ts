import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TicketFiles from '~/components/TicketFiles.vue'

vi.mock('~/utils/api', () => ({
  getFiles: vi.fn().mockResolvedValue([
    { id: 'f1', tenant_id: 't1', ticket_id: 'ticket-1', filename: 'test.pdf', content_type: 'application/pdf', size_bytes: 1024, storage_key: 'key', created_at: '2026-01-10' },
  ]),
  uploadFile: vi.fn().mockResolvedValue(
    { id: 'f2', tenant_id: 't1', ticket_id: 'ticket-1', filename: 'new.pdf', content_type: 'application/pdf', size_bytes: 2048, storage_key: 'key2', created_at: '2026-01-11' },
  ),
  downloadFile: vi.fn().mockResolvedValue(undefined),
  deleteFile: vi.fn().mockResolvedValue(undefined),
}))

const stubs = {
  UButton: {
    template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
    props: ['label', 'icon', 'variant', 'color', 'size', 'loading', 'disabled'],
  },
}

describe('TicketFiles', () => {
  it('renders file list', async () => {
    const wrapper = mount(TicketFiles, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('test.pdf')
    expect(wrapper.text()).toContain('1.0 KB')
  })

  it('shows empty state', async () => {
    const { getFiles } = await import('~/utils/api')
    vi.mocked(getFiles).mockResolvedValueOnce([])

    const wrapper = mount(TicketFiles, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('添付ファイルはありません')
  })

  it('renders heading', async () => {
    const wrapper = mount(TicketFiles, {
      props: { ticketId: 'ticket-1' },
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('添付ファイル')
  })
})
