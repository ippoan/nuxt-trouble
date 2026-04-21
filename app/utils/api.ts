import type {
  TroubleTicket,
  CreateTroubleTicket,
  UpdateTroubleTicket,
  TroubleTicketFilter,
  TroubleTicketsResponse,
  TroubleWorkflowState,
  TroubleWorkflowTransition,
  TroubleStatusHistory,
  TroubleFile,
  TroubleCategory,
  CreateTroubleCategory,
  TroubleOffice,
  CreateTroubleOffice,
  TroubleProgressStatus,
  CreateTroubleProgressStatus,
  Employee,
  CreateWorkflowState,
  CreateWorkflowTransition,
  TransitionRequest,
  TroubleNotificationPref,
  UpsertNotificationPref,
  LineworksMember,
  TroubleSchedule,
  CreateTroubleSchedule,
  TroubleTask,
  CreateTroubleTask,
  UpdateTroubleTask,
  TroubleTaskType,
  TroubleTaskStatus,
  CreateTroubleTaskStatus,
} from '~/types'

let apiBase = ''
let getAccessToken: (() => string | null) | null = null
let getTenantId: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function initApi(
  baseUrl: string,
  tokenGetter?: () => string | null,
  _refresher?: () => Promise<void>,
  tenantIdGetter?: () => string | null,
  unauthorizedHandler?: () => void,
) {
  apiBase = baseUrl.replace(/\/$/, '')
  getAccessToken = tokenGetter || null
  getTenantId = tenantIdGetter || null
  onUnauthorized = unauthorizedHandler || null
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getAccessToken?.()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const tid = getTenantId?.()
  if (tid) {
    headers['X-Tenant-ID'] = tid
  }
  return headers
}

function toParams(filter: object): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filter)) {
    if (v != null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** @internal テスト用にも export */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiBase) throw new Error('API 未初期化: initApi() を呼んでください')

  const isFormData = options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...buildAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers })

  if (res.status === 401) {
    onUnauthorized?.()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API エラー (${res.status}): ${body || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// --- Tickets ---

export async function getTickets(filter: TroubleTicketFilter = {}): Promise<TroubleTicketsResponse> {
  return request<TroubleTicketsResponse>(`/api/trouble/tickets${toParams(filter)}`)
}

export async function getTicket(id: string): Promise<TroubleTicket> {
  return request<TroubleTicket>(`/api/trouble/tickets/${encodeURIComponent(id)}`)
}

export async function createTicket(data: CreateTroubleTicket): Promise<TroubleTicket> {
  return request<TroubleTicket>('/api/trouble/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTicket(id: string, data: UpdateTroubleTicket): Promise<TroubleTicket> {
  return request<TroubleTicket>(`/api/trouble/tickets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTicket(id: string): Promise<void> {
  await request<void>(`/api/trouble/tickets/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function exportTicketsCsv(filter: TroubleTicketFilter = {}): Promise<void> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/trouble/tickets/csv${toParams(filter)}`, { headers })
  if (!res.ok) throw new Error(`CSV出力に失敗: ${res.status}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trouble_tickets.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// --- Workflow ---

export async function getWorkflowStates(): Promise<TroubleWorkflowState[]> {
  return request<TroubleWorkflowState[]>('/api/trouble/workflow/states')
}

export async function setupDefaultWorkflow(): Promise<TroubleWorkflowState[]> {
  return request<TroubleWorkflowState[]>('/api/trouble/workflow/setup', {
    method: 'POST',
  })
}

// --- Categories ---

export async function getCategories(): Promise<TroubleCategory[]> {
  return request<TroubleCategory[]>('/api/trouble/categories')
}

export async function createCategory(data: CreateTroubleCategory): Promise<TroubleCategory> {
  return request<TroubleCategory>('/api/trouble/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<void> {
  await request<void>(`/api/trouble/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateCategorySortOrder(id: string, sort_order: number): Promise<TroubleCategory> {
  return request<TroubleCategory>(`/api/trouble/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order }),
  })
}

// --- Offices ---

export async function getOffices(): Promise<TroubleOffice[]> {
  return request<TroubleOffice[]>('/api/trouble/offices')
}

export async function createOffice(data: CreateTroubleOffice): Promise<TroubleOffice> {
  return request<TroubleOffice>('/api/trouble/offices', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteOffice(id: string): Promise<void> {
  await request<void>(`/api/trouble/offices/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateOfficeSortOrder(id: string, sort_order: number): Promise<TroubleOffice> {
  return request<TroubleOffice>(`/api/trouble/offices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order }),
  })
}

// --- Progress Statuses ---

export async function getProgressStatuses(): Promise<TroubleProgressStatus[]> {
  return request<TroubleProgressStatus[]>('/api/trouble/progress-statuses')
}

export async function createProgressStatus(data: CreateTroubleProgressStatus): Promise<TroubleProgressStatus> {
  return request<TroubleProgressStatus>('/api/trouble/progress-statuses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteProgressStatus(id: string): Promise<void> {
  await request<void>(`/api/trouble/progress-statuses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateProgressStatusSortOrder(id: string, sort_order: number): Promise<TroubleProgressStatus> {
  return request<TroubleProgressStatus>(`/api/trouble/progress-statuses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order }),
  })
}

