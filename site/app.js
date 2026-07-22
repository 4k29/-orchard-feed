(() => {
  const state = {
    articles: [],
    query: "",
    updatedAt: null,
  };

  const articleList = document.querySelector("#article-list");
  const articleTemplate = document.querySelector("#article-template");
  const syncStatus = document.querySelector("#sync-status");
  const searchInput = document.querySelector("#search");
  const searchClear = document.querySelector("#search-clear");

  const SCHEDULE_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?event=schedule&per_page=1";
  const DISPATCH_RUNS_URL =
    "https://api.github.com/repos/4k29/-orchard-feed/actions/workflows/sync.yml/runs?event=workflow_dispatch&per_page=10";
  const LOCAL_FEED_URL = "./data/articles.json";
  const RAW_FEED_URL =
    "https://raw.githubusercontent.com/4k29/-orchard-feed/main/data/articles.json";
  const TOKEN_STORAGE_KEY = "orchard.github-token";
  const OVERDUE_AFTER_MS = 20 * 60 * 1000;

  let feedLoading = false;
  let statusLoading = false;

  function getJstParts(value) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return null;

    const parts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));

    return Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  }

  function formatDate(value) {
    const parts = getJstParts(value);
    if (!parts) return "";
    return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
  }

  function formatTime(value) {
    const parts = getJstParts(value);
    if (!parts) return "--:--";
    return `${parts.hour}:${parts.minute}`;
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

  function readToken() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)?.trim() || "";
    } catch {
      return "";
    }
  }

  function githubHeaders(token = "") {
    return {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    };
  }

  async function fetchWorkflowRuns(url) {
    const token = readToken();
    let response = await fetch(`${url}&t=${Date.now()}`, {
      headers: githubHeaders(token),
      cache: "no-store",
    });

    if (token && (response.status === 401 || response.status === 403)) {
      response = await fetch(`${url}&t=${Date.now()}`, {
        headers: githubHeaders(),
        cache: "no-store",
      });
    }

    if (!response.ok) throw new Error(`GitHub Actions: HTTP ${response.status}`);
    const payload = await response.json();
    return Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
  }

  function runType(run) {
    if (run?.event === "schedule") return "自動";
    if (run?.event === "workflow_dispatch") {
      return run.display_title === "RSS自動補完" ? "自動補完" : "手動";
    }
    return "不明";
  }

  function newestRun(runs) {
    return runs
      .filter(Boolean)
      .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))[0] || null;
  }

  async function fetchLatestRssRun() {
    const [scheduled, dispatched] = await Promise.allSettled([
      fetchWorkflowRuns(SCHEDULE_RUNS_URL),
      fetchWorkflowRuns(DISPATCH_RUNS_URL),
    ]);

    const runs = [];
    if (scheduled.status === "fulfilled") runs.push(...scheduled.value);
    if (dispatched.status === "fulfilled") runs.push(...dispatched.value);

    if (!runs.length) {
      const errors = [scheduled, dispatched]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);
      throw new AggregateError(errors, "RSS workflow history could not be loaded");
    }

    return newestRun(runs);
  }

  async function updateLastCheck({ showLoading = false } = {}) {
    if (statusLoading) return;
    statusLoading = true;
    if (showLoading) syncStatus.textContent = "最終確認を取得しています…";

    try {
      const run = await fetchLatestRssRun();
      if (!run) throw new Error("No RSS workflow run");

      const type = runType(run);
      const startedAt = run.run_started_at || run.created_at;
      if (run.status !== "completed") {
        syncStatus.textContent = `${type}確認中 ${formatTime(startedAt)}〜`;
        return;
      }

      const checkedAt = run.updated_at || startedAt;
      if (run.conclusion !== "success") {
        syncStatus.textContent = `確認失敗 ${formatTime(checkedAt)}（${type}）`;
        return;
      }

      const checkedMs = Date.parse(checkedAt);
      const overdue = Number.isFinite(checkedMs) && Date.now() - checkedMs > OVERDUE_AFTER_MS;
      syncStatus.textContent = overdue
        ? `自動確認が遅れています（最終 ${formatTime(checkedAt)}・${type}）`
        : `最終確認 ${formatTime(checkedAt)}（${type}）`;
    } catch (error) {
      if (showLoading || syncStatus.textContent.includes("取得しています")) {
        syncStatus.textContent = "最終確認を取得できませんでした";
      }
      console.error(error);
    } finally {
      statusLoading = false;
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

  function validFeedPayload(value) {
    return value && Array.isArray(value.articles);
  }

  async function fetchFeedSource(url) {
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}t=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);

    const payload = await response.json();
    if (!validFeedPayload(payload)) throw new Error(`${url}: Invalid feed`);
    return payload;
  }

  function newestPayload(payloads) {
    return payloads.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt) || 0;
      const bTime = Date.parse(b.updatedAt) || 0;
      return bTime - aTime;
    })[0];
  }

  async function loadFeed({ showError = false } = {}) {
    if (feedLoading) return;
    feedLoading = true;

    try {
      const results = await Promise.allSettled([
        fetchFeedSource(LOCAL_FEED_URL),
        fetchFeedSource(RAW_FEED_URL),
      ]);
      const payloads = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      if (!payloads.length) {
        throw new AggregateError(
          results.filter((result) => result.status === "rejected").map((result) => result.reason),
          "All feed sources failed",
        );
      }

      const payload = newestPayload(payloads);
      const nextUpdatedAt = payload.updatedAt || null;
      const changed =
        state.updatedAt !== nextUpdatedAt ||
        state.articles.length !== payload.articles.length ||
        state.articles[0]?.id !== payload.articles[0]?.id;

      state.articles = payload.articles;
      state.updatedAt = nextUpdatedAt;
      if (changed) render();
    } catch (error) {
      if (!state.articles.length && showError) {
        articleList.setAttribute("aria-busy", "false");
        articleList.innerHTML =
          '<div class="empty-state"><p>記事を読み込めませんでした。少し待ってから再読み込みしてください。</p></div>';
      }
      console.error(error);
    } finally {
      feedLoading = false;
    }
  }

  function refreshOrchard() {
    void loadFeed();
    void updateLastCheck();
  }

  window.refreshOrchard = refreshOrchard;

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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshOrchard();
  });
  window.addEventListener("focus", refreshOrchard);
  window.addEventListener("online", refreshOrchard);

  void loadFeed({ showError: true });
  void updateLastCheck({ showLoading: true });
  window.setInterval(refreshOrchard, 60 * 1000);
})();
