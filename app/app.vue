<script setup lang="ts">
import { initApi } from '~/utils/api'
import { StagingFooter } from '@ippoan/auth-client'

const config = useRuntimeConfig()
const { init, accessToken, tenantId, isLoading } = useAuth()
const apiBase = config.public.apiBase as string
const stagingTenantId = (config.public.stagingTenantId as string) || ''

onMounted(async () => {
  initApi(
    apiBase,
    () => accessToken.value,
    undefined,
    () => tenantId.value,
  )
  await init()
})
</script>

<template>
  <UApp>
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <UIcon name="i-lucide-loader-circle" class="animate-spin size-8 text-gray-400" />
    </div>
    <NuxtLayout v-else>
      <NuxtPage />
    </NuxtLayout>
    <StagingFooter :api-base="apiBase" :tenant-id="stagingTenantId" />
  </UApp>
</template>
