const manualSyncButton = document.querySelector("#manual-sync");
const manualSyncLabel = document.querySelector("#manual-sync-label");
const manualSyncStatus = document.querySelector("#manual-sync-status");
const tokenDialog = document.querySelector("#token-dialog");
const tokenInput = document.querySelector("#github-token");

const TOKEN_STORAGE_KEY = "orchard.github-token";
const WORKFLOW_DISPATCH_URL =
  "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/dispatches";
const MANUAL_RUNS_URL =
  "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?event=workflow_dispatch&per_page=10";

let manualSyncing = false;

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
    // Storage may be unavailable. The token will be requested again next time.
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

function setState({ running, label, message = "" }) {
  manualSyncing = running;
  manualSyncButton.disabled = running;
  manualSyncButton.classList.toggle("is-running", running);
  manualSyncLabel.textContent = label;
  manualSyncStatus.textContent = message;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitForRun(startedAt, token) {
  const deadline = Date.now() + 12 * 60 * 1000;

  while (Date.now() < deadline) {
    const response = await fetch(`${MANUAL_RUNS_URL}&t=${Date.now()}`, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      const error = new Error("Authentication failed");
      error.code = "AUTH";
      throw error;
    }
    if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);

    const payload = await response.json();
    const run = (payload.workflow_runs || [])
      .filter((candidate) => Date.parse(candidate.created_at) >= startedAt - 10_000)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

    if (run?.status === "completed") return run;
    if (run) {
      setState({
        running: true,
        label: run.status === "queued" ? "待機中…" : "取得中…",
        message: "GitHub ActionsでRSSを確認しています。",
      });
    }

    await delay(7_000);
  }

  const error = new Error("Manual sync timed out");
  error.code = "TIMEOUT";
  throw error;
}

async function runManualSync() {
  if (manualSyncing) return;

  let token = readStoredToken();
  if (!token) token = await requestToken();
  if (!token) return;

  const startedAt = Date.now();
  setState({ running: true, label: "開始中…", message: "GitHub Actionsを起動しています。" });

  try {
    const response = await fetch(WORKFLOW_DISPATCH_URL, {
      method: "POST",
      headers: githubHeaders(token, true),
      body: JSON.stringify({ ref: "main", inputs: { send_test: "false" } }),
    });

    if (response.status === 401 || response.status === 403) {
      const error = new Error("Authentication failed");
      error.code = "AUTH";
      throw error;
    }
    if (response.status !== 204) throw new Error(`Workflow dispatch: HTTP ${response.status}`);

    setState({ running: true, label: "待機中…", message: "手動取得を受け付けました。" });
    const run = await waitForRun(startedAt, token);
    if (run.conclusion !== "success") throw new Error(`Workflow finished with ${run.conclusion}`);

    setState({ running: false, label: "取得完了", message: "最新の記事を確認しました。" });
    await delay(1_000);
    window.location.reload();
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
        message: "手動取得に失敗しました。少し後にもう一度試してください。",
      });
    }
    console.error(error);
  }
}

manualSyncButton?.addEventListener("click", runManualSync);
