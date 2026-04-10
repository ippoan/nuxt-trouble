import { initApi } from '~/utils/api'

export function useAppInit() {
  const config = useRuntimeConfig()
  const { init, accessToken, tenantId, isLoading } = useAuth()
  const apiBase = config.public.apiBase as string
  const stagingTenantId = (config.public.stagingTenantId as string) || ''

  async function setup() {
    initApi(
      apiBase,
      () => accessToken.value,
      undefined,
      () => tenantId.value,
    )
    await init()
  }

  return { apiBase, stagingTenantId, isLoading, setup }
}
