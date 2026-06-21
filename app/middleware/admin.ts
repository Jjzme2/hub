export default defineNuxtRouteMiddleware(async () => {
  const user = useCurrentUser()

  // Wait for Firebase auth state to resolve (undefined = still loading)
  if (user.value === undefined) {
    await new Promise<void>(resolve => {
      const stop = watch(user, val => {
        if (val !== undefined) { stop(); resolve() }
      })
    })
  }

  if (!user.value) {
    return navigateTo('/auth/login')
  }

  const store = useAuthStore()

  if (store.isAdminLoading) {
    await new Promise<void>(resolve => {
      const stop = watch(() => store.isAdminLoading, loading => {
        if (!loading) { stop(); resolve() }
      })
    })
  }

  if (!store.isAdmin) {
    return navigateTo('/')
  }
})
