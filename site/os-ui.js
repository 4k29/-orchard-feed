const osFilter = document.querySelector("#release-filter");
const osSearch = document.querySelector("#release-search");
const osSearchClear = document.querySelector("#release-search-clear");
const osReleaseList = document.querySelector("#release-list");
const osStatus = document.querySelector("#release-status");

const RELEASE_DATA_URLS = [
  `https://raw.githubusercontent.com/4k29/-orchard-feed/main/data/releases.json?${Date.now()}`,
  "./data/releases.json",
  "../data/releases.json",
];
const RELEASE_RUNS_URL =
  "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/releases.yml/runs?per_page=20";
const TOKEN_STORAGE_KEY = "orchard.github-token";
const LAST_CHECK_STORAGE_KEY = "orchard.os-last-check";

const originalRemoveRepeatedBetaFeatures = window.removeRepeatedBetaFeatures;
if (typeof originalRemoveRepeatedBetaFeatures === "function") {
  window.removeRepeatedBetaFeatures = (rows) =>
    originalRemoveRepeatedBetaFeatures(
      rows.filter((release) => String(release.channel || "").toLowerCase() !== "public-beta"),
    );
}

window.channelLabel = (channel) => {
  if (channel === "developer-beta" || channel === "public-beta" || channel === "beta") {
    return "Beta";
  }
  if (channel === "rc") return "RC";
  return "正規版";
};

function renameAllFilter() {
  const allButton = [...osFilter.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "すべて",
  );
  if (!allButton) return false;
  allButton.textContent = "All";
  return true;
}

if (!renameAllFilter()) {
  const filterObserver = new MutationObserver(() => {
    if (renameAllFilter()) filterObserver.disconnect();
  });
  filterObserver.observe(osFilter, { childList: true });
}

function renameBetaBadges() {
  osReleaseList.querySelectorAll(".release-badge").forEach((badge) => {
    if (/^(?:Dev|Pub) (?:Beta|β)$/.test(badge.textContent.trim())) {
      badge.textContent = "Beta";
    }
  });
}

const releaseObserver = new MutationObserver(renameBetaBadges);
releaseObserver.observe(osReleaseList, { childList: true, subtree: true });
renameBetaBadges();

function syncSearchClear() {
  osSearchClear.hidden = !osSearch.value;
}

osSearch.addEventListener("input", syncSearchClear);
osSearchClear.addEventListener("click", () => {
  osSearch.value = "";
  osSearch.dispatchEvent(new Event("input", { bubbles: true }));
  osSearch.focus();
});
syncSearchClear();

function formatLastCheck(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(timestamp))
      .map(({ type, value: partValue }) => [type, partValue]),
  );
  return `最終確認 ${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

let lastCheckText = "";
let lastCheckTimestamp = 0;
let metaLoading = false;

function readStoredValue(key) {
  try {
    return localStorage.getItem(key)?.trim() || "";
  } catch {
    return "";
  }
}

function storeLastCheck(value) {
  try {
    localStorage.setItem(LAST_CHECK_STORAGE_KEY, value);
  } catch {
    // Ignore storage errors.
  }
}

function setLastCheck(value, { persist = true } = {}) {
  const timestamp = Date.parse(value);
  const formatted = formatLastCheck(value);
  if (!formatted || Number.isNaN(timestamp) || timestamp < lastCheckTimestamp) return false;

  lastCheckTimestamp = timestamp;
  lastCheckText = formatted;
  osStatus.textContent = lastCheckText;
  if (persist) storeLastCheck(new Date(timestamp).toISOString());
  return true;
}

window.setOrchardReleaseLastCheck = setLastCheck;

const storedLastCheck = readStoredValue(LAST_CHECK_STORAGE_KEY);
if (storedLastCheck) setLastCheck(storedLastCheck, { persist: false });

const statusObserver = new MutationObserver(() => {
  if (
    lastCheckText &&
    osStatus.textContent !== lastCheckText &&
    !/エラー|読み込めません/.test(osStatus.textContent)
  ) {
    osStatus.textContent = lastCheckText;
  }
});
statusObserver.observe(osStatus, { childList: true, characterData: true, subtree: true });

function githubHeaders(token = "") {
  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchLatestSuccessfulRun() {
  const token = readStoredValue(TOKEN_STORAGE_KEY);
  let response = await fetch(`${RELEASE_RUNS_URL}&t=${Date.now()}`, {
    cache: "no-store",
    headers: githubHeaders(token),
  });

  if (token && (response.status === 401 || response.status === 403)) {
    response = await fetch(`${RELEASE_RUNS_URL}&t=${Date.now()}`, {
      cache: "no-store",
      headers: githubHeaders(),
    });
  }

  if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);
  const payload = await response.json();
  const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];

  return runs
    .filter(
      (run) =>
        (run.event === "schedule" || run.event === "workflow_dispatch") &&
        run.status === "completed" &&
        run.conclusion === "success",
    )
    .sort(
      (a, b) =>
        Date.parse(b.updated_at || b.run_started_at || b.created_at || "") -
        Date.parse(a.updated_at || a.run_started_at || a.created_at || ""),
    )[0] || null;
}

async function fetchReleaseDataUpdatedAt() {
  let lastError;
  for (const baseUrl of RELEASE_DATA_URLS) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    try {
      const response = await fetch(`${baseUrl}${separator}t=${Date.now()}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.releases)) throw new Error("Invalid release data");
      return payload.updatedAt || "";
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Release metadata could not be loaded");
}

async function loadReleaseMeta() {
  if (metaLoading) return;
  metaLoading = true;

  try {
    const run = await fetchLatestSuccessfulRun();
    const checkedAt = run?.updated_at || run?.run_started_at || run?.created_at;
    if (checkedAt) {
      setLastCheck(checkedAt);
      return;
    }

    const updatedAt = await fetchReleaseDataUpdatedAt();
    if (updatedAt) setLastCheck(updatedAt);
  } catch (error) {
    try {
      const updatedAt = await fetchReleaseDataUpdatedAt();
      if (updatedAt) setLastCheck(updatedAt);
    } catch (fallbackError) {
      console.error(error, fallbackError);
    }
  } finally {
    metaLoading = false;
  }
}

function refreshReleaseMeta() {
  void loadReleaseMeta();
}

window.refreshOrchardReleaseMeta = loadReleaseMeta;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshReleaseMeta();
});
window.addEventListener("focus", refreshReleaseMeta);
window.addEventListener("online", refreshReleaseMeta);

void loadReleaseMeta();
window.setInterval(refreshReleaseMeta, 60 * 1000);