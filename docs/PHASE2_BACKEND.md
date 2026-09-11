# Phase 2 自動同期設計 / 導入手順

## 構成

GitHub Pages + Cloudflare Worker + Workers KV

```text
Palworld server / Reader
        |
        | HTTPS POST (outbound only)
        v
Cloudflare Worker
        |
        v
Workers KV
 player:<uid> -> owned_pals.json
 token:<sha256(read_token)> -> uid
        ^
        |
        | HTTPS GET
PalBreeder Web (GitHub Pages)
```

## セキュリティ方針

- 自宅側は外向きHTTPS 443だけ使用
- SMB 445 / RDP 3389 / NAS管理画面 / Reader受信ポートをインターネット公開しない
- `PUSH_SECRET` は自宅ReaderとCloudflare Workerだけが知る
- 各プレイヤーには本人専用の `PLAYER_READ_TOKEN` だけを渡す
- WorkerはRead TokenそのものをKVへ保存せずSHA-256ハッシュで照合
- GitHub Pagesへ秘密情報・プレイヤーJSONをコミットしない
- APIレスポンスは `Cache-Control: no-store`
- CORSは `https://noine32.github.io` のみに制限

## Worker API

### Readerから更新

`POST /api/v1/player/<uid>`

Header:

```text
Authorization: Bearer <PUSH_SECRET>
Content-Type: application/json
```

Body: `owned_pals.json`

Workerは `schema=palbreeder-owned-pals-v1` とBody内UID一致を検証してからKVへ保存します。

### Read Token登録

`POST /api/v1/admin/player-token`

Header:

```text
Authorization: Bearer <PUSH_SECRET>
```

Body:

```json
{"uid":"780331883","read_token":"32文字以上のランダムトークン"}
```

### メンバーから取得

`GET /api/v1/me`

Header:

```text
Authorization: Bearer <PLAYER_READ_TOKEN>
```

該当トークンに紐づく本人用JSONだけ返します。プレイヤー一覧APIは作りません。

## Cloudflare側の導入

1. Cloudflare Workers & PagesでWorkerを作成
2. Workers KV namespaceを1つ作成
3. `cloudflare/worker.js` をWorkerコードとして使用
4. `cloudflare/wrangler.toml.example` を参考にKVを `PAL_DATA` としてbind
5. Worker変数 `ALLOWED_ORIGIN=https://noine32.github.io` を設定
6. `PUSH_SECRET` はSecretとして登録し、GitHubには書かない
7. deploy後の `https://<worker>.workers.dev` を控える

CLIを使う場合の例:

```text
cd cloudflare
npm install -g wrangler
wrangler kv namespace create PAL_DATA
# wrangler.toml.exampleをwrangler.tomlへコピーし、namespace idを反映
wrangler secret put PUSH_SECRET
wrangler deploy
```

## Reader側

`reader/Upload-PlayerData.ps1` はReaderの出力フォルダ内にある全 `Player_*/owned_pals.json` をアップロードします。

例:

```powershell
.\Upload-PlayerData.ps1 `
  -ExportRoot "C:\PalBoxReader_AllPlayers" `
  -WorkerBaseUrl "https://palbreeder-sync.example.workers.dev" `
  -PushSecret "<PUSH_SECRET>" `
  -TokenMapPath "C:\PalBreederPrivate\player_tokens.json"
```

`player_tokens.json` は公開フォルダやGitHubへ置かないでください。初回実行時にUIDごとのRead Tokenを生成し、Workerへ登録します。

## Web側

GitHub Pages v0.3には「クラウド同期（Phase 2）」欄があります。

1. Worker URLを入力
2. 本人用Read Tokenを入力
3. 「クラウドから読み込む」
4. 取得したJSONは既存のローカルJSON読み込み経路へ渡され、そのまま配合計算に使われる

現在はWorker URLとRead Tokenを `sessionStorage` にのみ保持します。ブラウザ/タブの永続保存は行いません。

## 未実施

- 実際のCloudflareアカウントへのWorker/KV作成
- 本番 `PUSH_SECRET` の生成・登録
- 実際のメンバー用Read Token配布
- Reader本体へのアップロード処理の統合（現状は独立PowerShellスクリプト）
- 自動定期実行（Windowsタスクスケジューラ等）
