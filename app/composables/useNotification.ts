// Module-level singleton so sound preference survives route changes
const _soundEnabled = import.meta.client
  ? ref(localStorage.getItem('suite:notify:sound') !== 'false')
  : ref(true)

type NotifyOptions = { description?: string; sound?: boolean }

type ErrorOptions = {
  description?: string
  /** Raw caught error — message + stack will be captured for the Copy button */
  error?: unknown
  /** Optional error code (e.g. Firebase auth/wrong-password) */
  code?: string
  sound?: boolean
}

function playTone(type: 'success' | 'error' | 'warning' | 'info') {
  if (!_soundEnabled.value || !import.meta.client) return
  try {
    const ctx = new AudioContext()

    function note(
      freq: number,
      shape: OscillatorType,
      startAt: number,
      dur: number,
      vol = 0.12
    ) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = shape
      osc.frequency.value = freq
      gain.gain.setValueAtTime(vol, ctx.currentTime + startAt)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur)
      osc.start(ctx.currentTime + startAt)
      osc.stop(ctx.currentTime + startAt + dur + 0.02)
    }

    switch (type) {
      case 'success':
        note(880, 'sine', 0, 0.1)
        note(1100, 'sine', 0.1, 0.15)
        break
      case 'error':
        note(330, 'square', 0, 0.12, 0.08)
        note(220, 'square', 0.15, 0.18, 0.08)
        break
      case 'warning':
        note(440, 'triangle', 0, 0.22, 0.1)
        break
      case 'info':
        note(660, 'sine', 0, 0.1, 0.08)
        break
    }
  }
  catch {}
}

function buildErrorCopyText(title: string, opts: ErrorOptions & { description?: string }): string {
  const lines: string[] = [
    `Error: ${title}`,
    opts.description ? `Description: ${opts.description}` : '',
    opts.code ? `Code: ${opts.code}` : '',
  ]

  if (opts.error instanceof Error) {
    lines.push(`Message: ${opts.error.message}`)
    if (opts.error.stack) lines.push(`\nStack Trace:\n${opts.error.stack}`)
  }
  else if (opts.error !== undefined) {
    try { lines.push(`Raw Error: ${JSON.stringify(opts.error, null, 2)}`) }
    catch { lines.push(`Raw Error: ${String(opts.error)}`) }
  }

  lines.push(`\nTimestamp: ${new Date().toISOString()}`)
  return lines.filter(Boolean).join('\n')
}

function extractMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return undefined
}

export function useNotification() {
  const toast = useToast()

  const soundEnabled = readonly(_soundEnabled)

  function setSoundEnabled(val: boolean) {
    _soundEnabled.value = val
    if (import.meta.client) localStorage.setItem('suite:notify:sound', String(val))
  }

  function success(title: string, opts: NotifyOptions = {}) {
    if (opts.sound !== false) playTone('success')
    toast.add({ title, description: opts.description, color: 'success', icon: 'i-lucide-circle-check', duration: 4000 })
  }

  function info(title: string, opts: NotifyOptions = {}) {
    if (opts.sound !== false) playTone('info')
    toast.add({ title, description: opts.description, color: 'info', icon: 'i-lucide-info', duration: 5000 })
  }

  function warning(title: string, opts: NotifyOptions = {}) {
    if (opts.sound !== false) playTone('warning')
    toast.add({ title, description: opts.description, color: 'warning', icon: 'i-lucide-triangle-alert', duration: 8000 })
  }

  function error(title: string, opts: ErrorOptions = {}) {
    if (opts.sound !== false) playTone('error')

    const description = opts.description ?? extractMessage(opts.error)
    const copyText = buildErrorCopyText(title, { ...opts, description })
    const hasDetail = !!(opts.error || opts.code)

    toast.add({
      title,
      description,
      color: 'error',
      icon: 'i-lucide-circle-x',
      orientation: 'vertical',
      duration: 0,
      actions: hasDetail
        ? [{
            label: 'Copy Error',
            icon: 'i-lucide-copy',
            color: 'error' as const,
            variant: 'ghost' as const,
            size: 'xs' as const,
            onClick: async () => {
              await navigator.clipboard.writeText(copyText)
              toast.add({ title: 'Copied to clipboard', color: 'neutral', icon: 'i-lucide-copy-check', duration: 2000 })
            }
          }]
        : undefined
    })
  }

  return { success, info, warning, error, soundEnabled, setSoundEnabled }
}
