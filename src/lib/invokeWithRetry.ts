import type { SupabaseClient } from '@supabase/supabase-js'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Build an Authorization header with a guaranteed-fresh access token.
 *
 * `functions.invoke` sends whatever access token the client currently holds
 * WITHOUT refreshing it first, so a stale token (common after the tab has been
 * open for a while) reaches the function and its `auth.getUser()` returns null
 * → "Not authenticated". We proactively refresh when the token is missing or
 * near expiry so admin-guarded functions always see a valid caller.
 */
async function freshAuthHeader(
  supabase: SupabaseClient,
): Promise<Record<string, string> | undefined> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return undefined

  const expiresSoon =
    !session.expires_at || session.expires_at * 1000 < Date.now() + 60_000
  if (expiresSoon) {
    const { data } = await supabase.auth.refreshSession()
    if (data.session) {
      return { Authorization: `Bearer ${data.session.access_token}` }
    }
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

/**
 * Invoke a Supabase Edge Function with a fresh caller token and retries for
 * TRANSIENT failures only — 404 "function not found" (regional propagation),
 * 5xx and network/CORS errors. Real application errors (400/401/403/409 with a
 * message) are surfaced immediately and never retried.
 */
export async function invokeWithRetry<T = unknown>(
  supabase: SupabaseClient,
  name: string,
  body: unknown,
  tries = 8,
): Promise<T> {
  const headers = await freshAuthHeader(supabase)
  let lastMessage = 'The server is temporarily unavailable.'

  for (let attempt = 1; attempt <= tries; attempt++) {
    const { data, error } = await supabase.functions.invoke(name, {
      body: body as Record<string, unknown>,
      headers,
    })

    if (!error) {
      const appError = (data as { error?: string } | null)?.error
      if (appError) throw new Error(appError)
      return data as T
    }

    const status: number | undefined = (
      error as { context?: { status?: number } }
    )?.context?.status

    const transient =
      status === undefined || status === 404 || status === 408 || status >= 500

    if (!transient) {
      let message = error.message
      try {
        const parsed = await (
          error as { context: { json: () => Promise<{ error?: string }> } }
        ).context.json()
        if (parsed?.error) message = parsed.error
      } catch {
        /* keep default message */
      }
      throw new Error(message)
    }

    lastMessage = error.message || lastMessage
    if (attempt < tries) await sleep(Math.min(300 * attempt, 1500))
  }

  throw new Error(
    `Could not reach the server after several attempts. Supabase edge functions may be experiencing a regional issue — please try again shortly. (${lastMessage})`,
  )
}
