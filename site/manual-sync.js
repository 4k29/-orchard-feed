(() => {
  const manualSyncButton = document.querySelector("#manual-sync");
  const manualSyncLabel = document.querySelector("#manual-sync-label");
  const manualSyncStatus = document.querySelector("#manual-sync-status");
  const tokenDialog = document.querySelector("#token-dialog");
  const tokenInput = document.querySelector("#github-token");

  const TOKEN_STORAGE_KEY = "orchard.github-token";
  const WORKFLOW_DISPATCH_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/dispatches";
  const SCHEDULE_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?event=schedule&per_page=1";
  const DISPATCH_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?event=workflow_dispatch&per_page=10";
  const AUTO_SYNC_STALE_MS = 13 * 60 * 1000;
  const AUTO_CHECK_INTERVAL_MS = 60 * 1000;

  let syncing = false;
  let autoCheckRunning = false;
  let lastAutoCheckAt = 0;

  function githubHeaders(token, includeJson = false) {
    return {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(includeJson ? { "content-type": "application/json" } : {}),
    };
  }

  function readStoredToken() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() || "";
    } catch {
      return "";
    }
  }

  function storeToken(token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Storage may be unavailable. The token will be requested again.
    }
  }

  function removeStoredToken() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  function requestToken() {
    if (!tokenDialog?.showModal) {
      const token =
        window.prompt("GitHubのFine-grained personal access tokenを入力してください。")?.trim() || "";
      if (token) storeToken(token);
      return Promise.resolve(token);
    }

    tokenInput.value = "";
    tokenDialog.returnValue = "";
    tokenDialog.showModal();
    window.setTimeout(() => tokenInput.focus(), 0);

    return new Promise((resolve) => {
      tokenDialog.addEventListener(
        "close",
        () => {
          if (tokenDialog.returnValue !== "save") {
            resolve("");
            return;
          }

          const token = tokenInput.value.trim();
          if (token) storeToken(token);
          resolve(token);
        },
        { once: true },
      );
    });
  }

  function setState({ running, label, message = "" }) {
    syncing = running;
    manualSyncButton.disabled = running;
    manualSyncButton.classList.toggle("is-running", running);
    manualSyncLabel.textContent = label;
    manualSyncStatus.textContent = message;
  }

  function restoreButtonSoon() {
    window.setTimeout(() => {
      if (!syncing) setState({ running: false, label: "今すぐ取得" });
    }, 4_000);
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function authenticationError() {
    const error = new Error("Authentication failed");
    error.code = "AUTH";
    return error;
  }

  async function fetchRuns(url, token) {
    const response = await fetch(`${url}&t=${Date.now()}`, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) throw authenticationError();
    if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);

    const payload = await response.json();
    return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  }

  function newestRun(runs) {
    return runs
      .filter(Boolean)
      .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))[0] || null;
  }

  async function fetchLatestRssRunForFallback(token) {
    const [scheduledRuns, dispatchedRuns] = await Promise.all([
      fetchRuns(SCHEDULE_RUNS_URL, token),
      fetchRuns(DISPATCH_RUNS_URL, token),
    ]);
    return newestRun([...scheduledRuns, ...dispatchedRuns]);
  }

  async function waitForDispatchRun(startedAt, token, automatic) {
    const deadline = Date.now() + 12 * 60 * 1000;

    while (Date.now() < deadline) {
      const runs = await fetchRuns(DISPATCH_RUNS_URL, token);
      const run = runs
        .filter((candidate) => Date.parse(candidate.created_at) >= startedAt - 10_000)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

      if (run?.status === "completed") return run;
      if (run) {
        setState({
          running: true,
          label: run.status === "queued" ? "待機中…" : automatic ? "自動取得中…" : "取得中…",
          message: automatic
            ? "定期取得の遅れを補完しています。"
            : "GitHub ActionsでRSSを確認しています。",
        });
      }

      await delay(7_000);
    }

    const error = new Error("Sync timed out");
    error.code = "TIMEOUT";
    throw error;
  }

  async function runSync({ automatic = false } = {}) {
    if (syncing) return false;

    let token = readStoredToken();
    if (!token && automatic) return false;
    if (!token) token = await requestToken();
    if (!token) return false;

    const startedAt = Date.now();
    setState({
      running: true,
      label: automatic ? "自動補完中…" : "開始中…",
      message: automatic
        ? "定期取得が13分以上来ていないため、取得を補完します。"
        : "GitHub Actionsを起動しています。",
    });

    try {
      const response = await fetch(WORKFLOW_DISPATCH_URL, {
        method: "POST",
        headers: githubHeaders(token, true),
        body: JSON.stringify({
          ref: "main",
          inputs: {
            send_test: "false",
            trigger_source: automatic ? "fallback" : "manual",
          },
        }),
      });

      if (response.status === 401 || response.status === 403) throw authenticationError();
      if (response.status !== 204) throw new Error(`Workflow dispatch: HTTP ${response.status}`);

      setState({
        running: true,
        label: "待機中…",
        message: automatic ? "補完取得を受け付けました。" : "手動取得を受け付けました。",
      });

      const run = await waitForDispatchRun(startedAt, token, automatic);
      if (run.conclusion !== "success") {
        throw new Error(`Workflow finished with ${run.conclusion}`);
      }

      setState({
        running: false,
        label: "取得完了",
        message: automatic ? "遅れていた取得を補完しました。" : "最新の記事を確認しました。",
      });

      await delay(1_000);
      if (typeof window.refreshOrchard === "function") {
        window.refreshOrchard();
        restoreButtonSoon();
      } else {
        window.location.reload();
      }
      return true;
    } catch (error) {
      if (error.code === "AUTH") {
        removeStoredToken();
        setState({
          running: false,
          label: "認証エラー",
          message: "トークンを確認してください。次回、もう一度入力できます。",
        });
      } else if (error.code === "TIMEOUT") {
        setState({
          running: false,
          label: "確認中",
          message: "処理は続いている可能性があります。少し後に再読み込みしてください。",
        });
      } else {
        setState({
          running: false,
          label: "取得失敗",
          message: "RSS取得に失敗しました。少し後にもう一度試してください。",
        });
      }
      restoreButtonSoon();
      console.error(error);
      return false;
    }
  }

  async function ensureRecentSync({ forceCheck = false } = {}) {
    if (syncing || autoCheckRunning || document.visibilityState === "hidden") return;

    const token = readStoredToken();
    if (!token) return;

    const now = Date.now();
    if (!forceCheck && now - lastAutoCheckAt < AUTO_CHECK_INTERVAL_MS) return;
    lastAutoCheckAt = now;
    autoCheckRunning = true;

    try {
      const latestRun = await fetchLatestRssRunForFallback(token);
      if (latestRun && latestRun.status !== "completed") return;

      const latestTime = Date.parse(
        latestRun?.updated_at || latestRun?.run_started_at || latestRun?.created_at || "",
      );

      if (!Number.isFinite(latestTime) || now - latestTime >= AUTO_SYNC_STALE_MS) {
        await runSync({ automatic: true });
      }
    } catch (error) {
      if (error.code === "AUTH") {
        removeStoredToken();
        setState({
          running: false,
          label: "認証エラー",
          message: "自動補完用のトークンが無効です。今すぐ取得から再設定してください。",
        });
      }
      console.error(error);
    } finally {
      autoCheckRunning = false;
    }
  }

  manualSyncButton?.addEventListener("click", () => runSync());

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void ensureRecentSync({ forceCheck: true });
  });
  window.addEventListener("focus", () => void ensureRecentSync({ forceCheck: true }));
  window.addEventListener("online", () => void ensureRecentSync({ forceCheck: true }));
  window.setTimeout(() => void ensureRecentSync({ forceCheck: true }), 2_500);
  window.setInterval(() => void ensureRecentSync(), AUTO_CHECK_INTERVAL_MS);
})();
