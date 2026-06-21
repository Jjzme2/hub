import { Resend } from 'resend'

let _client: Resend | null = null

function getClient(): Resend {
  if (!_client) {
    const config = useRuntimeConfig()
    if (!config.resendApiKey) throw new Error('NUXT_RESEND_API_KEY is not set')
    _client = new Resend(config.resendApiKey)
  }
  return _client
}

export async function sendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
}) {
  const config = useRuntimeConfig()
  const from = opts.from ?? config.resendFrom
  if (!from) throw new Error('NUXT_RESEND_FROM is not set')

  const { data, error } = await getClient().emails.send({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    reply_to: opts.replyTo
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}
