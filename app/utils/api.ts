import type {
  TroubleTicket,
  CreateTroubleTicket,
  UpdateTroubleTicket,
  TroubleTicketFilter,
  TroubleTicketsResponse,
  TroubleWorkflowState,
} from '~/types'

let apiBase = ''
let getAccessToken: (() => string | null) | null = null
let getTenantId: (() => string | null) | null = null

export function initApi(
  baseUrl: string,
  tokenGetter?: () => string | null,
  _refresher?: () => Promise<void>,
  tenantIdGetter?: () => string | null,
) {
  apiBase = baseUrl.replace(/\/$/, '')
  getAccessToken = tokenGetter || null
  getTenantId = tenantIdGetter || null
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!apiBase) throw new Error('API 未初期化: initApi() を呼んでください')

  /* v8 ignore next 4 -- no public API uses FormData yet */
  const isFormData = options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...buildAuthHeaders(),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${apiBase}${path}`, { ...options, headers })

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
