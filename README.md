# Orchard Feed

海外のAppleニュースを日本語で届ける個人用フィードと、歴代Apple製品を検索できる製品データベースです。

## 製品データ

`site/products.html` では、発売日、チップ、カラー、ストレージ、モデル番号などから製品を検索できます。製品データは [AppleDB](https://appledb.dev/) のMITライセンスデータを週1回取り込み、`data/products.json` にまとめています。

```sh
npm run products -- /path/to/appledb/deviceFiles data/products.json
```

発表日・発売時価格・ストレージは、確認できるデータがある場合のみ掲載します。空欄を推測値で埋めることはしません。

Apple関連の4つのRSSを15分ごとに確認し、新着だけを日本語へ翻訳してDiscordへ通知します。翻訳済みの記事一覧は `data/articles.json` に保存され、Orchardサイトから読み込まれます。

## 対象RSS

- Apple Newsroom
- Apple Developer
- MacRumors
- 9to5Mac

## 初回設定

1. Discordの「サーバー設定 → 連携サービス → ウェブフック」からWebhookを作成します。
2. GitHubの「Settings → Secrets and variables → Actions → New repository secret」で、名前を `DISCORD_WEBHOOK_URL`、値をWebhook URLにします。
3. GitHubの「Actions → Sync Orchard feed → Run workflow」を1回実行します。

初回は過去記事を一覧へ取り込むだけで、Discordへ大量通知しません。2回目以降に見つかった新着だけを通知します。

翻訳にはGitHub Actionsの `GITHUB_TOKEN` とGitHub Modelsを使うため、別の翻訳APIキーは不要です。Webhook URLは必ずRepository secretに保存し、ファイルへ直接書かないでください。
