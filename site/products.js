const DATA_URL = "./data/products.json";
const PAGE_SIZE = 48;

const state = { products: [], filtered: [], family: "すべて", shown: PAGE_SIZE };
const grid = document.querySelector("#product-grid");
const status = document.querySelector("#product-status");
const search = document.querySelector("#product-search");
const filters = document.querySelector("#family-filter");
const loadMore = document.querySelector("#load-more");
const template = document.querySelector("#product-template");

const familyOrder = ["iPhone", "iPad", "MacBook Pro", "MacBook Air", "iMac", "Mac mini", "Mac Studio", "Mac Pro", "Apple Watch", "Audio", "HomePod", "Apple TV", "Display", "Accessories"];

function formatDate(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : value;
}

function fact(label, value) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value || "—";
  row.append(dt, dd);
  return row;
}

function searchable(product) {
  return [product.name, product.family, ...product.chips, ...product.storage, ...product.models, ...product.identifiers, ...product.colors.map((color) => color.name)].join(" ").toLowerCase();
}

function renderCard(product) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector(".product-family").textContent = product.family;
  card.querySelector("h2").textContent = product.name;
  const year = product.released?.slice(0, 4) || "年代不明";
  card.querySelector(".product-year").textContent = year;

  const facts = card.querySelector(".product-facts");
  facts.append(
    fact("発売日", formatDate(product.released)),
    fact("チップ", product.chips.join(" / ") || "—"),
    fact("ストレージ", product.storage.join(" / ") || "—"),
    fact("発売時価格", product.prices.join(" / ") || "—")
  );

  const colors = card.querySelector(".color-list");
  for (const color of product.colors.slice(0, 10)) {
    const item = document.createElement("span");
    item.className = "color-item";
    const swatch = document.createElement("i");
    if (color.hex && /^[0-9a-f]{6}$/i.test(color.hex)) swatch.style.backgroundColor = `#${color.hex}`;
    item.append(swatch, document.createTextNode(color.name));
    colors.append(item);
  }
  if (!product.colors.length) colors.hidden = true;

  const details = card.querySelector(".product-details dl");
  details.append(
    fact("発表日", formatDate(product.announced)),
    fact("販売終了", formatDate(product.discontinued)),
    fact("モデル番号", product.models.join(", ") || "—"),
    fact("識別子", product.identifiers.join(", ") || "—")
  );
  return card;
}

function applyFilter() {
  const query = search.value.trim().toLowerCase();
  state.filtered = state.products.filter((product) => {
    const familyMatches = state.family === "すべて" || product.family === state.family;
    return familyMatches && (!query || searchable(product).includes(query));
  });
  state.shown = PAGE_SIZE;
  render();
}

function render() {
  grid.replaceChildren(...state.filtered.slice(0, state.shown).map(renderCard));
  grid.setAttribute("aria-busy", "false");
  if (!state.filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "該当する製品が見つかりませんでした。";
    grid.append(empty);
  }
  status.textContent = `${state.filtered.length.toLocaleString("ja-JP")}製品`;
  loadMore.hidden = state.shown >= state.filtered.length;
}

function renderFilters() {
  const counts = new Map();
  for (const product of state.products) counts.set(product.family, (counts.get(product.family) || 0) + 1);
  const families = [...counts].sort(([a], [b]) => {
    const ai = familyOrder.indexOf(a); const bi = familyOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi;
  });
  for (const [name, count] of [["すべて", state.products.length], ...families]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${name === state.family ? " active" : ""}`;
    button.textContent = `${name} ${count}`;
    button.addEventListener("click", () => {
      state.family = name;
      filters.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      applyFilter();
    });
    filters.append(button);
  }
}

search.addEventListener("input", applyFilter);
loadMore.addEventListener("click", () => { state.shown += PAGE_SIZE; render(); });

fetch(DATA_URL, { cache: "no-store" })
  .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then((data) => {
    state.products = data.products || [];
    state.filtered = state.products;
    renderFilters();
    render();
  })
  .catch(() => {
    grid.innerHTML = '<div class="empty-state">製品データを読み込めませんでした。時間をおいて再度お試しください。</div>';
    status.textContent = "読み込みエラー";
  });
