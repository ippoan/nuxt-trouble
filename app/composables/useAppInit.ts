import { initApi } from '~/utils/api'

export function useAppInit() {
  const config = useRuntimeConfig()
  const { loadFromStorage, recoverFromCookie, isAuthenticated, token, isLoading, clearAuth } =
    useAuth()
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
    // localStorage から復元 → 未認証なら共有 cookie (Domain=.ippoan.org の
    // logi_auth_token) から復旧する。トップページや他アプリで既にログイン済みの
    // 場合に、trouble へ遷移しただけで /login にバウンスするのを防ぐ
    // (initAuthSession の step 2 + 2.5 相当、Refs ippoan/auth-worker#257)。
    loadFromStorage()
    if (!isAuthenticated.value) {
      recoverFromCookie()
    }
  }

  return { apiBase, stagingTenantId, isLoading, setup }
}
