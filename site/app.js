const state = {
  articles: [],
  query: "",
};

const articleList = document.querySelector("#article-list");
const articleTemplate = document.querySelector("#article-template");
const syncStatus = document.querySelector("#sync-status");
const searchInput = document.querySelector("#search");
const searchClear = document.querySelector("#search-clear");
const SYNC_RUNS_URL =
  "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?status=completed&per_page=1";
const FEED_URL =
  "https://raw.githubusercontent.com/4k29/-orchard-feed/main/data/articles.json";

function formatDate(value) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  const jst = new Date(timestamp + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hour = String(jst.getUTCHours()).padStart(2, "0");
  const minute = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function formatTime(value) {
  const formatted = formatDate(value);
  return formatted.split(" ")[1] || "--:--";
}

function normalizeImageUrl(value) {
  if (typeof value !== "string") return "";

  const normalized = value
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&");

  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

async function updateLastCheck(fallbackValue) {
  try {
    const response = await fetch(SYNC_RUNS_URL, {
      headers: { accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const checkedAt = payload.workflow_runs?.[0]?.updated_at;
    syncStatus.textContent = `最終確認 ${formatTime(checkedAt || fallbackValue)}`;
  } catch {
    syncStatus.textContent = `最終確認 ${formatTime(fallbackValue)}`;
  }
}

function filteredArticles() {
  const query = state.query.trim().toLocaleLowerCase("ja-JP");
  return state.articles.filter((article) => {
    const searchable = [article.titleJa, article.summaryJa, article.source, ...(article.tags || [])]
      .join(" ")
      .toLocaleLowerCase("ja-JP");
    return !query || searchable.includes(query);
  });
}

function createArticle(article, index) {
  const fragment = articleTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".article-row");
  const mark = fragment.querySelector(".source-mark");
  const link = fragment.querySelector(".article-link");
  const imageLink = fragment.querySelector(".article-image-link");
  const image = fragment.querySelector(".article-image");
  const time = fragment.querySelector("time");

  if (index === 0) row.classList.add("featured");
  mark.classList.add(`source-${article.sourceId}`);
  mark.querySelector("span").textContent = article.source.slice(0, 1);
  link.href = article.url;
  fragment.querySelector(".article-source").textContent = article.source;
  time.dateTime = article.publishedAt;
  time.textContent = formatDate(article.publishedAt);
  fragment.querySelector("h2").textContent = article.titleJa;
  fragment.querySelector(".article-summary").textContent = article.summaryJa;

  const imageUrl = normalizeImageUrl(article.imageUrl);
  if (imageUrl) {
    row.classList.add("has-image");
    imageLink.hidden = false;
    imageLink.href = article.url;
    image.src = imageUrl;
    if (index === 0) image.fetchPriority = "high";
    image.addEventListener(
      "error",
      () => {
        row.classList.remove("has-image");
        imageLink.hidden = true;
      },
      { once: true },
    );
  }

  return fragment;
}

function updateSearchClear() {
  searchClear.hidden = searchInput.value.length === 0;
}

function clearSearch({ focus = true } = {}) {
  state.query = "";
  searchInput.value = "";
  updateSearchClear();
  render();
  if (focus) searchInput.focus();
}

function render() {
  const articles = filteredArticles();
  articleList.replaceChildren();
  articleList.setAttribute("aria-busy", "false");

  if (!articles.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = "<p>一致する記事はありません。</p>";
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "検索を解除";
    reset.addEventListener("click", () => clearSearch());
    empty.append(reset);
    articleList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  articles.forEach((article, index) => fragment.append(createArticle(article, index)));
  articleList.append(fragment);
}

async function loadFeed() {
  try {
    const response = await fetch(FEED_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.articles)) throw new Error("Invalid feed");
    state.articles = payload.articles;
    syncStatus.textContent = `最終確認 ${formatTime(payload.updatedAt)}`;
    render();
    void updateLastCheck(payload.updatedAt);
  } catch (error) {
    articleList.setAttribute("aria-busy", "false");
    articleList.innerHTML = '<div class="empty-state"><p>記事を読み込めませんでした。少し待ってから再読み込みしてください。</p></div>';
    syncStatus.textContent = "同期状況を取得できませんでした";
    console.error(error);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  updateSearchClear();
  render();
});

searchClear.addEventListener("click", () => clearSearch());
updateSearchClear();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service Workerの登録に失敗しました。", error);
    });
  });
}

loadFeed();
window.setInterval(loadFeed, 5 * 60 * 1000);
