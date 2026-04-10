-- Integration test seed data
-- Runs AFTER migrations

SET search_path TO alc_api;

-- Test tenant
INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Company', 'test-company');

-- Setup default trouble workflow for test tenant
SELECT set_config('app.current_tenant_id', '11111111-1111-1111-1111-111111111111', false);

INSERT INTO trouble_workflow_states (id, tenant_id, name, label, color, sort_order, is_initial, is_terminal) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '新規', '新規', '#3B82F6', 0, true, false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '対応中', '対応中', '#F59E0B', 1, false, false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '解決済み', '解決済み', '#10B981', 2, false, true);

INSERT INTO trouble_workflow_transitions (tenant_id, from_state_id, to_state_id, label) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '対応開始'),
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '解決');
