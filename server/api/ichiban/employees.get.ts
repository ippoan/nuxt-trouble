/**
 * 一番星 社員ﾏｽﾀ一覧の取得 (Refs #220)
 *
 * GET /api/ichiban/employees
 *   → service binding (ICHIBAN_WORKER = nuxt-ichibanboshi) /api/employees
 *     → CF Access Service Token → rust-ichibanboshi /api/employees → [社員ﾏｽﾀ]
 *
 * 担当者マスタの手動同期 (settings 画面) が呼ぶ read-only route。
 * - browser JWT を auth-worker introspect (`requireAuth`) で検証してから forward する
 *   (未認証に社員名一覧を漏らさない)
 * - binding / secret 未設定は fail-closed 503
 * - upstream エラーの詳細は response に echo しない (固定文言 + log のみ)
 */
import { requireAuth } from '@ippoan/auth-client/server'
import { cfEnv, resolveSecret } from '../../utils/cfBindings'

export default defineEventHandler(async (event) => {
  const env = cfEnv(event)

  const sharedSecret = await resolveSecret(env.INTERNAL_SHARED_SECRET)
  if (!sharedSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'INTERNAL_SHARED_SECRET binding が未設定です',
    })
  }

  const authWorkerUrl =
    typeof env.NUXT_PUBLIC_AUTH_WORKER_URL === 'string' ? env.NUXT_PUBLIC_AUTH_WORKER_URL : ''
  if (!authWorkerUrl) {
    throw createError({
      statusCode: 503,
      statusMessage: 'NUXT_PUBLIC_AUTH_WORKER_URL が未設定です',
    })
  }

  await requireAuth(event, { authWorkerUrl, sharedSecret })

  const ichiban = env.ICHIBAN_WORKER as
    | { fetch: (input: string, init?: RequestInit) => Promise<Response> }
    | undefined
  if (!ichiban || typeof ichiban.fetch !== 'function') {
    throw createError({
      statusCode: 503,
      statusMessage: 'ICHIBAN_WORKER service binding が未設定です',
    })
  }

  // service binding の fetch は URL の host を無視して bound worker に届くが、
  // 形式上 absolute URL が必要 (host は bound worker 名で判別しやすい値にする)。
  const res = await ichiban.fetch('https://nuxt-ichibanboshi/api/employees')
  if (!res.ok) {
    console.error(`ichiban employees fetch failed: status=${res.status}`)
    throw createError({
      statusCode: 502,
      statusMessage: '一番星からの社員一覧取得に失敗しました',
    })
  }
  return res.json()
})
