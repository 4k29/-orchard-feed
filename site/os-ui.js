const osFilter = document.querySelector("#release-filter");
const osSearch = document.querySelector("#release-search");
const osSearchClear = document.querySelector("#release-search-clear");
const osReleaseList = document.querySelector("#release-list");

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
    if (badge.textContent.trim() === "Dev β") badge.textContent = "Dev Beta";
    if (badge.textContent.trim() === "Pub β") badge.textContent = "Pub Beta";
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