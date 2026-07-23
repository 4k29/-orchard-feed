const osFilter = document.querySelector("#release-filter");
const osSearch = document.querySelector("#release-search");
const osSearchClear = document.querySelector("#release-search-clear");

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
