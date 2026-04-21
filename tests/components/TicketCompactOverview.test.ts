import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

// ----- Mocks -------------------------------------------------------------
const lookupMock = vi.fn()
const loadMock = vi.fn().mockResolvedValue(undefined)

vi.mock('~/composables/useCarInspections', () => ({
  useCarInspections: () => ({
    load: loadMock,
    lookupByRegistration: lookupMock,
    registrationOptions: { value: [] },
  }),
}))

vi.mock('~/utils/api', () => ({
  updateTicket: vi.fn(),
}))

import TicketCompactOverview from '~/components/TicketCompactOverview.vue'
import type { TroubleTicket } from '~/types'

function makeTicket(overrides: Partial<TroubleTicket> = {}): TroubleTicket {
  return {
    id: 't1',
    ticket_no: 1,
    category: '貨物事故',
    title: '',
    description: '',
    occurred_at: null,
    occurred_date: null,
    company_name: null,
    office_name: null,
    department: null,
    person_name: null,
    registration_number: '3881',
    location: null,
    progress_notes: null,
    allowance: null,
    damage_amount: null,
    compensation_amount: null,
    confirmation_notice: null,
    disciplinary_content: null,
    disciplinary_action: null,
    road_service_cost: null,
    counterparty: null,
    counterparty_insurance: null,
    status_id: null,
    due_date: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  } as TroubleTicket
}

function mountOverview(opts: { ticket?: Partial<TroubleTicket> } = {}) {
  return mount(TicketCompactOverview, {
    props: {
      ticket: makeTicket(opts.ticket),
      workflowStates: [],
    },
    global: { stubs: allStubs },
  })
}

describe('TicketCompactOverview - 車検満了日 display', () => {
  beforeEach(() => {
    lookupMock.mockReset()
    loadMock.mockClear()
    vi.useFakeTimers()
    // Fixed today for deterministic expiry-status tests
    vi.setSystemTime(new Date(2026, 3, 21)) // 2026-04-21
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 車検満了日 when lookupCarInspection returns a record', async () => {
    lookupMock.mockReturnValue({
      registrationNumber: '3881',
      ownerName: 'オーナー1',
      carName: '車名1',
      model: 'モデル1',
      validPeriodExpirdate: '2027-01-01',
    })

    const wrapper = mountOverview()
    await flushPromises()

    const badge = wrapper.find('[data-testid="car-expiry-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('2027-01-01')
    expect(wrapper.text()).toContain('車検満了日')
    expect(wrapper.text()).toContain('オーナー1')
    expect(wrapper.text()).toContain('車名1')
    expect(wrapper.text()).toContain('モデル1')
  })

  it('renders "車検証未登録" when lookup returns null/undefined', async () => {
    lookupMock.mockReturnValue(undefined)

    const wrapper = mountOverview()
    await flushPromises()

    const missing = wrapper.find('[data-testid="car-inspection-missing"]')
    expect(missing.exists()).toBe(true)
    expect(missing.text()).toContain('車検証未登録')
    expect(wrapper.find('[data-testid="car-expiry-badge"]').exists()).toBe(false)
  })

  it('shows red badge when expiry < today (expired)', async () => {
    lookupMock.mockReturnValue({
      registrationNumber: '3881',
      ownerName: '', carName: '', model: '',
      validPeriodExpirdate: '2026-04-20', // yesterday
    })

    const wrapper = mountOverview()
    await flushPromises()

    const badge = wrapper.find('[data-testid="car-expiry-badge"]')
    expect(badge.classes().some(c => c.includes('red'))).toBe(true)
    expect(badge.text()).toContain('期限切れ')
  })

  it('shows yellow badge when expiry within 30 days (soon)', async () => {
    lookupMock.mockReturnValue({
      registrationNumber: '3881',
      ownerName: '', carName: '', model: '',
      validPeriodExpirdate: '2026-05-01', // +10 days
    })

    const wrapper = mountOverview()
    await flushPromises()

    const badge = wrapper.find('[data-testid="car-expiry-badge"]')
    expect(badge.classes().some(c => c.includes('yellow'))).toBe(true)
    expect(badge.text()).toContain('残り30日以内')
  })

  it('shows neutral badge when expiry far in the future (ok)', async () => {
    lookupMock.mockReturnValue({
      registrationNumber: '3881',
      ownerName: '', carName: '', model: '',
      validPeriodExpirdate: '2027-01-01',
    })

    const wrapper = mountOverview()
    await flushPromises()

    const badge = wrapper.find('[data-testid="car-expiry-badge"]')
    // neutral = gray, not red/yellow
    expect(badge.classes().some(c => c.includes('red'))).toBe(false)
    expect(badge.classes().some(c => c.includes('yellow'))).toBe(false)
    expect(badge.classes().some(c => c.includes('gray'))).toBe(true)
    expect(badge.text()).toContain('有効')
  })

  it('does not render car-inspection section when ticket has no registration_number', async () => {
    const wrapper = mountOverview({ ticket: { registration_number: null } })
    await flushPromises()

    expect(wrapper.find('[data-testid="car-inspection-section"]').exists()).toBe(false)
  })
})
