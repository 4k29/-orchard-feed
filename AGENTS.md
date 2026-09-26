## Code Review Rules

### Keep the feed pipeline resilient
A failure in translation, summarization, or another optional external service must not stop RSS fetching, article storage, or later processing. Preserve graceful fallback behavior.

### Never expose secrets
Discord webhook URLs, API keys, tokens, or other credentials must never be committed, logged, written into generated files, or exposed to the site. Secrets must remain in GitHub Actions secrets or equivalent protected configuration.

### Avoid duplicate or missing notifications
Changes to feed parsing, article identity, deduplication, or persistence must not cause previously processed articles to be sent again or new articles to be silently skipped.
