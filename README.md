# PalBreeder Web v0.1

Palworldの所持パル情報をブラウザ内だけで読み込み、配合ルートを計算するGitHub Pages向け静的Webアプリです。

## 方針

- GitHub Pagesには秘密情報を置かない
- `owned_pals.json` はブラウザのFile APIでローカル読込
- v0.1ではプレイヤーデータを外部へ送信しない
- セーブデータ、SMB/NAS情報、認証情報をWebサイトへ置かない
- Palworldの公開ゲームデータのみ外部ソースから取得する
- 配合計算は全てJavaScriptでクライアント側実行

## GitHub Pagesへ公開

最も簡単なのは、このフォルダの中身をGitHubリポジトリのルートへ置く方法です。

1. 新しいGitHubリポジトリを作成
2. `index.html`, `styles.css`, `app.js`, `.nojekyll` などをpush
3. GitHub `Settings` → `Pages`
4. `Deploy from a branch`
5. `main` / `/ (root)` を選択

ビルド工程やNode.jsは不要です。

## メンバーの使い方

1. 管理者がPalBoxCommunityReader v2.7を実行
2. 各メンバーへ本人の `Player_<UID>/owned_pals.json` だけ渡す
3. メンバーはPalBreeder WebのURLを開く
4. `owned_pals.json` をドラッグ&ドロップ
5. 配合計算を行う

## v0.1機能

- `owned_pals.json` 読込
- 日本語パル検索
- 所持パルから最短ルート
- 直接配合一覧
- あと1体で作れる候補
- 性別/頭数確認
- SVGフローチャート
- 箱クリック詳細
- PNG保存
- 最大4パッシブ指定
- パッシブプリセット
- パッシブ継承ルート候補
- パッシブ継承フローチャート
- 親から逆引き
- スマホ向けレスポンシブ表示

## 注意

パッシブ継承にはゲーム内のランダム性があります。表示される配合回数は血統を組み上げるためのルート候補であり、必要な卵数を保証しません。

ブラウザ版v0.1の4パッシブ探索はレスポンス維持のため、各パッシブ集合ごとの候補状態を一定数に絞っています。そのため非常に特殊なケースでは絶対的な全探索最適解ではなく「最短候補」です。今後Web Worker化して探索範囲を広げる予定です。

## データソース

配合データ:
- helios57/palworld (MIT)

日本語名/パッシブ表示データ:
- KrisCris/Palworld-Pal-Editor を実行時参照

本ツールは非公式ファンツールです。
