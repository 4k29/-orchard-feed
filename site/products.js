const U = "./data/products.json";
const N = 48;
const S = { a: [], f: [], c: "すべて", n: N };
const G = document.querySelector("#product-grid");
const T = document.querySelector("#product-status");
const Q = document.querySelector("#product-search");
const F = document.querySelector("#family-filter");
const M = document.querySelector("#load-more");
const X = document.querySelector("#product-template");
const C = ["iPhone", "iPad", "Apple Watch", "Mac", "AirPods", "AirTag", "HomePod"];

const uniq = (values) => [...new Set((values || []).filter(Boolean))];

function category(product) {
  const text = `${product.family} ${product.name}`.toLowerCase();
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("airpods")) return "AirPods";
  if (text.includes("airtag")) return "AirTag";
  if (text.includes("homepod")) return "HomePod";
  if (/macbook|imac|mac mini|mac studio|mac pro|macintosh|powerbook|ibook/.test(text)) return "Mac";
  return "";
}

function isPart(product) {
  const name = product.name || "";
  const family = product.family || "";
  if (/(^|[ (])(left|right)([ )]|$)/i.test(name)) return true;
  if (!/^airpods\b/i.test(name) && /charging case|smart case|battery case|\bcase\b/i.test(name)) return true;
  return /battery|cable|adapter|charger|replacement|service part|logic board|display unit|demo unit|prototype|unreleased|unknown|module|bracelet|store panel|housing|enclosure|bumper|magic keyboard|keyboard folio|magsafe wallet|wallet with magsafe|ssd (?:kit|upgrade)|storage upgrade|upgrade kit|iphone pocket/i.test(
    `${name} ${family}`,
  );
}

function japaneseName(value, family) {
  let name = String(value || "")
    .replace(/\s+with\s+.*charging case.*$/i, "")
    .replace(/\s*\((?:left|right)[^)]*\)\s*/gi, " ")
    .trim();
  name = name
    .replace(/\b(\d+)(?:st|nd|rd|th) generation\b/gi, "第$1世代")
    .replace(/\b(\d+(?:\.\d+)?)-inch\b/gi, "$1インチ");
  if (family === "Apple Watch") {
    name = name.replace(
      /\s*\([^)]*(?:\d+mm|GPS|Cellular|Aluminum|Titanium|Stainless|Nike|Hermès)[^)]*\)/gi,
      "",
    );
  }
  if (family === "iPad") {
    name = name.replace(/,?\s*(?:Wi[‑-]Fi(?:\s*\+\s*Cellular)?|Cellular)\s*/gi, "");
  }
  return name
    .replace(/\(([^)]*)\)/g, "（$1）")
    .replace(/\s*,\s*/g, "、")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function variantRank(product) {
  const name = product.name;
  if (product.category === "iPhone") {
    if (/Pro Max/i.test(name)) return 0;
    if (/\bPro\b/i.test(name)) return 10;
    if (/\b(?:Air|Plus)\b/i.test(name)) return 20;
    if (/\bmini\b/i.test(name)) return 40;
    if (/\b(?:SE|\de)\b/i.test(name)) return 50;
    return 30;
  }
  if (product.category === "Mac" && /MacBook/i.test(name)) {
    const size = Number(name.match(/(\d+(?:\.\d+)?)インチ/)?.[1] || 0);
    const chip = /\bMax\b/i.test(name) ? 0 : /\bPro\b/i.test(name) ? 1 : 2;
    return (20 - size) * 10 + chip;
  }
  if (product.category === "iPad") {
    const line = /\bPro\b/i.test(name) ? 0 : /\bAir\b/i.test(name) ? 10 : /\bmini\b/i.test(name) ? 30 : 20;
    const size = Number(name.match(/(\d+(?:\.\d+)?)インチ/)?.[1] || 0);
    return line + (20 - size) / 100;
  }
  if (product.category === "Apple Watch") {
    return /Ultra/i.test(name) ? 0 : /Series/i.test(name) ? 10 : /SE/i.test(name) ? 20 : 30;
  }
  return 0;
}

