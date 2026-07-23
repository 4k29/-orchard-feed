(() => {
  const button = document.querySelector("#os-manual-sync");
  const label = document.querySelector("#os-manual-sync-label");
  const status = document.querySelector("#os-manual-sync-status");
  const tokenDialog = document.querySelector("#os-token-dialog");
  const tokenInput = document.querySelector("#os-github-token");

  if (!button || !label) return;

  const TOKEN_STORAGE_KEY = "orchard.github-token";
  const DISPATCH_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/releases.yml/dispatches";
  const RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/releases.yml/runs?event=workflow_dispatch&per_page=10";

  let syncing = false;

  function readToken() {
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
      // The token remains available for this request even if storage is blocked.
    }
  }

  function removeToken() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }

  function headers(token, includeJson = false) {
    return {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(includeJson ? { "content-type": "application/json" } : {}),
    };
  }

  function authenticationError() {
    const error = new Error("Authentication failed");
    error.code = "AUTH";
    return error;
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function setState({ running, text }) {
    syncing = running;
    button.disabled = running;
    button.classList.toggle("is-running", running);
    label.textContent = text;
    if (status) {
      status.textContent = "";
      status.hidden = true;
    }
  }

  function restoreButtonSoon() {
    window.setTimeout(() => {
      if (!syncing) setState({ running: false, text: "更新" });
    }, 4_000);
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

  async function fetchRuns(token) {
    const response = await fetch(`${RUNS_URL}&t=${Date.now()}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) throw authenticationError();
    if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  }

  async function waitForRun(startedAt, token) {
    const deadline = Date.now() + 12 * 60 * 1000;

    while (Date.now() < deadline) {
      const run = (await fetchRuns(token))
        .filter((candidate) => Date.parse(candidate.created_at || "") >= startedAt - 10_000)
        .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))[0];

      if (run?.status === "completed") return run;
      if (run) {
        setState({
          running: true,
          text: run.status === "queued" ? "待機中…" : "取得中…",
        });
      }
      await delay(7_000);
    }

    const error = new Error("Sync timed out");
    error.code = "TIMEOUT";
    throw error;
  }

  async function runSync() {
    if (syncing) return;

    let token = readToken();
    if (!token) token = await requestToken();
    if (!token) return;

    const startedAt = Date.now();
    setState({ running: true, text: "開始中…" });

    try {
      const response = await fetch(DISPATCH_URL, {
        method: "POST",
        headers: headers(token, true),
        body: JSON.stringify({ ref: "main" }),
      });

      if (response.status === 401 || response.status === 403) throw authenticationError();
      if (response.status !== 204) throw new Error(`Workflow dispatch: HTTP ${response.status}`);

      setState({ running: true, text: "待機中…" });
      const run = await waitForRun(startedAt, token);
      if (run.conclusion !== "success") {
        throw new Error(`Workflow finished with ${run.conclusion}`);
      }

      setState({ running: false, text: "取得完了" });
      await delay(1_000);
      window.location.reload();
    } catch (error) {
      if (error.code === "AUTH") {
        removeToken();
        setState({ running: false, text: "認証エラー" });
      } else if (error.code === "TIMEOUT") {
        setState({ running: false, text: "確認中" });
      } else {
        setState({ running: false, text: "取得失敗" });
      }
      restoreButtonSoon();
      console.error(error);
    }
  }

  button.addEventListener("click", runSync);
})();
