# Appleニュース

Apple関連の4つのRSSを5分ごとに確認し、新着だけを日本語へ翻訳してDiscordへ通知します。翻訳済みの記事一覧は `data/articles.json` に保存され、サイトから読み込まれます。

## 対象RSS

- Apple Newsroom
- Apple Developer
- MacRumors
- 9to5Mac

## 初回設定

1. Discordの「サーバー設定 → 連携サービス → ウェブフック」からWebhookを作成します。
2. GitHubの「Settings → Secrets and variables → Actions → New repository secret」で、名前を `DISCORD_WEBHOOK_URL`、値をWebhook URLにします。
3. GitHubの「Actions → Appleニュースを更新 → Run workflow」を1回実行します。

初回は過去記事を一覧へ取り込むだけで、Discordへ大量通知しません。2回目以降に見つかった新着だけを通知します。

翻訳にはGitHub Actionsの `GITHUB_TOKEN` とGitHub Modelsを使うため、別の翻訳APIキーは不要です。Webhook URLは必ずRepository secretに保存し、ファイルへ直接書かないでください。
