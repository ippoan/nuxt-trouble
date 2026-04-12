<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { redirectToLogin } = useAuth()
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
        @click="redirectToLogin({ provider: 'google', callbackPath: '/auth/callback' })"
      />
    </div>
  </UCard>
</template>
