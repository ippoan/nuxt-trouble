# nuxt-trouble

トラブル管理 (状況管理) アプリ。Nuxt 4 + Cloudflare Workers (`wrangler.toml`)。
rust-alc-api `/api/troubles` を叩く。

## 環境と URL

| 環境 | URL | 更新タイミング |
|---|---|---|
| production | https://trouble.ippoan.org | `v*` タグ push |
| staging | https://trouble-staging.ippoan.org | PR (non-draft) への push のたび (`test.yml` の `frontend-ci.yml` deploy-staging job) |
| preview | https://nuxt-trouble-preview.m-tama-ramu.workers.dev | 任意の branch (main 以外) への push のたび (`.github/workflows/preview-deploy.yml`、test/typecheck 無し・deploy のみの軽量パイプライン) |

**preview は UI 変更の見た目確認が主目的** (backend は staging を再利用、専用 DB は持たない)。
DB migration 等の本格的な検証が必要な変更は PR を作成して staging で確認する
(Refs ippoan/secrets-inventory#85)。

<!-- migrated from memory/feedback_*.md (2026-05-11) -->

## ドメインモデル上の罠

### `trouble_tasks` の対応者は 2 フィールド (Row1 と Row2 で別)

`trouble_tasks` テーブルには 2 つの対応者カラムがある:

- **Row1 (タスク対応者)**: `assigned_to`
- **Row2 (次のアクション対応者)**: `next_action_by`

**両方の行に対応者欄が必要**。片方を消してはいけない。

user が「タスクと次のアクションにそれぞれ対応者名が必要」と複数回指摘した経緯あり
(`feedback_two_assignees`)。テーブルレイアウトを変更する際は両 row に対応者列を
表示・入力可能なまま維持すること。
