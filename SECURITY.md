# SECURITY / データ保護方針

## GitHub Pagesに置いてよいもの

- HTML / CSS / JavaScript
- 配合計算ロジック
- 公開ゲームデータの参照URL
- ドキュメント

## 絶対に置かないもの

- Level.sav
- structure.json
- `owned_pals.json` の実データ
- NAS/SMBパス
- NAS/Windowsのユーザー名・パスワード
- Cloudflareの管理トークン
- 将来のReader用Push Secret
- 各プレイヤーのRead Token

## v0.1

ユーザーが選択した `owned_pals.json` はブラウザ内メモリだけで処理します。
localStorage / IndexedDBへの自動保存も行いません。

## Phase 2

自宅サーバーからCloudflare WorkerへHTTPS POSTのみを許可します。
インターネット側から自宅LANへ入るポート開放は行いません。
