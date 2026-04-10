<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { loginWithGoogleRedirect } = useAuth()
const config = useRuntimeConfig()

onMounted(() => {
  const authWorkerUrl = config.public.authWorkerUrl as string
  if (authWorkerUrl) {
    const callbackUrl = `${window.location.origin}/auth/callback`
    window.location.href = `${authWorkerUrl}/oauth/google/redirect?redirect_uri=${encodeURIComponent(callbackUrl)}`
  }
})
</script>

<template>
  <UCard class="w-full max-w-sm">
    <div class="text-center space-y-4">
      <h1 class="text-2xl font-bold">トラブル管理</h1>
      <p class="text-sm text-gray-500">トラブル・事故管理システム</p>
      <UButton
        label="Google でログイン"
        icon="i-lucide-log-in"
        size="lg"
        block
        @click="loginWithGoogleRedirect()"
      />
    </div>
  </UCard>
</template>
