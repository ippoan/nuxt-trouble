// Re-export ts-rs generated types
export type {
  TroubleTicket,
  CreateTroubleTicket,
  UpdateTroubleTicket,
  TroubleWorkflowState,
  TroubleWorkflowTransition,
  TroubleFile,
  TroubleComment,
  TroubleStatusHistory,
  TransitionRequest,
} from './generated'

// Override ts-rs i64 → number for frontend use
export type { TroubleTicketFilter as _TsRsTroubleTicketFilter } from './generated'
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

export type { TroubleTicketsResponse as _TsRsTroubleTicketsResponse } from './generated'
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
