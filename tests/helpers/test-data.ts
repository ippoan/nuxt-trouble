/* v8 ignore start */
import type { TroubleTicket, TroubleWorkflowState } from '~/types'

export function makeTroubleTicket(overrides: Partial<TroubleTicket> = {}): TroubleTicket {
  return {
    id: 'ticket-1', tenant_id: 'tenant-1', ticket_no: 1,
    category: '貨物事故', title: 'テストチケット',
    occurred_at: null, occurred_date: '2026-01-15',
    company_name: 'テスト会社', office_name: 'テスト営業所',
    department: 'テスト部署', person_name: 'テスト太郎', person_id: null,
    vehicle_number: '品川 100 あ 1234', location: '東京都',
    description: 'テスト説明', status_id: 'state-1', assigned_to: null,
    progress_notes: '', allowance: '',
    damage_amount: '10000', compensation_amount: '5000',
    confirmation_notice: '', disciplinary_content: '',
    road_service_cost: '3000', counterparty: '相手方テスト',
    counterparty_insurance: '相手保険テスト', custom_fields: null,
    due_date: '2026-02-15T00:00:00', overdue_notified_at: null,
    created_by: null, created_at: '2026-01-10T00:00:00',
    updated_at: '2026-01-10T00:00:00', deleted_at: null,
    ...overrides,
  }
}

export function makeWorkflowState(overrides: Partial<TroubleWorkflowState> = {}): TroubleWorkflowState {
  return {
    id: 'state-1', tenant_id: 'tenant-1', name: 'new', label: '新規',
    color: '#3b82f6', sort_order: 1, is_initial: true, is_terminal: false,
    created_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}
