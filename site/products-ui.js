(() => {
  const roots = [
    document.querySelector("#family-filter"),
    document.querySelector("#advanced-filters"),
  ].filter(Boolean);

  function formatSizeLabels(root) {
    root.querySelectorAll("button").forEach((button) => {
      const current = button.textContent;
      const next = current.replace(/(\d+(?:\.\d+)?)インチ/g, '$1"');
      if (next !== current) button.textContent = next;
    });
  }

  roots.forEach((root) => {
    formatSizeLabels(root);
    new MutationObserver(() => formatSizeLabels(root)).observe(root, {
      childList: true,
      subtree: true,
    });
  });

  const status = document.querySelector("#product-status");
  if (!status) return;

  const runsUrl =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/products.yml/runs?per_page=1";
  let checkLabel = "最終確認を取得しています…";
  let productCount = "";

  function formatDate(value) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return "--/-- --:--";
    const parts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
    return `${values.month}/${values.day} ${values.hour}:${values.minute}`;
  }

  function renderStatus() {
    const next = productCount ? `${checkLabel}・${productCount}` : checkLabel;
    if (status.textContent !== next) status.textContent = next;
  }

  new MutationObserver(() => {
    const text = status.textContent.trim();
    if (/^\d[\d,]*製品$/.test(text)) {
      productCount = text;
      renderStatus();
    }
  }).observe(status, { childList: true, characterData: true, subtree: true });

  renderStatus();

  fetch(`${runsUrl}&t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      const run = payload.workflow_runs?.[0];
      if (!run) throw new Error("No Product workflow run");
      const checkedAt = run.updated_at || run.run_started_at || run.created_at;
      if (run.status !== "completed") {
        checkLabel = `確認中 ${formatDate(run.run_started_at || run.created_at)}〜`;
      } else if (run.conclusion !== "success") {
        checkLabel = `確認失敗 ${formatDate(checkedAt)}`;
      } else {
        checkLabel = `最終確認 ${formatDate(checkedAt)}`;
      }
      renderStatus();
    })
    .catch((error) => {
      checkLabel = "最終確認を取得できませんでした";
      renderStatus();
      console.error(error);
    });
})();