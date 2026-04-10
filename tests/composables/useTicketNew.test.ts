import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupApi, teardownApi, isLive, restoreNativeApis } from '../helpers/api-test-env'
import { deleteTicket } from '~/utils/api'

const pushMock = vi.fn()
const createTicketMock = vi.fn()
const getWorkflowStatesMock = vi.fn()
const setupDefaultWorkflowMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  if (process.env.API_BASE_URL) return await importOriginal()
  return {
    ...(await importOriginal()),
    createTicket: (...args: unknown[]) => createTicketMock(...args),
    getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
    setupDefaultWorkflow: (...args: unknown[]) => setupDefaultWorkflowMock(...args),
  }
})

vi.mock('#app/composables/router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useTicketNew } from '~/composables/useTicketNew'

describe('useTicketNew', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
    pushMock.mockReset()
    createTicketMock.mockReset()
    getWorkflowStatesMock.mockReset()
    setupDefaultWorkflowMock.mockReset()
  })
  afterEach(() => teardownApi())

  it('initializes with empty form', () => {
    const { form, saving, error } = useTicketNew()
    expect(form.value.category).toBe('')
    expect(saving.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('validates category is required', async () => {
    const { handleSubmit, error } = useTicketNew()
    await handleSubmit()
    expect(error.value).toBe('カテゴリは必須です')
    if (!isLive) expect(createTicketMock).not.toHaveBeenCalled()
  })

  it('creates ticket with existing workflow', async () => {
    if (!isLive) {
      getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
      createTicketMock.mockResolvedValue({ id: 'new-id' })
    }
    const { form, handleSubmit } = useTicketNew()
    form.value.category = '貨物事故'
    form.value.title = 'テスト'
    await handleSubmit()

    if (isLive) {
      expect(pushMock).toHaveBeenCalled()
      const ticketId = pushMock.mock.calls[0][0].replace('/tickets/', '')
      await deleteTicket(ticketId)
    } else {
      expect(setupDefaultWorkflowMock).not.toHaveBeenCalled()
      expect(createTicketMock).toHaveBeenCalled()
      const payload = createTicketMock.mock.calls[0][0]
      expect(payload.category).toBe('貨物事故')
      expect(payload).not.toHaveProperty('description')
      expect(pushMock).toHaveBeenCalledWith('/tickets/new-id')
    }
  })

  it('sets up default workflow when none exists', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([])
    setupDefaultWorkflowMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockResolvedValue({ id: 'new-id' })

    const { form, handleSubmit } = useTicketNew()
    form.value.category = '貨物事故'
    await handleSubmit()
    expect(setupDefaultWorkflowMock).toHaveBeenCalled()
  })

  it('handles Error on create failure', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockRejectedValue(new Error('create failed'))

    const { form, handleSubmit, error, saving } = useTicketNew()
    form.value.category = '貨物事故'
    await handleSubmit()
    expect(error.value).toBe('create failed')
    expect(saving.value).toBe(false)
  })

  it('handles non-Error on create failure', async () => {
    if (isLive) return
    getWorkflowStatesMock.mockResolvedValue([{ id: 's1' }])
    createTicketMock.mockRejectedValue('string error')

    const { form, handleSubmit, error } = useTicketNew()
    form.value.category = '貨物事故'
    await handleSubmit()
    expect(error.value).toBe('作成に失敗しました')
  })
})
