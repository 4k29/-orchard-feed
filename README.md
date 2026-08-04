# Appleニュース

Apple関連の4つのRSSを5分ごとに確認し、新着だけを日本語へ翻訳してDiscordへ通知します。翻訳済みの記事一覧は `data/articles.json` に保存され、サイトから読み込まれます。

## 対象RSS

- Apple Newsroom
- Apple Developer
- MacRumors
- 9to5Mac

## 初回設定

1. Discordの「サーバー設定 → 連携サービス → ウェブフック」からWebhookを作成します。
2. Google AI StudioでGemini APIキーを作成します。
3. GitHubの「Settings → Secrets and variables → Actions → New repository secret」に、`DISCORD_WEBHOOK_URL`と`GEMINI_API_KEY`をそれぞれ登録します。
4. GitHubの「Actions → Appleニュースを更新 → Run workflow」を1回実行します。

初回は過去記事を一覧へ取り込むだけで、Discordへ大量通知しません。2回目以降に見つかった新着だけを通知します。

日本語への翻訳と要約には、Gemini 2.5 Flash-Liteを使用します。必要に応じてRepository variableの `GEMINI_MODEL` でモデル名を変更できます。キーが未設定、またはGemini APIが一時的に失敗した場合も、RSSの更新自体は止めず、原文のタイトルと要約を保存します。次にAPIが利用できたとき、原文で保存した記事も自動的に日本語化します。Webhook URLとAPIキーは必ずRepository secretに保存し、ファイルへ直接書かないでください。
