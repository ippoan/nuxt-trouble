import {
  CHUNK_RELOAD_STORAGE_KEY,
  chunkErrorMessage,
  extractChunkUrl,
  isChunkLoadErrorMessage,
  recoverFromChunkError,
  renderChunkReloadFallback,
  type ChunkReloadDeps,
} from '~/utils/chunkReload'

/**
 * chunk (`/_nuxt/*.js`) の load 失敗を検知して自動復旧する client plugin。
 *
 * release 直後に踏んだ 404 が immutable キャッシュに焼き付くと通常のリロードでは
 * 復旧できず「真っ暗なまま起動しない」状態になるため、キャッシュをバイパスして
 * 取り直してからリロードする。判断ロジックは `~/utils/chunkReload` 側 (Refs #236)。
 *
 * Nuxt 既定の自動リロード (`emitRouteChunkError: 'automatic'`) は HTTP キャッシュを
 * バイパスしないので `nuxt.config.ts` で `'manual'` にし、本 plugin が制御する。
 */
export default defineNuxtPlugin((nuxtApp) => {
  // 同じ失敗で複数の hook / event が同時に飛ぶため、復旧は 1 本に絞る。
  let recovering = false

  const deps: ChunkReloadDeps = {
    now: () => Date.now(),
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    refetch: async (url) => {
      await fetch(url, { cache: 'reload' })
    },
    reload: () => window.location.reload(),
    giveUp: (message) => {
      console.error('[chunk-reload]', message, `(${CHUNK_RELOAD_STORAGE_KEY})`)
      renderChunkReloadFallback(document, message)
    },
  }

  /** chunk load 失敗が確定している入口 (原因判定を通さない)。 */
  function recover(error: unknown) {
    if (recovering) return
    recovering = true
    void recoverFromChunkError(extractChunkUrl(chunkErrorMessage(error)), deps).then(
      (result) => {
        // 諦めた後は時間窓が明ければ再度自動復旧できるよう guard を解く。
        if (result === 'gave-up') recovering = false
      },
    )
  }

  nuxtApp.hook('app:chunkError', ({ error }) => recover(error))

  window.addEventListener('vite:preloadError', (event) => {
    recover((event as Event & { payload?: unknown }).payload)
  })

  // chunk と無関係な reject も飛んでくるので、ここだけは原因を判定してから拾う。
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadErrorMessage(chunkErrorMessage(event.reason))) recover(event.reason)
  })
})
