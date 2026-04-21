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
        { EntryNoCarNo: '３８８１', OwnerName: 'オーナー1', CarName: '車名1', Model: 'モデル1' },
        { CarNo: '3829', OwnerName: 'オーナー2', CarName: '車名2', Model: 'モデル2' },
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

  it.skipIf(isLive)('extracts expiry from TwodimensionCodeInfoValidPeriodExpirdate (YYMMDD)', async () => {
    getCarInspectionsCurrentMock.mockResolvedValue({
      carInspections: [
        { CarNo: '1111', TwodimensionCodeInfoValidPeriodExpirdate: '270430' },
      ],
    })
    const { useCarInspections } = await import('~/composables/useCarInspections')
    const ci = useCarInspections()
    await ci.load()
    expect(ci.lookupByRegistration('1111')?.validPeriodExpirdate).toBe('2027-04-30')
  })

  it.skipIf(isLive)('falls back to wareki Y/M/D fields when TwodimensionCodeInfo is absent', async () => {
    getCarInspectionsCurrentMock.mockResolvedValue({
      carInspections: [
        { CarNo: '2222', ValidPeriodExpirdateE: '令和', ValidPeriodExpirdateY: '7', ValidPeriodExpirdateM: '4', ValidPeriodExpirdateD: '30' },
      ],
    })
    const { useCarInspections } = await import('~/composables/useCarInspections')
    const ci = useCarInspections()
    await ci.load()
    expect(ci.lookupByRegistration('2222')?.validPeriodExpirdate).toBe('令和7年4月30日')
  })

  it.skipIf(isLive)('returns empty string when no expiry fields are present', async () => {
    getCarInspectionsCurrentMock.mockResolvedValue({
      carInspections: [
        { CarNo: '3333', OwnerName: '社長' },
      ],
    })
    const { useCarInspections } = await import('~/composables/useCarInspections')
    const ci = useCarInspections()
    await ci.load()
    expect(ci.lookupByRegistration('3333')?.validPeriodExpirdate).toBe('')
  })
})
