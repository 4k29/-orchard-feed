(() => {
  const button = document.querySelector("#product-manual-sync");
  const label = document.querySelector("#product-manual-sync-label");
  const message = document.querySelector("#product-manual-sync-status");
  const tokenDialog = document.querySelector("#product-token-dialog");
  const tokenInput = document.querySelector("#product-github-token");

  if (!button || !label || !message) return;

  const TOKEN_STORAGE_KEY = "orchard.github-token";
  const WORKFLOW_DISPATCH_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/products.yml/dispatches";
  const DISPATCH_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/products.yml/runs?event=workflow_dispatch&per_page=10";

  let running = false;

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
      // The token will be requested again if local storage is unavailable.
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
      const token = window.prompt("GitHubのFine-grained personal access tokenを入力してください。")?.trim() || "";
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

  function setState({ isRunning, text, detail = "" }) {
    running = isRunning;
    button.disabled = isRunning;
    button.classList.toggle("is-running", isRunning);
    label.textContent = text;
    message.textContent = detail;
    message.hidden = !detail;
  }

  function restoreButtonSoon() {
    window.setTimeout(() => {
      if (!running) setState({ isRunning: false, text: "更新" });
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

  async function fetchRuns(token) {
    const response = await fetch(`${DISPATCH_RUNS_URL}&t=${Date.now()}`, {
      headers: githubHeaders(token),
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
      const runs = await fetchRuns(token);
      const run = runs
        .filter((candidate) => Date.parse(candidate.created_at || "") >= startedAt - 10_000)
        .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))[0];

      if (run?.status === "completed") return run;
      if (run) {
        setState({
          isRunning: true,
          text: run.status === "queued" ? "待機中…" : "確認中…",
          detail: "GitHub Actionsで製品データを確認しています。",
        });
      }
      await delay(7_000);
    }

    const error = new Error("Product check timed out");
    error.code = "TIMEOUT";
    throw error;
  }

  async function runCheck() {
    if (running) return;

    let token = readStoredToken();
    if (!token) token = await requestToken();
    if (!token) return;

    const startedAt = Date.now();
    setState({
      isRunning: true,
      text: "開始中…",
      detail: "GitHub Actionsを起動しています。",
    });

    try {
      const response = await fetch(WORKFLOW_DISPATCH_URL, {
        method: "POST",
        headers: githubHeaders(token, true),
        body: JSON.stringify({ ref: "main" }),
      });

      if (response.status === 401 || response.status === 403) throw authenticationError();
      if (response.status !== 204) throw new Error(`Workflow dispatch: HTTP ${response.status}`);

      setState({
        isRunning: true,
        text: "待機中…",
        detail: "手動確認を受け付けました。",
      });

      const run = await waitForRun(startedAt, token);
      if (run.conclusion !== "success") throw new Error(`Workflow finished with ${run.conclusion}`);

      setState({
        isRunning: false,
        text: "確認完了",
        detail: "最新の製品データを確認しました。変更の反映には少しかかる場合があります。",
      });
      if (typeof window.refreshProductStatus === "function") {
        await window.refreshProductStatus();
      }
      restoreButtonSoon();
    } catch (error) {
      if (error.code === "AUTH") {
        removeStoredToken();
        setState({
          isRunning: false,
          text: "認証エラー",
          detail: "トークンを確認してください。次回、もう一度入力できます。",
        });
      } else if (error.code === "TIMEOUT") {
        setState({
          isRunning: false,
          text: "確認中",
          detail: "処理は続いている可能性があります。少し後に再読み込みしてください。",
        });
      } else {
        setState({
          isRunning: false,
          text: "確認失敗",
          detail: "製品データの確認に失敗しました。少し後にもう一度試してください。",
        });
      }
      restoreButtonSoon();
      console.error(error);
    }
  }

  button.addEventListener("click", () => void runCheck());
})();
