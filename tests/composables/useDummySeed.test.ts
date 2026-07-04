import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getWorkflowStatesMock = vi.fn()
const setupDefaultWorkflowMock = vi.fn()
const getWorkflowTransitionsMock = vi.fn()
const getCategoriesMock = vi.fn()
const getOfficesMock = vi.fn()
const getTaskTypesMock = vi.fn()
const createTicketMock = vi.fn()
const updateTicketMock = vi.fn()
const transitionTicketMock = vi.fn()
const createTaskMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getWorkflowStates: (...args: unknown[]) => getWorkflowStatesMock(...args),
  setupDefaultWorkflow: (...args: unknown[]) => setupDefaultWorkflowMock(...args),
  getWorkflowTransitions: (...args: unknown[]) => getWorkflowTransitionsMock(...args),
  getCategories: (...args: unknown[]) => getCategoriesMock(...args),
  getOffices: (...args: unknown[]) => getOfficesMock(...args),
  getTaskTypes: (...args: unknown[]) => getTaskTypesMock(...args),
  createTicket: (...args: unknown[]) => createTicketMock(...args),
  updateTicket: (...args: unknown[]) => updateTicketMock(...args),
  transitionTicket: (...args: unknown[]) => transitionTicketMock(...args),
  createTask: (...args: unknown[]) => createTaskMock(...args),
}))

import { useDummySeed } from '~/composables/useDummySeed'

const STATES = [
  { id: 's1', tenant_id: 't', name: '新規', label: '新規', color: '#3B82F6', sort_order: 0, is_initial: true, is_terminal: false, created_at: '' },
  { id: 's2', tenant_id: 't', name: '対応中', label: '対応中', color: '#F59E0B', sort_order: 1, is_initial: false, is_terminal: false, created_at: '' },
]

const TRANSITIONS = [
  { id: 'tr1', tenant_id: 't', from_state_id: 's1', to_state_id: 's2', label: '対応開始', created_at: '' },
]

function resetMocks() {
  getWorkflowStatesMock.mockReset()
  setupDefaultWorkflowMock.mockReset()
  getWorkflowTransitionsMock.mockReset()
  getCategoriesMock.mockReset()
  getOfficesMock.mockReset()
  getTaskTypesMock.mockReset()
  createTicketMock.mockReset()
  updateTicketMock.mockReset()
  transitionTicketMock.mockReset()
  createTaskMock.mockReset()

  getWorkflowStatesMock.mockResolvedValue(STATES)
  getWorkflowTransitionsMock.mockResolvedValue(TRANSITIONS)
  getCategoriesMock.mockResolvedValue([{ id: 'c1', tenant_id: 't', name: '貨物事故', sort_order: 0, created_at: '' }])
  getOfficesMock.mockResolvedValue([{ id: 'o1', tenant_id: 't', name: 'テスト営業所', sort_order: 0, created_at: '' }])
  getTaskTypesMock.mockResolvedValue([{ id: 'tt1', tenant_id: 't', name: 'テスト種別', sort_order: 0, created_at: '' }])
  createTicketMock.mockImplementation(async () => ({ id: `ticket-${createTicketMock.mock.calls.length}` }))
  updateTicketMock.mockResolvedValue({})
  transitionTicketMock.mockResolvedValue(undefined)
  createTaskMock.mockResolvedValue({ id: 'task-1' })
}

describe('useDummySeed', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    resetMocks()
  })

  afterEach(() => {
    randomSpy?.mockRestore()
  })

  it('does nothing when count is 0', async () => {
    const { seedDummyTickets } = useDummySeed()
    await seedDummyTickets(0)
    expect(createTicketMock).not.toHaveBeenCalled()
  })

  it('creates the requested number of tickets using existing workflow/master data', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { seeding, progress, error, seedDummyTickets } = useDummySeed()

    await seedDummyTickets(2)

    expect(setupDefaultWorkflowMock).not.toHaveBeenCalled()
    expect(createTicketMock).toHaveBeenCalledTimes(2)
    const payload = createTicketMock.mock.calls[0]![0]
    expect(payload.category).toBe('貨物事故')
    expect(payload.office_name).toBe('テスト営業所')
    expect(seeding.value).toBe(false)
    expect(error.value).toBeNull()
    expect(progress.value).toEqual({ done: 2, total: 2 })
    // Math.random() = 0 -> hops = 0 / task count = 0 -> no transition/task calls
    expect(transitionTicketMock).not.toHaveBeenCalled()
    expect(createTaskMock).not.toHaveBeenCalled()
    // Math.random() < 0.7 branch (progress_notes) is taken
    expect(updateTicketMock).toHaveBeenCalledWith('ticket-1', { progress_notes: expect.any(String) })
  })

  it('sets up the default workflow when none exists', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    getWorkflowStatesMock.mockResolvedValueOnce([])
    setupDefaultWorkflowMock.mockResolvedValue(STATES)

    const { seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    expect(setupDefaultWorkflowMock).toHaveBeenCalled()
    expect(createTicketMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to built-in category/office/task-type names when masters are empty', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    getCategoriesMock.mockResolvedValue([])
    getOfficesMock.mockResolvedValue([])
    getTaskTypesMock.mockResolvedValue([])

    const { seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    const payload = createTicketMock.mock.calls[0]![0]
    expect(payload.category).toBe('苦情・トラブル')
    expect(payload.office_name).toBe('本社営業所')
  })

  it('walks the transition graph and adds tasks when random hops/counts are high', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const { seedDummyTickets } = useDummySeed()

    await seedDummyTickets(1)

    // Only one edge (s1 -> s2) exists in TRANSITIONS, so the walk stops after 1 hop
    // even though the random hop count resolves to 2.
    expect(transitionTicketMock).toHaveBeenCalledTimes(1)
    expect(transitionTicketMock).toHaveBeenCalledWith('ticket-1', { to_state_id: 's2', comment: null })
    expect(createTaskMock).toHaveBeenCalledTimes(2)
  })

  it('stops the transition walk when the current state has no outgoing edges', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getWorkflowTransitionsMock.mockResolvedValue([])

    const { seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    expect(transitionTicketMock).not.toHaveBeenCalled()
  })

  it('does nothing when there is no initial workflow state', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    getWorkflowStatesMock.mockResolvedValue([{ ...STATES[0], is_initial: false }])

    const { seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    expect(transitionTicketMock).not.toHaveBeenCalled()
  })

  it('records the error and resets seeding state on failure', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    createTicketMock.mockRejectedValueOnce(new Error('boom'))

    const { seeding, error, seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    expect(error.value).toBe('boom')
    expect(seeding.value).toBe(false)
  })

  it('records a fallback error message for non-Error rejections', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    createTicketMock.mockRejectedValueOnce('nope')

    const { error, seedDummyTickets } = useDummySeed()
    await seedDummyTickets(1)

    expect(error.value).toBe('ダミーチケットの生成に失敗しました')
  })

  it('ignores concurrent calls while already seeding', async () => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const { seedDummyTickets } = useDummySeed()

    // `seeding.value = true` is set synchronously before the first `await`
    // inside seedDummyTickets, so a second call issued right after the first
    // (still in the same synchronous tick) is guaranteed to see it and no-op.
    const first = seedDummyTickets(1)
    const second = seedDummyTickets(1)
    await Promise.all([first, second])

    expect(createTicketMock).toHaveBeenCalledTimes(1)
  })
})
