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

  const SCHEDULE_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/products.yml/runs?event=schedule&per_page=1";
  const DISPATCH_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/products.yml/runs?event=workflow_dispatch&per_page=10";

  let checkLabel = "最終確認を取得しています…";
  let productCount = "";
  let statusLoading = false;

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

  function runType(run) {
    return run?.event === "workflow_dispatch" ? "手動" : "自動";
  }

  async function fetchRuns(url) {
    const response = await fetch(`${url}&t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  }

  function newestRun(runs) {
    return runs
      .filter(Boolean)
      .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))[0] || null;
  }

  async function updateStatus() {
    if (statusLoading) return;
    statusLoading = true;

    try {
      const [scheduled, dispatched] = await Promise.allSettled([
        fetchRuns(SCHEDULE_RUNS_URL),
        fetchRuns(DISPATCH_RUNS_URL),
      ]);
      const runs = [];
      if (scheduled.status === "fulfilled") runs.push(...scheduled.value);
      if (dispatched.status === "fulfilled") runs.push(...dispatched.value);
      if (!runs.length) throw new Error("No Product workflow run");

      const run = newestRun(runs);
      const type = runType(run);
      const checkedAt = run.updated_at || run.run_started_at || run.created_at;

      if (run.status !== "completed") {
        checkLabel = `確認中 ${formatDate(run.run_started_at || run.created_at)}〜（${type}）`;
      } else if (run.conclusion !== "success") {
        checkLabel = `確認失敗 ${formatDate(checkedAt)}（${type}）`;
      } else {
        checkLabel = `最終確認 ${formatDate(checkedAt)}（${type}）`;
      }
      renderStatus();
    } catch (error) {
      checkLabel = "最終確認を取得できませんでした";
      renderStatus();
      console.error(error);
    } finally {
      statusLoading = false;
    }
  }

  new MutationObserver(() => {
    const text = status.textContent.trim();
    if (/^\d[\d,]*製品$/.test(text)) {
      productCount = text;
      renderStatus();
    }
  }).observe(status, { childList: true, characterData: true, subtree: true });

  window.refreshProductStatus = updateStatus;
  renderStatus();
  void updateStatus();
})();
