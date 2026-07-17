import { describe, it, expect, vi, beforeEach } from 'vitest'

const getIchibanEmployeesMock = vi.fn()
const getEmployeesMock = vi.fn()
const createEmployeeMock = vi.fn()
const updateEmployeeMock = vi.fn()

vi.mock('~/utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  getIchibanEmployees: (...args: unknown[]) => getIchibanEmployeesMock(...args),
  getEmployees: (...args: unknown[]) => getEmployeesMock(...args),
  createEmployee: (...args: unknown[]) => createEmployeeMock(...args),
  updateEmployee: (...args: unknown[]) => updateEmployeeMock(...args),
}))

import { useIchibanSync } from '~/composables/useIchibanSync'

function emp(id: string, name: string, code: string | null) {
  return { id, tenant_id: 't', name, code }
}

function ichiban(code: string, r: string, n = '') {
  return { employee_code: code, employee_name: n || r, employee_r: r }
}

beforeEach(() => {
  getIchibanEmployeesMock.mockReset()
  getEmployeesMock.mockReset()
  createEmployeeMock.mockReset()
  updateEmployeeMock.mockReset()
  createEmployeeMock.mockImplementation(async (d: { name: string; code: string }) =>
    emp('new-' + d.code, d.name, d.code),
  )
  updateEmployeeMock.mockImplementation(async (id: string, d: { name: string; code: string }) =>
    emp(id, d.name, d.code),
  )
})

describe('useIchibanSync', () => {
  it('新規の社員は createEmployee する (code=社員C, name=社員R)', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('1001', '田中')])
    getEmployeesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([emp('e1', '田中', '1001')])

    const { syncEmployees, summary, error } = useIchibanSync()
    const result = await syncEmployees()

    expect(createEmployeeMock).toHaveBeenCalledWith({ name: '田中', code: '1001' })
    expect(updateEmployeeMock).not.toHaveBeenCalled()
    expect(summary.value).toEqual({ created: 1, updated: 0, skipped: 0 })
    expect(error.value).toBeNull()
    expect(result).toEqual([emp('e1', '田中', '1001')])
  })

  it('code 一致で名前が同じならスキップ (UUID 維持・API 呼ばない)', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('1001', '田中')])
    getEmployeesMock.mockResolvedValue([emp('e1', '田中', '1001')])

    const { syncEmployees, summary } = useIchibanSync()
    await syncEmployees()

    expect(createEmployeeMock).not.toHaveBeenCalled()
    expect(updateEmployeeMock).not.toHaveBeenCalled()
    expect(summary.value).toEqual({ created: 0, updated: 0, skipped: 1 })
  })

  it('code 一致で名前が違えば update する (名前のみ追従)', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('1001', '田中(新姓)')])
    getEmployeesMock.mockResolvedValue([emp('e1', '田中', '1001')])

    const { syncEmployees, summary } = useIchibanSync()
    await syncEmployees()

    expect(updateEmployeeMock).toHaveBeenCalledWith('e1', { name: '田中(新姓)', code: '1001' })
    expect(summary.value).toEqual({ created: 0, updated: 1, skipped: 0 })
  })

  it('code 未設定の同名既存には code を付与する (重複作成しない)', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('1001', '田中')])
    getEmployeesMock.mockResolvedValue([emp('e1', '田中', null)])

    const { syncEmployees, summary } = useIchibanSync()
    await syncEmployees()

    expect(updateEmployeeMock).toHaveBeenCalledWith('e1', { name: '田中', code: '1001' })
    expect(createEmployeeMock).not.toHaveBeenCalled()
    expect(summary.value).toEqual({ created: 0, updated: 1, skipped: 0 })
  })

  it('別 code を持つ同名既存には触らず新規作成する (alc-app 連携を壊さない)', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('1001', '田中')])
    getEmployeesMock.mockResolvedValue([emp('e1', '田中', 'NFC-77')])

    const { syncEmployees, summary } = useIchibanSync()
    await syncEmployees()

    expect(updateEmployeeMock).not.toHaveBeenCalled()
    expect(createEmployeeMock).toHaveBeenCalledWith({ name: '田中', code: '1001' })
    expect(summary.value).toEqual({ created: 1, updated: 0, skipped: 0 })
  })

  it('社員R が空の行は同期対象外', async () => {
    getIchibanEmployeesMock.mockResolvedValue([ichiban('9999', '  '), ichiban('1001', '田中')])
    getEmployeesMock.mockResolvedValue([])

    const { syncEmployees, progress, summary } = useIchibanSync()
    await syncEmployees()

    expect(createEmployeeMock).toHaveBeenCalledTimes(1)
    expect(progress.value).toEqual({ done: 1, total: 1 })
    expect(summary.value).toEqual({ created: 1, updated: 0, skipped: 0 })
  })

  it('失敗時は error に格納して null を返す (rethrow しない)', async () => {
    getIchibanEmployeesMock.mockRejectedValue(new Error('API エラー (502)'))

    const { syncEmployees, error, summary, syncing } = useIchibanSync()
    const result = await syncEmployees()

    expect(result).toBeNull()
    expect(error.value).toBe('API エラー (502)')
    expect(summary.value).toBeNull()
    expect(syncing.value).toBe(false)
  })

  it('Error 以外の throw は固定文言にする', async () => {
    getIchibanEmployeesMock.mockRejectedValue('boom')

    const { syncEmployees, error } = useIchibanSync()
    await syncEmployees()

    expect(error.value).toBe('一番星からの同期に失敗しました')
  })

  it('同期中の再入は no-op (null 返し)', async () => {
    let resolveIchiban: (v: unknown[]) => void = () => {}
    getIchibanEmployeesMock.mockReturnValue(new Promise(r => (resolveIchiban = r)))
    getEmployeesMock.mockResolvedValue([])

    const { syncEmployees, syncing } = useIchibanSync()
    const first = syncEmployees()
    expect(syncing.value).toBe(true)
    await expect(syncEmployees()).resolves.toBeNull()
    resolveIchiban([])
    await first
    expect(getIchibanEmployeesMock).toHaveBeenCalledTimes(1)
  })
})
