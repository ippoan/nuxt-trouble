export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/login', '/auth/callback']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  // Staging auth bypass
  const config = useRuntimeConfig()
  if (config.public.stagingTenantId) return

  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading.value) return
  if (!isAuthenticated.value) {
    const authWorkerUrl = config.public.authWorkerUrl as string
    if (authWorkerUrl) {
      const callbackUrl = `${window.location.origin}/auth/callback`
      window.location.href = `${authWorkerUrl}/oauth/google/redirect?redirect_uri=${encodeURIComponent(callbackUrl)}`
      return false
    }
    return navigateTo('/login')
  }
})
