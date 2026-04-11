import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { allStubs } from '../helpers/nuxt-stubs'

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { authWorkerUrl: 'https://auth.example.com' },
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
  getNotificationPrefs: vi.fn().mockResolvedValue([]),
  upsertNotificationPref: vi.fn(),
  deleteNotificationPref: vi.fn(),
  getLineworksMembers: vi.fn().mockResolvedValue([]),
}))

import SettingsPage from '~/pages/settings.vue'

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

  it('renders heading', async () => {
    const wrapper = mount(SettingsPage, {
      global: { stubs: allStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('設定')
  })
})