function mergeProducts(rows) {
  const grouped = new Map();
  for (const raw of rows) {
    const family = category(raw);
    if (!family || isPart(raw)) continue;
    const name = japaneseName(raw.name, family);
    const year = (raw.released || "").slice(0, 4);
    const key = [family, name, year].join("|");
    const product = grouped.get(key) || {
      ...raw,
      name,
      category: family,
      prices: [],
      storage: [],
      colors: [],
      chips: [],
      models: [],
      identifiers: [],
    };
    product.released ||= raw.released;
    product.discontinued ||= raw.discontinued;
    product.prices = uniq([...product.prices, ...(raw.prices || [])]);
    product.storage = uniq([...product.storage, ...(raw.storage || [])]);
    product.chips = uniq([...product.chips, ...(raw.chips || [])]);
    product.models = uniq([...product.models, ...(raw.models || [])]);
    product.identifiers = uniq([...product.identifiers, ...(raw.identifiers || [])]);
    const colorMap = new Map(product.colors.map((color) => [color.name, color]));
    for (const color of raw.colors || []) {
      if (color?.name && !colorMap.has(color.name)) colorMap.set(color.name, color);
    }
    product.colors = [...colorMap.values()];
    grouped.set(key, product);
  }
  return [...grouped.values()].sort(
    (a, b) =>
      (b.released || "").localeCompare(a.released || "") ||
      variantRank(a) - variantRank(b) ||
      a.name.localeCompare(b.name, "ja", { numeric: true }),
  );
}

function date(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}年${+match[2]}月${+match[3]}日` : value;
}

function fact(label, value) {
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value || "—";
  wrapper.append(term, description);
  return wrapper;
}

function card(product) {
  const card = X.content.firstElementChild.cloneNode(true);
  card.querySelector(".product-family").textContent = product.category;
  card.querySelector("h2").textContent = product.name;
  card.querySelector("time").textContent = product.released?.slice(0, 4) || "年代不明";
  card
    .querySelector(".product-facts")
    .append(
      fact("発売日", date(product.released)),
      fact("チップ", product.chips.join(" / ")),
      fact("ストレージ", product.storage.join(" / ")),
      fact("発売時価格", product.prices.join(" → ")),
    );
  const colors = card.querySelector(".color-list");
  product.colors.slice(0, 12).forEach((color) => {
    const item = document.createElement("span");
    const swatch = document.createElement("i");
    item.className = "color-item";
    if (/^[0-9a-f]{6}$/i.test(color.hex || "")) swatch.style.backgroundColor = `#${color.hex}`;
    item.append(swatch, document.createTextNode(color.name));
    colors.append(item);
  });
  if (!product.colors.length) colors.hidden = true;
  card
    .querySelector(".product-details dl")
    .append(
      fact("販売終了", date(product.discontinued)),
      fact("日本向けモデル番号", product.models.join(", ")),
      fact("識別子", product.identifiers.join(", ")),
    );
  return card;
}

function haystack(product) {
  return [
    product.name,
    product.family,
    ...product.chips,
    ...product.storage,
    ...product.models,
    ...product.identifiers,
    ...product.colors.map((color) => color.name),
  ]
    .join(" ")
    .toLowerCase();
}

function draw() {
  G.replaceChildren(...S.f.slice(0, S.n).map(card));
  if (!S.f.length) G.innerHTML = '<div class="empty-state">該当する製品がありません。</div>';
  T.textContent = `${S.f.length.toLocaleString("ja-JP")}製品`;
  M.hidden = S.n >= S.f.length;
}

function apply() {
  const query = Q.value.trim().toLowerCase();
  S.f = S.a.filter(
    (product) =>
      (S.c === "すべて" || product.category === S.c) &&
      (!query || haystack(product).includes(query)),
  );
  S.n = N;
  draw();
}

function buttons() {
  ["すべて", ...C].forEach((name) => {
    const button = document.createElement("button");
    button.className = `filter-button${name === S.c ? " active" : ""}`;
    button.textContent = `${name} ${name === "すべて" ? S.a.length : S.a.filter((product) => product.category === name).length}`;
    button.onclick = () => {
      S.c = name;
      F.querySelectorAll("button").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      apply();
    };
    F.append(button);
  });
}

Q.oninput = apply;
M.onclick = () => {
  S.n += N;
  draw();
};
fetch(U, { cache: "no-store" })
  .then((response) => response.json())
  .then((data) => {
    S.a = mergeProducts(data.products || []);
    S.f = S.a;
    buttons();
    draw();
  })
  .catch(() => {
    T.textContent = "読み込みエラー";
    G.innerHTML = '<div class="empty-state">製品データを読み込めませんでした。</div>';
  });
