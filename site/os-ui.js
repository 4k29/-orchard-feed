const osFilter = document.querySelector("#release-filter");
const osSearch = document.querySelector("#release-search");
const osSearchClear = document.querySelector("#release-search-clear");
const osReleaseList = document.querySelector("#release-list");
const osStatus = document.querySelector("#release-status");

const RELEASE_META_URLS = [
  `https://raw.githubusercontent.com/4k29/-orchard-feed/main/data/releases.json?${Date.now()}`,
  "./data/releases.json",
  "../data/releases.json",
];

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
let metaLoading = false;

function setLastCheck(value) {
  const formatted = formatLastCheck(value);
  if (!formatted) return false;
  lastCheckText = formatted;
  osStatus.textContent = lastCheckText;
  return true;
}

window.setOrchardReleaseLastCheck = setLastCheck;

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

async function loadReleaseMeta() {
  if (metaLoading) return;
  metaLoading = true;

  try {
    let payload;
    let lastError;
    for (const baseUrl of RELEASE_META_URLS) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      try {
        const response = await fetch(`${baseUrl}${separator}t=${Date.now()}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const candidate = await response.json();
        if (!candidate || !Array.isArray(candidate.releases)) throw new Error("Invalid release data");
        payload = candidate;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!payload) throw lastError || new Error("Release metadata could not be loaded");
    if (payload.updatedAt) setLastCheck(payload.updatedAt);
  } catch (error) {
    console.error(error);
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
