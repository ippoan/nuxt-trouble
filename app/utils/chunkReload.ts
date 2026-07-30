/**
 * dynamic import した chunk (`/_nuxt/*.js`) の load 失敗から自動復旧するロジック。
 *
 * Cloudflare Workers Static Assets は「存在しないアセット」の 404 にも
 * `cache-control: public, max-age=31536000, immutable` を付けて返す。そのため
 * release 直後に一度でも chunk の 404 を踏むと、ブラウザがその 404 を 1 年間
 * 保持し続け、通常のリロードでは永久に復旧しない。app.vue は認証初期化が
 * 終わるまでスピナーだけを描画するので、症状は「真っ暗なまま起動しない」に
 * なる (Refs #236)。
 *
 * 404 側の cache-control は Cloudflare が付けるため repo からは外せない
 * (正常アセットの immutable を捨てるのは避けたい)。よって失敗した chunk URL を
 * `cache: 'reload'` で取り直してキャッシュ上の 404 を上書きしてからリロードする。
 */

/** 試行回数を数える時間窓 (ms)。これを過ぎた試行は数えない。 */
export const CHUNK_RELOAD_WINDOW_MS = 60_000

/** 時間窓内に許す自動リロード回数。超えたら loud fail して user に委ねる。 */
export const CHUNK_RELOAD_MAX_ATTEMPTS = 2

/** 試行回数の保存先 (sessionStorage) key。 */
export const CHUNK_RELOAD_STORAGE_KEY = 'nuxt-trouble:chunk-reload'

/** 諦めた時に画面へ出す要素の id (二重挿入の抑止に使う)。 */
export const CHUNK_RELOAD_FALLBACK_ID = 'chunk-reload-fallback'

/** 自動復旧を諦めた時に user へ出す文言。 */
export const CHUNK_RELOAD_GIVE_UP_MESSAGE =
  '画面の読み込みに失敗しました。Ctrl+Shift+R (Mac は Cmd+Shift+R) で再読み込みしてください'

export type ChunkReloadDeps = {
  now: () => number
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  /** 失敗した URL を HTTP キャッシュをバイパスして取り直す。 */
  refetch: (url: string) => Promise<void>
  reload: () => void
  /** 上限到達で諦めた時に user へ知らせる (黙って固まらせない)。 */
  giveUp: (message: string) => void
}

export type ChunkReloadResult = 'reloaded' | 'gave-up'

/** chunk load 失敗のエラーメッセージから対象 URL を取り出す。 */
export function extractChunkUrl(message: string): string | undefined {
  return message.match(/https?:\/\/[^\s'"()]+\.(?:m?js|css)/)?.[0]
}

/**
 * chunk load 失敗が原因のエラーかどうかを message から判定する。
 *
 * `unhandledrejection` は chunk と無関係な reject も拾うため、そこからの入口だけ
 * この判定を通す (`app:chunkError` / `vite:preloadError` は原因が確定しているので通さない)。
 */
export function isChunkLoadErrorMessage(message: string): boolean {
  return (
    message.includes('dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('Loading chunk')
  )
}

/** unknown なエラー値から message 相当の文字列を取り出す。 */
export function chunkErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

/**
 * chunk load 失敗からの復旧を試みる。
 *
 * 時間窓内の試行回数が上限に達している場合はリロードせず `giveUp` する
 * (キャッシュ上の 404 が消えない状況で無限リロードに陥るのを防ぐ)。
 */
export async function recoverFromChunkError(
  url: string | undefined,
  deps: ChunkReloadDeps,
): Promise<ChunkReloadResult> {
  const attempts = readAttempts(deps)
  if (attempts >= CHUNK_RELOAD_MAX_ATTEMPTS) {
    deps.giveUp(CHUNK_RELOAD_GIVE_UP_MESSAGE)
    return 'gave-up'
  }

  deps.setItem(
    CHUNK_RELOAD_STORAGE_KEY,
    JSON.stringify({ count: attempts + 1, ts: deps.now() }),
  )

  if (url) {
    try {
      // 本題は「キャッシュに焼き付いた 404 の上書き」なので取り直しの成否は問わない。
      // 200 で上書きできれば直り、404 のままならリロード後に再度ここへ来る。
      await deps.refetch(url)
    } catch {
      // 取り直せなくてもリロードは試す。
    }
  }

  deps.reload()
  return 'reloaded'
}

/** 諦めた旨を画面に出す (真っ暗のまま放置しない)。 */
export function renderChunkReloadFallback(doc: Document, message: string): void {
  if (doc.getElementById(CHUNK_RELOAD_FALLBACK_ID)) return

  const el = doc.createElement('div')
  el.id = CHUNK_RELOAD_FALLBACK_ID
  el.setAttribute(
    'style',
    'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;' +
      'padding:1.5rem;text-align:center;background:#ffffff;color:#111111;' +
      'font-size:1rem;line-height:1.6',
  )
  el.textContent = message
  doc.body.appendChild(el)
}

function readAttempts(deps: ChunkReloadDeps): number {
  const raw = deps.getItem(CHUNK_RELOAD_STORAGE_KEY)
  if (!raw) return 0

  try {
    const parsed = JSON.parse(raw) as { count?: unknown; ts?: unknown }
    const count = typeof parsed.count === 'number' ? parsed.count : 0
    const ts = typeof parsed.ts === 'number' ? parsed.ts : 0
    // 時間窓を過ぎた試行は数えない (後日の再発でもう一度自動復旧させる)。
    return deps.now() - ts > CHUNK_RELOAD_WINDOW_MS ? 0 : count
  } catch {
    return 0
  }
}
