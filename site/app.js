const state = {
  articles: [],
  filter: "all",
  query: "",
};

const articleList = document.querySelector("#article-list");
const articleTemplate = document.querySelector("#article-template");
const syncStatus = document.querySelector("#sync-status");
const searchInput = document.querySelector("#search");
const filterButtons = [...document.querySelectorAll("[data-filter]")];

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

function filteredArticles() {
  const query = state.query.trim().toLocaleLowerCase("ja-JP");
  return state.articles.filter((article) => {
    const categoryMatches = state.filter === "all" || article.category === state.filter;
    const searchable = [article.titleJa, article.summaryJa, article.source, ...(article.tags || [])]
      .join(" ")
      .toLocaleLowerCase("ja-JP");
    return categoryMatches && (!query || searchable.includes(query));
  });
}

function createArticle(article, index) {
  const fragment = articleTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".article-row");
  const mark = fragment.querySelector(".source-mark");
  const link = fragment.querySelector(".article-link");
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

  const tagList = fragment.querySelector(".tag-list");
  for (const tag of (article.tags || []).slice(0, 3)) {
    const element = document.createElement("span");
    element.className = "tag";
    element.textContent = tag;
    tagList.append(element);
  }
  return fragment;
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
    reset.textContent = "絞り込みを解除";
    reset.addEventListener("click", () => {
      state.filter = "all";
      state.query = "";
      searchInput.value = "";
      updateFilterButtons();
      render();
    });
    empty.append(reset);
    articleList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  articles.forEach((article, index) => fragment.append(createArticle(article, index)));
  articleList.append(fragment);
}

function updateFilterButtons() {
  for (const button of filterButtons) {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

async function loadFeed() {
  try {
    const response = await fetch(`./data/articles.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.articles)) throw new Error("Invalid feed");
    state.articles = payload.articles;
    syncStatus.textContent = `最終更新 ${formatDate(payload.updatedAt)}`;
    render();
  } catch (error) {
    articleList.setAttribute("aria-busy", "false");
    articleList.innerHTML = '<div class="empty-state"><p>記事を読み込めませんでした。少し待ってから再読み込みしてください。</p></div>';
    syncStatus.textContent = "同期状況を取得できませんでした";
    console.error(error);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    updateFilterButtons();
    render();
  });
}

loadFeed();
window.setInterval(loadFeed, 5 * 60 * 1000);
