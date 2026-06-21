export default defineNuxtRouteMiddleware(async () => {
  const user = useCurrentUser()

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
})
