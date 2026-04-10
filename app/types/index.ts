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
