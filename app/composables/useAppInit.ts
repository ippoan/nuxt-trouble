import { initApi } from '~/utils/api'

export function useAppInit() {
  const config = useRuntimeConfig()
  const { loadFromStorage, token, orgId, isLoading, clearAuth } = useAuth()
  const apiBase = config.public.apiBase as string
  const stagingTenantId = (config.public.stagingTenantId as string) || ''

  async function setup() {
    initApi(
      apiBase,
      () => token.value,
      undefined,
      () => orgId.value,
      () => {
        clearAuth()
        navigateTo('/login')
      },
    )
    loadFromStorage()
  }

  return { apiBase, stagingTenantId, isLoading, setup }
}
