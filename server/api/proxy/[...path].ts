/**
 * REST API プロキシ
 * /api/proxy/* → auth-worker /alc-proxy/* → rust-alc-api の /api/*
 *
 * #434 step 3 (方式 B): introspect / ACL / OIDC mint / identity 注入を
 * auth-worker `/alc-proxy/*` に集約し、consumer は createAuthWorkerProxyHandler で
 * service binding (AUTH_WORKER) に thin-forward するだけ。旧 createIdentityProxyHandler
 * (方式 A) を置換。consumer は X-Alc-Proxy-Secret (=INTERNAL_SHARED_SECRET、consumer
 * proof) + X-Alc-Proxy-Origin + browser JWT のみ載せる。auth-worker (#308) が
 * X-Alc-Proxy-Secret を constant-time 検証してから JWT 検証 + ACL + OIDC mint +
 * X-Tenant-ID/X-User-* 注入を行う。AUTH_WORKER は方式 B で必須 (未設定は 503)。
 */
import { createAuthWorkerProxyHandler } from '@ippoan/auth-client/server'
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
  const authWorker = env.AUTH_WORKER as { fetch: typeof fetch } | undefined
  if (!authWorker) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AUTH_WORKER service binding が未設定です',
    })
  }

  const proxy = createAuthWorkerProxyHandler({
    sharedSecret,
    authWorkerFetch: () => authWorker.fetch.bind(authWorker),
    // client の path が既に /api/trouble/... を含むため pathPrefix='/' (二重 /api 防止)。
    pathPrefix: '/',
  })
  return proxy(event)
})
