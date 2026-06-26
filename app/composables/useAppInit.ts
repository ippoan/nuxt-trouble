import { initApi } from '~/utils/api'

export function useAppInit() {
  const config = useRuntimeConfig()
  const { loadFromStorage, token, isLoading, clearAuth } = useAuth()
  const apiBase = config.public.apiBase as string
  const stagingTenantId = (config.public.stagingTenantId as string) || ''

  async function setup() {
    // #434 step 2: ブラウザは rust-alc-api を直叩きせず、同一 Worker の
    // /api/proxy/* server route 経由で叩く。proxy が Bearer JWT を introspect
    // 検証して X-Tenant-ID / X-User-* を注入するので、client 側で tenant を
    // 手動付与しない (tenantIdGetter を渡さない)。
    initApi(
      '/api/proxy',
      () => token.value,
      undefined,
      undefined,
      () => {
        clearAuth()
        navigateTo('/login')
      },
    )
    loadFromStorage()
  }

  return { apiBase, stagingTenantId, isLoading, setup }
}
