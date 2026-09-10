# Phase 2 自動同期設計

## 採用候補

GitHub Pages + Cloudflare Worker + Workers KV

## 通信

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

## Readerからの更新

`POST /api/v1/player/<uid>`

Header:
`Authorization: Bearer <PUSH_SECRET>`

Body:
`owned_pals.json`

Push Secretは自宅サーバーだけに保存し、Webフロントへは渡しません。

## メンバーからの取得

`GET /api/v1/me`

Header:
`Authorization: Bearer <PLAYER_READ_TOKEN>`

Worker側でRead TokenをSHA-256化してUIDを引き、該当UIDのJSONだけ返します。

## 自宅側ネットワーク

開放しない:
- SMB 445
- RDP 3389
- NAS管理画面
- Palworldセーブ共有
- 任意のReader用受信ポート

必要なのは通常の外向きHTTPS 443だけです。
