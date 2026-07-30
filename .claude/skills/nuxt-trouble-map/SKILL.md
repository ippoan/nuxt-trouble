---
name: nuxt-trouble-map
generated-from: nuxt-trouble:ff4ee0f440ce5aa47ed40f70422d9435bee73d95
paths: [app/, server/]
description: ippoan/nuxt-trouble (トラブル/状況管理 Nuxt 4 アプリ / Cloudflare Workers) の構造ナビゲーション。rust-alc-api `/api/troubles` を叩くチケット・タスク・ワークフロー管理 SPA。pages/composables/utils と ts-rs 生成型の配置、/api/proxy identity proxy、2 対応者フィールドの罠を 1 枚にまとめる。トリガー:「nuxt-trouble」「トラブル管理」「状況管理」「チケット」「trouble_tasks」「assigned_to」「next_action_by」「ワークフロー」「ガントチャート」「trouble.ippoan.org」「/api/proxy」等。
---

# nuxt-trouble-map — ippoan/nuxt-trouble 構造ナビゲーション

トラブル (状況) 管理アプリ。Nuxt 4 (`app/` ディレクトリ構成) + Cloudflare Workers。
rust-alc-api の `/api/troubles` 系を叩く SPA。フロントは `app/utils/api.ts` を
**同一 Worker の `/api/proxy/*` server route 経由**で叩き、proxy は auth-worker
`/alc-proxy/*` に service binding で thin-forward する (#434 step 3 方式 B)。
introspect / ACL / OIDC mint / identity (tenant + user) 注入は auth-worker 側。

> ここは索引。細部 (関数シグネチャ・行) は repo 側が正。
> frontmatter の `generated-from` が現在の tree-sha とズレたら
> session-start-skill-coverage hook が再生成を促す → tree-sha を更新する。

## 区画

| 区画 | 主要ファイル | 役割 |
|---|---|---|
| **pages** | `app/pages/index.vue` `tickets/{index,[id],new,situations,waiting}.vue` `tasks.vue` `settings.vue` `login.vue` `auth/callback.vue` | チケット一覧/詳細/新規/状況/待ち、タスク、設定、認証 |
| **composables** | `useTicketList.ts` `useTicketDetail.ts` `useTicketNew.ts` `useTaskStatuses.ts` `useCarInspections.ts` `useAppInit.ts` `useAuth.ts` | チケット・タスク・車検証・初期化・認証 |
| **components** | `Ticket*.vue` (FormFields / TaskList / TaskCard / StatusHistory / StatusTransition / GanttChart / CategoryBadge / CompactOverview / Files) `WorkflowManager.vue` `MasterDataManager.vue` `BulkImportModal.vue` `Ymd(t)Input.vue` | チケット UI / ワークフロー / マスタ / 一括取込 / 日付入力 |
| **utils** | `app/utils/api.ts` (API client) `scheduleError.ts` (通知予約キャンセル失敗の文言変換、Refs #190) `scheduleDisplay.ts` (通知一覧の降順/5件折りたたみ・送信先メンバーフィルタ、Refs #198) `datetime.ts` `normalize.ts` `excel-import.ts` `carInspection.ts` | API 呼び出し本体 / エラー文言 / 日付 / 正規化 / Excel 取込 |
| **server (proxy)** | `server/api/proxy/[...path].ts` | `/api/proxy/*` → auth-worker `/alc-proxy/*` → rust-alc-api。`@ippoan/auth-client/server` の `createAuthWorkerProxyHandler` で AUTH_WORKER service binding に thin-forward (方式 B)。introspect / ACL / OIDC mint / X-Tenant-ID + X-User-* 注入は auth-worker 側。INTERNAL_SHARED_SECRET (Secrets Store) を resolve して consumer proof として渡す。**client path が既に `/api/` を含むため `pathPrefix: '/'`** (二重 /api 防止)。AUTH_WORKER 未設定は 503 (fail-closed) (#434 step 3) |
| **型 (生成)** | `app/types/generated/*` (Trouble* 系: Ticket/Task/Category/Office/ProgressStatus/Workflow* 等) + `app/types/index.ts` | rust-alc-api models.rs から **ts-rs 自動生成**。手動編集しない |
| **middleware / layout** | `app/middleware/auth.global.ts` `app/layouts/{default,auth}.vue` | 全ルート認証ガード / レイアウト |

## entrypoint

- **nitro**: `nuxt.config.ts` → `nitro.preset = "cloudflare_module"`、`main = .output/server/index.mjs` (wrangler.toml)。`server/api/proxy/[...path].ts` で auth-worker `/alc-proxy/*` への thin-forward proxy を持つ (それ以外は SPA)。
- **API base**: ブラウザは `/api/proxy` (相対 = 同一 Worker server route) を基点に fetch (`useAppInit.ts` が `initApi('/api/proxy', ...)`)。proxy が `runtimeConfig.alcApiUrl` (= `NUXT_ALC_API_URL`) の rust-alc-api に forward。`runtimeConfig.public.apiBase` (= `NUXT_PUBLIC_API_BASE`) は StagingFooter の export/import 用に残る。
- **wrangler**: top-level = prod (`nuxt-trouble`, trouble.ippoan.org)。`[env.staging]` = `nuxt-trouble-staging` (trouble-staging.ippoan.org)。

## gotcha

- **release 直後の「真っ暗なまま起動しない」= キャッシュされた chunk 404** (Refs #236, 2026-07-30): Cloudflare Workers Static Assets は**存在しないアセットの 404 にも** `cache-control: public, max-age=31536000, immutable` を付ける (`curl -i https://trouble.ippoan.org/_nuxt/ZZZZnotexist.js` で再現可能)。Release Wave の `versions upload` + traffic flip 直後に `/_nuxt/*.js` の 404 を踏むとブラウザがその 404 を 1 年保持し、**通常のリロードでは永久に復旧しない**。`app.vue` は認証初期化までスピナーだけを描画するので症状は「真っ暗」になる。手動復旧は `Ctrl+Shift+R`。恒久対策は **`nuxt.config.ts` の `modules` に足した `'@ippoan/auth-client/module'` 1 行** (実装は auth-client 側 = `packages/auth-client/src/{chunkReload.ts,runtime/chunkReload.client.ts,module.ts}`、Refs ippoan/auth-worker#452)。module が `experimental.emitRouteChunkError: 'manual'` を設定し (Nuxt 既定の `'automatic'` は HTTP キャッシュをバイパスせず効かない)、`app:chunkError` / `vite:preloadError` / `unhandledrejection` を拾って失敗 URL を `fetch(url, { cache: 'reload' })` で取り直してからリロードする client plugin を注入する (時間窓 60s / 最大 2 回、上限で画面に loud fail)。**`modules` から外すと対策が無効化される**。#236 では repo ローカル実装 (`app/utils/chunkReload.ts` + `app/plugins/`) だったが、全 Nuxt consumer 共通の問題なので lib へ移設済み — この repo に再びローカル実装を足さない。切り分けは「entry (`/_nuxt/<hash>.js`) が参照する chunk を全部 `curl` して 404 を数える」。サーバー側が健全なら 404 は 0 件で、原因はブラウザキャッシュ側にある。
- **#225 ユーザー要望対応 (2026-07-26)**: ① `YmdtInput` は年月日が揃えば時分未入力でも `00` 補完で emit する (全 5 欄必須に戻すと「日付を入れたのに保存されない」不具合が再発する)。② 営業所欄 (フォーム / インライン作成) は datalist 付き `UInput` 直接入力 (`USelect` に戻さない)。③ 一覧の発生日時ソートは `filter.sort_by`(`"occurred"`|`"ticket_no"`) + `sort_desc` を backend whitelist に渡す (`toggleOccurredSort` で 降順→昇順→既定)。④ カテゴリ / 経過記録タイプの既定 (ハードコード) は独自項目が 1 件でもあれば非表示 (`hasCustomEntries`、ticketFieldOptions.ts / MasterDataManager.vue で同一規則。既定行の「リストへ追加」で個別 DB 化)。
- **`trouble_tasks` の対応者は 2 フィールド**: Row1 = タスク対応者 (`assigned_to`)、Row2 = 次のアクション対応者 (`next_action_by`)。**両 row に対応者欄が必要**。テーブルレイアウト変更時に片方を消さない (user が複数回指摘した経緯、CLAUDE.md `feedback_two_assignees`)。`TicketTaskList.vue` の 1 件編集モーダル (Refs #191) にも両欄あり — 消さない。
- **`TicketTaskList.vue` の 1 件編集モーダル** (Refs #191): 「状況管理」見出し右の「編集」ボタン 1 個で開く (行ごとの鉛筆ボタンは廃止、grid は 9 列に戻した)。2 ペイン構成: 左にタスク一覧 (種別/ステータス/発生日時/タイトル、クリックでその行へ)、右に全フィールド編集フォーム (発生日時は `YmdtInput` で時刻込み編集、一覧項目は `tabindex=-1` で Tab 対象外)。行移動は **Ctrl+Shift+↑/↓** (Alt+↓ は select のドロップダウンが開くため不採用。window keydown を capture: true + stopPropagation で listen — select 自身の ArrowDown でドロップダウンが開くのを防ぐ。端では停止)。**Alt+S** で保存のみ (モーダルは閉じない、e.code 判定)。未保存変更は移動時に自動保存 (失敗時は移動しない)、キャンセルは破棄。`assigned_to` は employee 名 ⇄ id 変換 (追加フォームと同じ)。モーダル幅は `:ui="{ content: 'sm:max-w-4xl' }"`。
- **通知予約キャンセルの 409** (Refs #190): 送信済み予約への cancel は backend が 409 (body 無し) を返す仕様。`[id].vue` の `handleCancelSchedule` は `cancelScheduleErrorMessage` で文言化し、成否によらず `loadSchedules()` で実状態を反映する。生の「API エラー (NNN):」を UI に出さない。
- **`@ippoan/auth-client` は `build.transpile` + Vite `optimizeDeps.exclude` の両方** (`nuxt.config.ts`)。root import は .ts + .vue 公開で、SSR/Nitro 経路は transpile が必要、Vite dep pre-bundle は `#imports` 解決がバグり invalid JS になるため exclude する。server route は `@ippoan/auth-client/server` (.mjs) を import するので Nitro でそのまま解決できる。
- `app/types/generated/` は ts-rs 生成物 (rust-alc-api 側 `sync-types.sh`)。手動編集禁止、差分は backend 型変更で生じる。
- `typescript.tsConfig.compilerOptions.skipLibCheck = true` 設定済み (依存型の lib check を回避)。
- `@nuxt/ui` は **4.x** (Nuxt 4 世代)。`frappe-gantt` でガントチャート (`TicketGanttChart.vue`)。

## CCoW/CI から見た立ち位置

- rust-alc-api consumer (alc-app / carins / dtako の兄弟)。認証は `@ippoan/auth-client` + auth-worker。
- CI: `.github/workflows/` (frontend-ci 系)。`coverage_100.toml` + `docker-compose.test.yml` (rust-alc-api コンテナで live テスト可能)。`.ippoan-dev.yaml` で dev 設定。

## 関連 skill

- `auth-worker-map` — `@ippoan/auth-client` の発行元
- `nuxt-pwa-carins-map` / `nuxt_dtako_logs-map` / `alc-app-map` — 同じ rust-alc-api consumer の兄弟
- `type-safe-pipeline` — ts-rs 型同期パイプライン (generated/ の生成元)
- `nuxt-vitest` — Nuxt 4 + Vitest テスト作成
- `repo-map` / `cross-repo-symbol-index` — この map の運用方針
