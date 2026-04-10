import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setupApi,
  teardownApi,
  mockFetch,
  stubOk,
  stub204,
  assertMock,
  verifyApi,
  callApi,
  expectMock,
  isLive,
  API_BASE,
  restoreNativeApis,
} from '../helpers/api-test-env'
import {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  deleteTicket,
  getWorkflowStates,
  setupDefaultWorkflow,
} from '~/utils/api'

describe('Trouble API', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
  })
  afterEach(() => teardownApi())

  describe('getTickets', () => {
    it('fetches ticket list', async () => {
      const mockData = { tickets: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => getTickets(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })

    it('passes filter params', async () => {
      const mockData = { tickets: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(
        () => getTickets({ category: '貨物事故', page: 2 }),
        mockData,
      )
      assertMock(() => {
        const url = mockFetch.mock.calls[0][0] as string
        expect(url).toContain('category=')
        expect(url).toContain('page=2')
      })
    })
  })

  describe('getTicket', () => {
    it('fetches single ticket', async () => {
      const mockTicket = { id: 'test-id', ticket_no: 1, category: '貨物事故' }
      await verifyApi(() => getTicket('test-id'), mockTicket)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/test-id`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createTicket', () => {
    it('creates a ticket', async () => {
      const mockTicket = { id: 'new-id', ticket_no: 1, category: '貨物事故' }
      await verifyApi(
        () => createTicket({ category: '貨物事故' }),
        mockTicket,
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ category: '貨物事故' })
      })
    })
  })

  describe('updateTicket', () => {
    it('updates a ticket', async () => {
      const mockTicket = { id: 'test-id', ticket_no: 1, category: '人身事故' }
      await verifyApi(
        () => updateTicket('test-id', { category: '人身事故' }),
        mockTicket,
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/test-id`)
        expect(opts.method).toBe('PUT')
      })
    })
  })

  describe('deleteTicket', () => {
    it('deletes a ticket', async () => {
      await verifyApi(() => deleteTicket('test-id'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/test-id`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('getWorkflowStates', () => {
    it('fetches workflow states', async () => {
      const mockStates = [{ id: 's1', name: '新規', label: '新規' }]
      await verifyApi(() => getWorkflowStates(), mockStates)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/workflow/states`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('setupDefaultWorkflow', () => {
    it('sets up default workflow', async () => {
      const mockStates = [{ id: 's1', name: '新規', label: '新規' }]
      await verifyApi(() => setupDefaultWorkflow(), mockStates)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/setup`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('server error'),
      })
      await expect(getTickets()).rejects.toThrow('API エラー (500)')
    })

    it('throws if API not initialized', async () => {
      if (isLive) return
      const { initApi } = await import('~/utils/api')
      // Reset apiBase by calling initApi with empty string
      initApi('')
      await expect(getTickets()).rejects.toThrow('API 未初期化')
      // Restore
      await setupApi()
    })
  })
})
