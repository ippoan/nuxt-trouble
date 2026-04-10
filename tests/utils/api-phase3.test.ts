import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupApi,
  teardownApi,
  mockFetch,
  stubOk,
  stub204,
  assertMock,
  verifyApi,
  expectMock,
  isLive,
  API_BASE,
  restoreNativeApis,
} from '../helpers/api-test-env'
import {
  getCategories,
  createCategory,
  deleteCategory,
  getOffices,
  createOffice,
  deleteOffice,
  getEmployees,
  getWorkflowTransitions,
  createWorkflowState,
  deleteWorkflowState,
  createWorkflowTransition,
  deleteWorkflowTransition,
  getComments,
  createComment,
  deleteComment,
  getStatusHistory,
  transitionTicket,
  getFiles,
  uploadFile,
  downloadFile,
  deleteFile,
} from '~/utils/api'

describe('Trouble API Phase 3', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
  })
  afterEach(() => teardownApi())

  // --- Categories ---
  describe('getCategories', () => {
    it('fetches categories', async () => {
      const mockData = [{ id: 'c1', name: '貨物事故', sort_order: 1 }]
      await verifyApi(() => getCategories(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/categories`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createCategory', () => {
    it('creates a category', async () => {
      const mockData = { id: 'c1', name: '貨物事故', sort_order: 1 }
      await verifyApi(() => createCategory({ name: '貨物事故' }), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/categories`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ name: '貨物事故' })
      })
    })
  })

  describe('deleteCategory', () => {
    it('deletes a category', async () => {
      await verifyApi(() => deleteCategory('c1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/categories/c1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Offices ---
  describe('getOffices', () => {
    it('fetches offices', async () => {
      const mockData = [{ id: 'o1', name: '東京営業所', sort_order: 1 }]
      await verifyApi(() => getOffices(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/offices`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createOffice', () => {
    it('creates an office', async () => {
      const mockData = { id: 'o1', name: '東京営業所', sort_order: 1 }
      await verifyApi(() => createOffice({ name: '東京営業所' }), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/offices`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteOffice', () => {
    it('deletes an office', async () => {
      await verifyApi(() => deleteOffice('o1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/offices/o1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Employees ---
  describe('getEmployees', () => {
    it('fetches employees', async () => {
      const mockData = [{ id: 'e1', name: 'テスト太郎', code: null }]
      await verifyApi(() => getEmployees(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/employees`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  // --- Workflow Management ---
  describe('getWorkflowTransitions', () => {
    it('fetches transitions', async () => {
      const mockData = [{ id: 't1', from_state_id: 's1', to_state_id: 's2' }]
      await verifyApi(() => getWorkflowTransitions(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/workflow/transitions`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createWorkflowState', () => {
    it('creates a workflow state', async () => {
      const mockData = { id: 's1', name: 'new', label: '新規' }
      const input = { name: 'new', label: '新規', color: null, sort_order: null, is_initial: null, is_terminal: null }
      await verifyApi(() => createWorkflowState(input), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/states`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteWorkflowState', () => {
    it('deletes a workflow state', async () => {
      await verifyApi(() => deleteWorkflowState('s1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/states/s1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('createWorkflowTransition', () => {
    it('creates a transition', async () => {
      const mockData = { id: 't1', from_state_id: 's1', to_state_id: 's2' }
      await verifyApi(
        () => createWorkflowTransition({ from_state_id: 's1', to_state_id: 's2', label: null }),
        mockData,
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/transitions`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteWorkflowTransition', () => {
    it('deletes a transition', async () => {
      await verifyApi(() => deleteWorkflowTransition('t1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/transitions/t1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Comments ---
  describe('getComments', () => {
    it('fetches comments for a ticket', async () => {
      const mockData = [{ id: 'cm1', body: 'テストコメント' }]
      await verifyApi(() => getComments('ticket-1'), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/comments`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createComment', () => {
    it('creates a comment', async () => {
      const mockData = { id: 'cm1', body: 'テストコメント' }
      await verifyApi(() => createComment('ticket-1', 'テストコメント'), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/ticket-1/comments`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ body: 'テストコメント' })
      })
    })
  })

  describe('deleteComment', () => {
    it('deletes a comment', async () => {
      await verifyApi(() => deleteComment('cm1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/comments/cm1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Status History ---
  describe('getStatusHistory', () => {
    it('fetches status history', async () => {
      const mockData = [{ id: 'h1', from_state_id: 's1', to_state_id: 's2' }]
      await verifyApi(() => getStatusHistory('ticket-1'), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/status-history`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  // --- Status Transition ---
  describe('transitionTicket', () => {
    it('transitions a ticket', async () => {
      await verifyApi(
        () => transitionTicket('ticket-1', { to_state_id: 's2', comment: null }),
        {},
        { expect204: true },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/ticket-1/transition`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ to_state_id: 's2', comment: null })
      })
    })
  })

  // --- Files ---
  describe('getFiles', () => {
    it('fetches files for a ticket', async () => {
      const mockData = [{ id: 'f1', filename: 'test.pdf' }]
      await verifyApi(() => getFiles('ticket-1'), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/files`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('uploadFile', () => {
    it('uploads a file', async () => {
      if (isLive) return
      const mockData = { id: 'f1', filename: 'test.pdf' }
      stubOk(mockData)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const result = await uploadFile('ticket-1', file)
      expect(result).toEqual(mockData)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/api/trouble/tickets/ticket-1/files`)
      expect(opts.method).toBe('POST')
      expect(opts.body).toBeInstanceOf(FormData)
    })
  })

  describe('downloadFile', () => {
    it('triggers file download', async () => {
      if (isLive) return
      const blobUrl = 'blob:http://localhost/fake'
      const clickMock = vi.fn()
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: clickMock,
      } as unknown as HTMLElement)
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl)
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
        headers: new Headers({ 'Content-Disposition': 'attachment; filename="test.pdf"' }),
      })
      await downloadFile('f1')
      expect(clickMock).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(blobUrl)

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('throws on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      await expect(downloadFile('f1')).rejects.toThrow('ダウンロード失敗: 404')
    })

    it('uses default filename when no Content-Disposition', async () => {
      if (isLive) return
      const clickMock = vi.fn()
      const el = { href: '', download: '', click: clickMock } as unknown as HTMLAnchorElement
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(el as unknown as HTMLElement)
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
        headers: new Headers({}),
      })
      await downloadFile('f1')
      expect((el as unknown as { download: string }).download).toBe('download')

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  describe('deleteFile', () => {
    it('deletes a file', async () => {
      await verifyApi(() => deleteFile('f1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/files/f1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })
})
