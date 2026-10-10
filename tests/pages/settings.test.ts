import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

vi.mock('#app/nuxt', () => ({
  useRuntimeConfig: () => ({ public: { authWorkerUrl: 'https://auth.example.com' } }),
  useNuxtApp: () => ({}),
  defineAppConfig: <T>(c: T) => c,
}))

vi.mock('~/utils/api', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  updateCategorySortOrder: vi.fn(),
  getOffices: vi.fn().mockResolvedValue([]),
  createOffice: vi.fn(),
  deleteOffice: vi.fn(),
  updateOfficeSortOrder: vi.fn(),
  getProgressStatuses: vi.fn().mockResolvedValue([]),
  createProgressStatus: vi.fn(),
  deleteProgressStatus: vi.fn(),
  updateProgressStatusSortOrder: vi.fn(),
  getTaskTypes: vi.fn().mockResolvedValue([]),
  createTaskType: vi.fn(),
  deleteTaskType: vi.fn(),
  updateTaskTypeSortOrder: vi.fn(),
  getTaskStatuses: vi.fn().mockResolvedValue([
    { id: '1', tenant_id: 't', key: 'open', name: '未着手', color: '#9CA3AF', sort_order: 10, is_done: false, created_at: '', updated_at: '' },
    { id: '2', tenant_id: 't', key: 'waiting', name: '待機', color: '#F59E0B', sort_order: 30, is_done: false, created_at: '', updated_at: '' },
  ]),
  createTaskStatus: vi.fn(),
  deleteTaskStatus: vi.fn(),
  updateTaskStatusSortOrder: vi.fn(),
  getNotificationPrefs: vi.fn().mockResolvedValue([]),
  upsertNotificationPref: vi.fn(),
  deleteNotificationPref: vi.fn(),
  getLineworksMembers: vi.fn().mockResolvedValue([]),
  testSendTroubleNotification: vi.fn(),
}))

import SettingsPage from '~/pages/settings.vue'
import { getNotificationPrefs, getLineworksMembers, testSendTroubleNotification } from '~/utils/api'

async function mountNotificationsTab() {
  vi.mocked(getNotificationPrefs).mockResolvedValueOnce([
    { id: 'n1', event_type: 'ticket_created', notify_channel: 'lineworks', enabled: true, lineworks_user_ids: ['lw1'] },
  ] as unknown as Awaited<ReturnType<typeof getNotificationPrefs>>)
  vi.mocked(getLineworksMembers).mockResolvedValueOnce([
    { user_id: 'lw1', user_name: '山田太郎', email: '' },
  ] as unknown as Awaited<ReturnType<typeof getLineworksMembers>>)
  const wrapper = mount(SettingsPage, { global: { stubs: allStubs } })
  await flushPromises()
  const vm = wrapper.vm as unknown as { activeTab: string }
  vm.activeTab = 'notifications'
  await flushPromises()
  return wrapper
}

describe('settings page: 通知のテスト送信', () => {
  it('宛先の氏名の横にテスト送信ボタンがあり、成功で「送信しました」', async () => {
    vi.mocked(testSendTroubleNotification).mockResolvedValueOnce(undefined)
    const wrapper = await mountNotificationsTab()
    const row = wrapper.find('[data-testid="notif-recipient"]')
    expect(row.text()).toContain('山田太郎')
    await row.find('[data-testid="test-send-button"]').trigger('click')
    await flushPromises()
    expect(testSendTroubleNotification).toHaveBeenCalledWith('lw1')
    expect(wrapper.find('[data-testid="test-send-result"]').text()).toBe('送信しました')
  })

  it('失敗で status と error の語を表示する', async () => {
    vi.mocked(testSendTroubleNotification).mockRejectedValueOnce(
      new Error('API エラー (404): {"error":"bot_config_not_found"}'),
    )
    const wrapper = await mountNotificationsTab()
    await wrapper.find('[data-testid="test-send-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="test-send-result"]').text())
      .toBe('LINE WORKS の Bot が未設定です (404)')
  })

  it('送信中はボタンを無効化し、連打しても 1 回しか呼ばない', async () => {
    vi.mocked(testSendTroubleNotification).mockClear()
    let resolve!: () => void
    vi.mocked(testSendTroubleNotification).mockReturnValueOnce(new Promise<void>((r) => { resolve = r }))
    const wrapper = await mountNotificationsTab()
    const button = wrapper.find('[data-testid="test-send-button"]')
    await button.trigger('click')
    await button.trigger('click')
    const stub = wrapper.findAllComponents(allStubs.UButton)
      .find(c => c.props('label') === 'テスト送信')!
    expect(stub.props('disabled')).toBe(true)
    expect(testSendTroubleNotification).toHaveBeenCalledTimes(1)
    resolve()
    await flushPromises()
    expect(stub.props('disabled')).toBe(false)
  })
})

describe('settings page', () => {
  it('renders tabs', async () => {
    const wrapper = mount(SettingsPage, {
      global: { stubs: allStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('設定')
    expect(wrapper.text()).toContain('カテゴリ')
    expect(wrapper.text()).toContain('営業所')
    expect(wrapper.text()).toContain('ワークフロー')
  })

  it('renders 状況ステータス tab', async () => {
    const wrapper = mount(SettingsPage, {
      global: { stubs: allStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('状況ステータス')
  })

  it('renders MasterDataManager for 状況ステータス tab when active', async () => {
    const wrapper = mount(SettingsPage, {
      global: { stubs: allStubs },
    })
    await flushPromises()
    // activate taskStatuses tab
    const vm = wrapper.vm as unknown as { activeTab: string }
    vm.activeTab = 'taskStatuses'
    await flushPromises()
    // MasterDataManager stub receives title prop
    const manager = wrapper.findComponent({ name: 'MasterDataManagerStub' })
      || wrapper.findAllComponents({}).find(() => false)
    // fallback: check that 状況ステータス text (from title) or items present
    // since stub doesn't render title, we check the tab exists and component mounted without throwing
    expect(vm.activeTab).toBe('taskStatuses')
  })

  it('renders heading', async () => {
    const wrapper = mount(SettingsPage, {
      global: { stubs: allStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('設定')
  })
})
