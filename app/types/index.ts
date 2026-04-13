// Re-export ts-rs generated types (ones that work as-is)
export type {
  TroubleTicket,
  TroubleWorkflowState,
  TroubleWorkflowTransition,
  TroubleFile,
  TroubleComment,
  TroubleStatusHistory,
  TransitionRequest,
} from './generated'

// Override: ts-rs makes Option<T> fields required (T | null),
// but they should be optional for create/update payloads.
export interface CreateTroubleTicket {
  category: string
  title?: string | null
  occurred_at?: string | null
  occurred_date?: string | null
  company_name?: string | null
  office_name?: string | null
  department?: string | null
  person_name?: string | null
  person_id?: string | null
  vehicle_number?: string | null
  location?: string | null
  description?: string | null
  assigned_to?: string | null
  damage_amount?: number | null
  compensation_amount?: number | null
  road_service_cost?: number | null
  counterparty?: string | null
  counterparty_insurance?: string | null
  custom_fields?: Record<string, unknown> | null
  due_date?: string | null
}

export interface UpdateTroubleTicket {
  category?: string | null
  title?: string | null
  occurred_at?: string | null
  occurred_date?: string | null
  company_name?: string | null
  office_name?: string | null
  department?: string | null
  person_name?: string | null
  person_id?: string | null
  vehicle_number?: string | null
  location?: string | null
  description?: string | null
  assigned_to?: string | null
  progress_notes?: string | null
  allowance?: string | null
  damage_amount?: number | null
  compensation_amount?: number | null
  confirmation_notice?: string | null
  disciplinary_content?: string | null
  disciplinary_action?: string | null
  road_service_cost?: number | null
  counterparty?: string | null
  counterparty_insurance?: string | null
  custom_fields?: Record<string, unknown> | null
  due_date?: string | null
}

// Override: ts-rs i64 → bigint, but frontend uses number
export interface TroubleTicketFilter {
  category?: string | null
  status_id?: string | null
  person_name?: string | null
  company_name?: string | null
  office_name?: string | null
  date_from?: string | null
  date_to?: string | null
  q?: string | null
  page?: number | null
  per_page?: number | null
}

export interface TroubleTicketsResponse {
  tickets: import('./generated').TroubleTicket[]
  total: number
  page: number
  per_page: number
}

// UI constants
export const TICKET_CATEGORIES = [
  '苦情・トラブル',
  '貨物事故',
  '被害事故',
  '対物事故(他損)',
  '対物事故(自損)',
  '人身事故',
  'その他',
] as const

export type TicketCategory = typeof TICKET_CATEGORIES[number]

export interface TroubleCategory {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface CreateTroubleCategory {
  name: string
  sort_order?: number
}

export interface TroubleOffice {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface CreateTroubleOffice {
  name: string
  sort_order?: number
}

export interface TroubleProgressStatus {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface CreateTroubleProgressStatus {
  name: string
  sort_order?: number
}

export interface Employee {
  id: string
  tenant_id: string
  name: string
  code: string | null
}

// Re-export generated types used by new components
export type { CreateWorkflowState, CreateWorkflowTransition } from './generated'

// --- Notification Prefs ---
export interface TroubleNotificationPref {
  id: string
  tenant_id: string
  event_type: string
  notify_channel: string
  enabled: boolean
  recipient_ids: string[]
  notify_admins: boolean
  lineworks_user_ids: string[]
  created_at: string
  updated_at: string
}

export interface UpsertNotificationPref {
  event_type: string
  notify_channel: string
  enabled?: boolean | null
  recipient_ids?: string[] | null
  notify_admins?: boolean | null
  lineworks_user_ids?: string[] | null
}

// --- Schedules ---
export interface TroubleSchedule {
  id: string
  tenant_id: string
  ticket_id: string
  scheduled_at: string
  message: string
  lineworks_user_ids: string[]
  cloud_task_name: string | null
  status: string
  created_by: string | null
  created_at: string
  sent_at: string | null
}

export interface CreateTroubleSchedule {
  ticket_id: string
  scheduled_at: string
  message: string
  lineworks_user_ids: string[]
}

// --- LINE WORKS Members ---
export interface LineworksMember {
  user_id: string
  user_name: string | null
  email: string | null
}

// --- Tasks ---
export interface TroubleTask {
  id: string
  tenant_id: string
  ticket_id: string
  task_type: string
  title: string
  description: string | null
  status: string
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  sort_order: number
  next_action: string
  next_action_detail: string
  next_action_by: string | null
  next_action_due: string | null
  occurred_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTroubleTask {
  task_type: string
  title: string
  description?: string | null
  assigned_to?: string | null
  due_date?: string | null
  sort_order?: number | null
  next_action?: string
  next_action_detail?: string
  next_action_by?: string | null
  next_action_due?: string | null
  occurred_at?: string | null
}

export interface UpdateTroubleTask {
  task_type?: string | null
  title?: string | null
  description?: string | null
  status?: string | null
  assigned_to?: string | null
  due_date?: string | null
  completed_at?: string | null
  sort_order?: number | null
  next_action?: string
  next_action_detail?: string
  next_action_by?: string | null
  next_action_due?: string | null
  occurred_at?: string | null
}

export interface TroubleTaskType {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

export const DEFAULT_TASK_TYPES = [
  'レッカー対応',
  '修理手配',
  '保険対応',
  '示談交渉',
  '処分決定',
  '再発防止策',
  '現場確認',
  'その他',
] as const

export const TASK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: '未着手', color: '#9CA3AF' },
  in_progress: { label: '進行中', color: '#3B82F6' },
  done: { label: '完了', color: '#10B981' },
}

export const NOTIFICATION_EVENT_TYPES: { value: string; label: string }[] = [
  { value: 'trouble_created', label: 'チケット作成' },
  { value: 'trouble_status_changed', label: 'ステータス変更' },
  { value: 'trouble_comment_added', label: 'コメント追加' },
  { value: 'trouble_assigned', label: '担当者アサイン' },
  { value: 'task_assigned', label: 'タスクアサイン' },
  { value: 'task_due_reminder', label: 'タスク期限リマインダー' },
]
