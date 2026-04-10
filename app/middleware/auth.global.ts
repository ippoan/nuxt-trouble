export default defineNuxtRouteMiddleware((to) => {
  const publicPaths = ['/login', '/auth/callback']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading.value) return
  if (!isAuthenticated.value) {
    const config = useRuntimeConfig()
    const authWorkerUrl = config.public.authWorkerUrl as string
    if (authWorkerUrl) {
      const callbackUrl = `${window.location.origin}/auth/callback`
      window.location.href = `${authWorkerUrl}/oauth/google/login?redirect_uri=${encodeURIComponent(callbackUrl)}`
      return false
    }
    return navigateTo('/login')
  }
})
