import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupApi, teardownApi, isLive, restoreNativeApis } from '../helpers/api-test-env'

const getCarInspectionsCurrentMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  if (process.env.API_BASE_URL) return await importOriginal()
  return {
    ...(await importOriginal()),
    getCarInspectionsCurrent: (...args: unknown[]) => getCarInspectionsCurrentMock(...args),
  }
})

describe('useCarInspections', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
    getCarInspectionsCurrentMock.mockReset()
    // singleton state is module-local; reset modules so each test starts fresh
    vi.resetModules()
  })
  afterEach(() => teardownApi())

  it.skipIf(isLive)('normalizes full-width registration numbers to half-width in options and lookup', async () => {
    getCarInspectionsCurrentMock.mockResolvedValue({
      carInspections: [
        { EntryNoCarNo: '３８８１', OwnerName: 'オーナー1', CarName: '車名1', Model: 'モデル1', ValidPeriodExpirdate: '2027-01-01' },
        { CarNo: '3829', OwnerName: 'オーナー2', CarName: '車名2', Model: 'モデル2', ValidPeriodExpirdate: '2027-02-01' },
      ],
    })

    const { useCarInspections } = await import('~/composables/useCarInspections')
    const ci = useCarInspections()
    await ci.load()

    expect(ci.registrationOptions.value).toEqual(['3881', '3829'])
    expect(ci.lookupByRegistration('3881')?.ownerName).toBe('オーナー1')
    expect(ci.lookupByRegistration('３８８１')?.ownerName).toBe('オーナー1')
    expect(ci.lookupByRegistration('3829')?.ownerName).toBe('オーナー2')
  })
})
