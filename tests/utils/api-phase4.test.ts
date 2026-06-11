import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  setupApi,
  teardownApi,
  mockFetch,
  stubOk,
  assertMock,
  verifyApi,
  expectMock,
  isLive,
  API_BASE,
  restoreNativeApis,
} from '../helpers/api-test-env'
import {
  getProgressStatuses,
  createProgressStatus,
  deleteProgressStatus,
  updateProgressStatusSortOrder,
  getFileBlobUrl,
  restoreFile,
  getTrashFiles,
  getNotificationPrefs,
  upsertNotificationPref,
  deleteNotificationPref,
  getLineworksMembers,
  createSchedule,
  getTicketSchedules,
  cancelSchedule,
  getTaskTypes,
  createTaskType,
  deleteTaskType,
  updateTaskTypeSortOrder,
  getTaskStatuses,
  createTaskStatus,
  deleteTaskStatus,
  updateTaskStatusSortOrder,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  listAllTasks,
  getTaskFiles,
  uploadTaskFile,
  downloadTaskFile,
  deleteTaskFile,
  restoreTaskFile,
} from '~/utils/api'

// #138: coverage_100 gate が vacuous だった間に未テストのまま増えた API 群。
// カバレッジ gate は mock モード (test job) で計測されるため、live では skip する。
describe('Trouble API Phase 4', () => {
  beforeEach(async () => {
    restoreNativeApis()
    await setupApi()
  })
  afterEach(() => teardownApi())

  // --- Progress Statuses ---
  describe('getProgressStatuses', () => {
    it('fetches progress statuses', async () => {
      await verifyApi(() => getProgressStatuses(), [{ id: 'p1', name: '対応中' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/progress-statuses`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createProgressStatus', () => {
    it('creates a progress status', async () => {
      if (isLive) {
        const p = await createProgressStatus({ name: `test-prog-${Date.now()}` })
        expect(p.id).toBeDefined()
        await deleteProgressStatus(p.id)
        return
      }
      await verifyApi(() => createProgressStatus({ name: '対応中' }), { id: 'p1', name: '対応中' })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/progress-statuses`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ name: '対応中' })
      })
    })
  })

  describe('deleteProgressStatus', () => {
    it('deletes a progress status', async () => {
      if (isLive) return // createProgressStatus 側でテスト済み
      await verifyApi(() => deleteProgressStatus('p1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/progress-statuses/p1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('updateProgressStatusSortOrder', () => {
    it('updates progress status sort order', async () => {
      if (isLive) {
        const p = await createProgressStatus({ name: `sort-prog-${Date.now()}` })
        const updated = await updateProgressStatusSortOrder(p.id, 5)
        expect(updated.sort_order).toBe(5)
        await deleteProgressStatus(p.id)
        return
      }
      await verifyApi(() => updateProgressStatusSortOrder('p1', 5), { id: 'p1', sort_order: 5 })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/progress-statuses/p1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 5 })
      })
    })
  })

  // --- Files (blob / trash / restore) ---
  describe('getFileBlobUrl', () => {
    it('returns object URL for fetched blob', async () => {
      if (isLive) return
      const blobUrl = 'blob:http://localhost/fake'
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
      })
      const url = await getFileBlobUrl('f1')
      expect(url).toBe(blobUrl)
      const [calledUrl] = mockFetch.mock.calls[0]
      expect(calledUrl).toBe(`${API_BASE}/api/trouble/files/f1/download`)
      createObjectURLSpy.mockRestore()
    })

    it('throws on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      await expect(getFileBlobUrl('f1')).rejects.toThrow('ファイル取得失敗: 404')
    })
  })

  describe('restoreFile', () => {
    it('restores a deleted file', async () => {
      if (isLive) return
      await verifyApi(() => restoreFile('f1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/files/f1/restore`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('getTrashFiles', () => {
    it('fetches trash files for a ticket', async () => {
      if (isLive) return
      await verifyApi(() => getTrashFiles('ticket-1'), [{ id: 'f1', filename: 'old.pdf' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/files/trash`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  // --- Notification Prefs ---
  describe('getNotificationPrefs', () => {
    it('fetches notification prefs', async () => {
      if (isLive) return
      await verifyApi(() => getNotificationPrefs(), [{ id: 'n1', channel: 'lineworks' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/notification-prefs`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('upsertNotificationPref', () => {
    it('upserts a notification pref', async () => {
      if (isLive) return
      const data = { channel: 'lineworks', target_id: 'u1', enabled: true }
      await verifyApi(
        () => upsertNotificationPref(data as Parameters<typeof upsertNotificationPref>[0]),
        { id: 'n1', ...data },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/notification-prefs`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteNotificationPref', () => {
    it('deletes a notification pref', async () => {
      if (isLive) return
      await verifyApi(() => deleteNotificationPref('n1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/notification-prefs/n1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('getLineworksMembers', () => {
    it('fetches lineworks members', async () => {
      if (isLive) return
      await verifyApi(() => getLineworksMembers(), [{ id: 'u1', name: 'テスト太郎' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/lineworks/members`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  // --- Schedules ---
  describe('createSchedule', () => {
    it('creates a schedule', async () => {
      if (isLive) return
      const data = { ticket_id: 'ticket-1', scheduled_at: '2026-07-01T09:00:00Z', message: '点検' }
      await verifyApi(
        () => createSchedule(data as Parameters<typeof createSchedule>[0]),
        { id: 'sch1', ...data },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/schedules`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('getTicketSchedules', () => {
    it('fetches schedules for a ticket', async () => {
      if (isLive) return
      await verifyApi(() => getTicketSchedules('ticket-1'), [{ id: 'sch1' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/schedules`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('cancelSchedule', () => {
    it('cancels a schedule', async () => {
      if (isLive) return
      await verifyApi(() => cancelSchedule('sch1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/schedules/sch1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Task Types ---
  describe('getTaskTypes', () => {
    it('fetches task types', async () => {
      if (isLive) return
      await verifyApi(() => getTaskTypes(), [{ id: 'tt1', name: '修理' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/task-types`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createTaskType', () => {
    it('creates a task type', async () => {
      if (isLive) return
      await verifyApi(() => createTaskType({ name: '修理' }), { id: 'tt1', name: '修理' })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-types`)
        expect(opts.method).toBe('POST')
        expect(JSON.parse(opts.body)).toEqual({ name: '修理' })
      })
    })
  })

  describe('deleteTaskType', () => {
    it('deletes a task type', async () => {
      if (isLive) return
      await verifyApi(() => deleteTaskType('tt1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-types/tt1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('updateTaskTypeSortOrder', () => {
    it('updates task type sort order', async () => {
      if (isLive) return
      await verifyApi(() => updateTaskTypeSortOrder('tt1', 3), { id: 'tt1', sort_order: 3 })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-types/tt1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 3 })
      })
    })
  })

  // --- Task Statuses ---
  describe('getTaskStatuses', () => {
    it('fetches task statuses', async () => {
      if (isLive) return
      await verifyApi(() => getTaskStatuses(), [{ id: 'ts1', key: 'open', name: '未着手' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/task-statuses`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createTaskStatus', () => {
    it('creates a task status', async () => {
      if (isLive) return
      const data = { key: 'open', name: '未着手' }
      await verifyApi(
        () => createTaskStatus(data as Parameters<typeof createTaskStatus>[0]),
        { id: 'ts1', ...data },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-statuses`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('deleteTaskStatus', () => {
    it('deletes a task status', async () => {
      if (isLive) return
      await verifyApi(() => deleteTaskStatus('ts1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-statuses/ts1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('updateTaskStatusSortOrder', () => {
    it('updates task status sort order', async () => {
      if (isLive) return
      await verifyApi(() => updateTaskStatusSortOrder('ts1', 2), { id: 'ts1', sort_order: 2 })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-statuses/ts1`)
        expect(opts.method).toBe('PUT')
        expect(JSON.parse(opts.body)).toEqual({ sort_order: 2 })
      })
    })
  })

  // --- Tasks ---
  describe('getTasks', () => {
    it('fetches tasks for a ticket', async () => {
      if (isLive) return
      await verifyApi(() => getTasks('ticket-1'), [{ id: 'task-1' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tickets/ticket-1/tasks`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('createTask', () => {
    it('creates a task', async () => {
      if (isLive) return
      const data = { title: 'タスク', assigned_to: '担当A', next_action_by: '担当B' }
      await verifyApi(
        () => createTask('ticket-1', data as Parameters<typeof createTask>[1]),
        { id: 'task-1', ...data },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tickets/ticket-1/tasks`)
        expect(opts.method).toBe('POST')
      })
    })
  })

  describe('updateTask', () => {
    it('updates a task', async () => {
      if (isLive) return
      await verifyApi(
        () => updateTask('task-1', { title: '更新' } as Parameters<typeof updateTask>[1]),
        { id: 'task-1', title: '更新' },
      )
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tasks/task-1`)
        expect(opts.method).toBe('PUT')
      })
    })
  })

  describe('deleteTask', () => {
    it('deletes a task', async () => {
      if (isLive) return
      await verifyApi(() => deleteTask('task-1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tasks/task-1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  // --- Cross-ticket Tasks ---
  describe('listAllTasks', () => {
    it('lists tasks without query', async () => {
      if (isLive) return
      const mockData = { items: [], total: 0, page: 1, per_page: 20 }
      await verifyApi(() => listAllTasks(), mockData)
      assertMock(() => {
        const [url] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/tasks`)
      })
    })

    it('lists tasks with query params, skipping empty values', async () => {
      if (isLive) return
      const mockData = { items: [], total: 0, page: 2, per_page: 50 }
      await verifyApi(
        () => listAllTasks({ status: 'open', q: '', assigned_to: undefined, page: 2, per_page: 50 }),
        mockData,
      )
      assertMock(() => {
        const [url] = mockFetch.mock.calls[0]
        expect(url).toContain('status=open')
        expect(url).toContain('page=2')
        expect(url).not.toContain('q=')
        expect(url).not.toContain('assigned_to')
      })
    })
  })

  // --- Task Files ---
  describe('getTaskFiles', () => {
    it('fetches files for a task', async () => {
      if (isLive) return
      await verifyApi(() => getTaskFiles('task-1'), [{ id: 'f1', filename: 'test.pdf' }])
      assertMock(() => {
        expectMock(mockFetch).toHaveBeenCalledWith(
          `${API_BASE}/api/trouble/tasks/task-1/files`,
          expect.objectContaining({ headers: expect.any(Object) }),
        )
      })
    })
  })

  describe('uploadTaskFile', () => {
    it('uploads a file to a task', async () => {
      if (isLive) return
      const mockData = { id: 'f1', filename: 'test.pdf' }
      stubOk(mockData)
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const result = await uploadTaskFile('task-1', file)
      expect(result).toEqual(mockData)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/api/trouble/tasks/task-1/files`)
      expect(opts.method).toBe('POST')
      expect(opts.body).toBeInstanceOf(FormData)
    })
  })

  describe('downloadTaskFile', () => {
    it('triggers task file download', async () => {
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
        headers: new Headers({ 'Content-Disposition': 'attachment; filename="task.pdf"' }),
      })
      await downloadTaskFile('f1')
      expect(clickMock).toHaveBeenCalled()
      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe(`${API_BASE}/api/trouble/task-files/f1/download`)
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(blobUrl)

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('falls back to "download" filename without Content-Disposition', async () => {
      if (isLive) return
      const clickMock = vi.fn()
      const anchor = { href: '', download: '', click: clickMock }
      const createElementSpy = vi.spyOn(document, 'createElement')
        .mockReturnValue(anchor as unknown as HTMLElement)
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['data'])),
        headers: new Headers(),
      })
      await downloadTaskFile('f1')
      expect(anchor.download).toBe('download')

      createElementSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })

    it('throws on non-ok response', async () => {
      if (isLive) return
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
      await expect(downloadTaskFile('f1')).rejects.toThrow('ダウンロード失敗: 404')
    })
  })

  describe('deleteTaskFile', () => {
    it('deletes a task file', async () => {
      if (isLive) return
      await verifyApi(() => deleteTaskFile('f1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/task-files/f1`)
        expect(opts.method).toBe('DELETE')
      })
    })
  })

  describe('restoreTaskFile', () => {
    it('restores a task file', async () => {
      if (isLive) return
      await verifyApi(() => restoreTaskFile('f1'), {}, { expect204: true })
      assertMock(() => {
        const [url, opts] = mockFetch.mock.calls[0]
        expect(url).toBe(`${API_BASE}/api/trouble/files/f1/restore`)
        expect(opts.method).toBe('POST')
      })
    })
  })
})
