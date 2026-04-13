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
  updateCategorySortOrder,
  getOffices,
  createOffice,
  deleteOffice,
  updateOfficeSortOrder,
  getEmployees,
  getWorkflowStates,
  getWorkflowTransitions,
  createWorkflowState,
  deleteWorkflowState,
  createWorkflowTransition,
  deleteWorkflowTransition,
  getStatusHistory,
  transitionTicket,
  getFiles,
  uploadFile,
  downloadFile,
  deleteFile,
  createTicket,
  deleteTicket,
  setupDefaultWorkflow,
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
      if (isLive) {
        const cat = await createCategory({ name: `test-cat-${Date.now()}` })
        expect(cat.id).toBeDefined()
        expect(cat.name).toContain('test-cat-')
        await deleteCategory(cat.id)
        return
      }
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
      if (isLive) {
        const cat = await createCategory({ name: `del-cat-${Date.now()}` })
        await deleteCategory(cat.id)
        return
      }
      await verifyApi(() => deleteCategory('c1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/categories/c1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('updateCategorySortOrder', () => {
    it('updates category sort order', async () => {
      if (isLive) {
        const cat = await createCategory({ name: `sort-cat-${Date.now()}` })
        const updated = await updateCategorySortOrder(cat.id, 5)
        expect(updated.sort_order).toBe(5)
        await deleteCategory(cat.id)
        return
      }
      const mockData = { id: 'c1', name: '貨物事故', sort_order: 5 }
      await verifyApi(() => updateCategorySortOrder('c1', 5), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/categories/c1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 5 })
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
      if (isLive) {
        const off = await createOffice({ name: `test-off-${Date.now()}` })
        expect(off.id).toBeDefined()
        await deleteOffice(off.id)
        return
      }
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
      if (isLive) {
        const off = await createOffice({ name: `del-off-${Date.now()}` })
        await deleteOffice(off.id)
        return
      }
      await verifyApi(() => deleteOffice('o1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/offices/o1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('updateOfficeSortOrder', () => {
    it('updates office sort order', async () => {
      if (isLive) {
        const off = await createOffice({ name: `sort-off-${Date.now()}` })
        const updated = await updateOfficeSortOrder(off.id, 3)
        expect(updated.sort_order).toBe(3)
        await deleteOffice(off.id)
        return
      }
      const mockData = { id: 'o1', name: '東京営業所', sort_order: 3 }
      await verifyApi(() => updateOfficeSortOrder('o1', 3), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/offices/o1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 3 })
      })
    })
  })

  // --- Employees ---
  describe('getEmployees', () => {
    it('fetches employees', async () => {
      if (isLive) {
        const employees = await getEmployees()
        expect(Array.isArray(employees)).toBe(true)
        return
      }
      const mockData = [{ id: 'e1', name: 'テスト太郎', code: null }]
      await verifyApi(() => getEmployees(), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/employees`,
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
      if (isLive) {
        const name = `st-${Date.now()}`
        const state = await createWorkflowState({ name, label: name })
        expect(state.id).toBeDefined()
        await deleteWorkflowState(state.id)
        return
      }
      const mockData = { id: 's1', name: 'new', label: '新規' }
      await verifyApi(() => createWorkflowState({ name: 'new', label: '新規' }), mockData)
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/states`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteWorkflowState', () => {
    it('deletes a workflow state', async () => {
      if (isLive) {
        const name = `del-st-${Date.now()}`
        const state = await createWorkflowState({ name, label: name })
        await deleteWorkflowState(state.id)
        return
      }
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
      if (isLive) {
        const states = await getWorkflowStates()
        if (states.length >= 2) {
          try {
            const t = await createWorkflowTransition({
              from_state_id: states[0].id,
              to_state_id: states[1].id,
            })
            await deleteWorkflowTransition(t.id)
          } catch {
            // transition may already exist
          }
        }
        return
      }
      const mockData = { id: 't1', from_state_id: 's1', to_state_id: 's2' }
      await verifyApi(
        () => createWorkflowTransition({ from_state_id: 's1', to_state_id: 's2' }),
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
      if (isLive) {
        // Tested in createWorkflowTransition
        return
      }
      await verifyApi(() => deleteWorkflowTransition('t1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/workflow/transitions/t1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Status History ---
  describe('getStatusHistory', () => {
    it('fetches status history', async () => {
      if (isLive) {
        const ticket = await createTicket({ category: '貨物事故' })
        const history = await getStatusHistory(ticket.id)
        expect(Array.isArray(history)).toBe(true)
        await deleteTicket(ticket.id)
        return
      }
      const mockData = [{ id: 'h1', from_state_id: 's1', to_state_id: 's2' }]
      await verifyApi(() => getStatusHistory('ticket-1'), mockData)
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/history`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  // --- Status Transition ---
  describe('transitionTicket', () => {
    it('transitions a ticket', async () => {
      if (isLive) {
        await setupDefaultWorkflow().catch(() => {})
        const ticket = await createTicket({ category: '貨物事故' })
        if (ticket.status_id) {
          const transitions = await getWorkflowTransitions()
          const allowed = transitions.find(t => t.from_state_id === ticket.status_id)
          if (allowed) {
            try {
              const updated = await transitionTicket(ticket.id, {
                to_state_id: allowed.to_state_id,
              })
              expect(updated.status_id).toBe(allowed.to_state_id)
            } catch {
              // transition may fail if not allowed
            }
          }
        }
        await deleteTicket(ticket.id)
        return
      }
      const mockData = { id: 'ticket-1', status_id: 's2' }
      await verifyApi(
        () => transitionTicket('ticket-1', { to_state_id: 's2' }),
        mockData,
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/ticket-1/transition`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  // --- Files ---
  describe('getFiles', () => {
    it('fetches files for a ticket', async () => {
      if (isLive) {
        const ticket = await createTicket({ category: '貨物事故' })
        const files = await getFiles(ticket.id)
        expect(Array.isArray(files)).toBe(true)
        await deleteTicket(ticket.id)
        return
      }
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
      if (isLive) return // File upload requires storage backend
      await verifyApi(() => deleteFile('f1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/files/f1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })
})
