import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupApi, teardownApi, restoreNativeApis } from '../helpers/api-test-env'

const getCarInspectionsCurrentMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => {
  if (process.env.API_BASE_URL) return await importOriginal()
  return {
    ...(await importOriginal()),
    getCarInspectionsCurrent: (...args: unknown[]) => getCarInspectionsCurrentMock(...args),
  }
})

import { useCarInspections } from '~/composables/useCarInspections'

describe('useCarInspections', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
    getCarInspectionsCurrentMock.mockReset()
  })
  afterEach(() => teardownApi())

  it('normalizes full-width registration numbers to half-width in options and lookup', async () => {
    getCarInspectionsCurrentMock.mockResolvedValue({
      carInspections: [
        { EntryNoCarNo: '３８８１', OwnerName: 'オーナー1', CarName: '車名1', Model: 'モデル1', ValidPeriodExpirdate: '2027-01-01' },
        { CarNo: '3829', OwnerName: 'オーナー2', CarName: '車名2', Model: 'モデル2', ValidPeriodExpirdate: '2027-02-01' },
      ],
    })

    const ci = useCarInspections()
    await ci.load()

    expect(ci.registrationOptions.value).toEqual(['3881', '3829'])
    expect(ci.lookupByRegistration('3881')?.ownerName).toBe('オーナー1')
    expect(ci.lookupByRegistration('３８８１')?.ownerName).toBe('オーナー1')
    expect(ci.lookupByRegistration('3829')?.ownerName).toBe('オーナー2')
  })
})