// --- Employees ---

export async function getEmployees(): Promise<Employee[]> {
  return request<Employee[]>('/api/employees')
}

// --- Car Inspection (車検証) ---

export interface CarInspectionListResponse {
  carInspections: Array<Record<string, unknown>>
}

export async function getCarInspectionsCurrent(): Promise<CarInspectionListResponse> {
  return request<CarInspectionListResponse>('/api/car-inspections/current')
}

// --- Workflow Management ---

export async function getWorkflowTransitions(): Promise<TroubleWorkflowTransition[]> {
  return request<TroubleWorkflowTransition[]>('/api/trouble/workflow/transitions')
}

export async function createWorkflowState(data: CreateWorkflowState): Promise<TroubleWorkflowState> {
  return request<TroubleWorkflowState>('/api/trouble/workflow/states', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteWorkflowState(id: string): Promise<void> {
  await request<void>(`/api/trouble/workflow/states/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function createWorkflowTransition(data: CreateWorkflowTransition): Promise<TroubleWorkflowTransition> {
  return request<TroubleWorkflowTransition>('/api/trouble/workflow/transitions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteWorkflowTransition(id: string): Promise<void> {
  await request<void>(`/api/trouble/workflow/transitions/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- Status History ---

export async function getStatusHistory(ticketId: string): Promise<TroubleStatusHistory[]> {
  return request<TroubleStatusHistory[]>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/history`)
}

// --- Status Transition ---

export async function transitionTicket(ticketId: string, data: TransitionRequest): Promise<void> {
  await request<void>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/transition`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// --- Files ---

export async function getFiles(ticketId: string): Promise<TroubleFile[]> {
  return request<TroubleFile[]>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/files`)
}

export async function uploadFile(ticketId: string, file: File): Promise<TroubleFile> {
  const formData = new FormData()
  formData.append('file', file)
  return request<TroubleFile>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/files`, {
    method: 'POST',
    body: formData,
  })
}

export async function downloadFile(fileId: string): Promise<void> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/trouble/files/${encodeURIComponent(fileId)}/download`, { headers })
  if (!res.ok) throw new Error(`ダウンロード失敗: ${res.status}`)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || 'download'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function getFileBlobUrl(fileId: string): Promise<string> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/trouble/files/${encodeURIComponent(fileId)}/download`, { headers })
  if (!res.ok) throw new Error(`ファイル取得失敗: ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export async function deleteFile(fileId: string): Promise<void> {
  await request<void>(`/api/trouble/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
}

export async function restoreFile(fileId: string): Promise<void> {
  await request<void>(`/api/trouble/files/${encodeURIComponent(fileId)}/restore`, { method: 'POST' })
}

export async function getTrashFiles(ticketId: string): Promise<TroubleFile[]> {
  return request<TroubleFile[]>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/files/trash`)
}

// --- Notification Prefs ---

export async function getNotificationPrefs(): Promise<TroubleNotificationPref[]> {
  return request<TroubleNotificationPref[]>('/api/trouble/notification-prefs')
}

export async function upsertNotificationPref(data: UpsertNotificationPref): Promise<TroubleNotificationPref> {
  return request<TroubleNotificationPref>('/api/trouble/notification-prefs', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteNotificationPref(id: string): Promise<void> {
  await request<void>(`/api/trouble/notification-prefs/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getLineworksMembers(): Promise<LineworksMember[]> {
  return request<LineworksMember[]>('/api/trouble/lineworks/members')
}

// --- Schedules ---

export async function createSchedule(data: CreateTroubleSchedule): Promise<TroubleSchedule> {
  return request<TroubleSchedule>('/api/trouble/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getTicketSchedules(ticketId: string): Promise<TroubleSchedule[]> {
  return request<TroubleSchedule[]>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/schedules`)
}

export async function cancelSchedule(id: string): Promise<void> {
  await request<void>(`/api/trouble/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// --- Task Types ---

export async function getTaskTypes(): Promise<TroubleTaskType[]> {
  return request<TroubleTaskType[]>('/api/trouble/task-types')
}

export async function createTaskType(data: { name: string; sort_order?: number }): Promise<TroubleTaskType> {
  return request<TroubleTaskType>('/api/trouble/task-types', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteTaskType(id: string): Promise<void> {
  await request<void>(`/api/trouble/task-types/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateTaskTypeSortOrder(id: string, sortOrder: number): Promise<TroubleTaskType> {
  return request<TroubleTaskType>(`/api/trouble/task-types/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order: sortOrder }),
  })
}

// --- Task Statuses (dynamic master) ---

export async function getTaskStatuses(): Promise<TroubleTaskStatus[]> {
  return request<TroubleTaskStatus[]>('/api/trouble/task-statuses')
}

export async function createTaskStatus(data: CreateTroubleTaskStatus): Promise<TroubleTaskStatus> {
  return request<TroubleTaskStatus>('/api/trouble/task-statuses', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteTaskStatus(id: string): Promise<void> {
  await request<void>(`/api/trouble/task-statuses/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function updateTaskStatusSortOrder(id: string, sort_order: number): Promise<TroubleTaskStatus> {
  return request<TroubleTaskStatus>(`/api/trouble/task-statuses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ sort_order }),
  })
}

// --- Tasks ---

export async function getTasks(ticketId: string): Promise<TroubleTask[]> {
  return request<TroubleTask[]>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/tasks`)
}

export async function createTask(ticketId: string, data: CreateTroubleTask): Promise<TroubleTask> {
  return request<TroubleTask>(`/api/trouble/tickets/${encodeURIComponent(ticketId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateTask(taskId: string, data: UpdateTroubleTask): Promise<TroubleTask> {
  return request<TroubleTask>(`/api/trouble/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  await request<void>(`/api/trouble/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' })
}

// --- Cross-ticket Tasks (状況管理) ---

export interface ListTasksQuery {
  ticket_id?: string
  /** task status key — now a dynamic master key (not a fixed union) */
  status?: string
  task_type?: string
  assigned_to?: string
  q?: string
  due_from?: string
  due_to?: string
  occurred_from?: string
  occurred_to?: string
  sort_by?: 'created_at' | 'occurred_at' | 'due_date' | 'next_action_due' | 'status'
  sort_desc?: boolean
  page?: number
  per_page?: number
}

export interface ListTasksResponse {
  items: TroubleTask[]
  total: number
  page: number
  per_page: number
}

export async function listAllTasks(q: ListTasksQuery = {}): Promise<ListTasksResponse> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return request<ListTasksResponse>(`/api/trouble/tasks${qs ? `?${qs}` : ''}`)
}

// --- Task Files ---

export async function getTaskFiles(taskId: string): Promise<TroubleFile[]> {
  return request<TroubleFile[]>(`/api/trouble/tasks/${encodeURIComponent(taskId)}/files`)
}

export async function uploadTaskFile(taskId: string, file: File): Promise<TroubleFile> {
  const formData = new FormData()
  formData.append('file', file)
  return request<TroubleFile>(`/api/trouble/tasks/${encodeURIComponent(taskId)}/files`, {
    method: 'POST',
    body: formData,
  })
}

export async function downloadTaskFile(fileId: string): Promise<void> {
  const headers = buildAuthHeaders()
  const res = await fetch(`${apiBase}/api/trouble/task-files/${encodeURIComponent(fileId)}/download`, { headers })
  if (!res.ok) throw new Error(`ダウンロード失敗: ${res.status}`)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const filename = disposition?.match(/filename="?(.+?)"?$/)?.[1] || 'download'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function deleteTaskFile(fileId: string): Promise<void> {
  await request<void>(`/api/trouble/task-files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
}

export async function restoreTaskFile(fileId: string): Promise<void> {
  await request<void>(`/api/trouble/files/${encodeURIComponent(fileId)}/restore`, { method: 'POST' })
}
