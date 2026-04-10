// Re-export ts-rs generated types
export type {
  TroubleTicket,
  CreateTroubleTicket,
  UpdateTroubleTicket,
  TroubleTicketFilter,
  TroubleTicketsResponse,
  TroubleWorkflowState,
  TroubleWorkflowTransition,
  TroubleFile,
  TroubleComment,
  TroubleStatusHistory,
  TransitionRequest,
} from './generated'

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
