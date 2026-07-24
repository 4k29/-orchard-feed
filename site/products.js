const U = "./data/products.json";
const N = 48;
const ALL = "All";
const FILTER_KEYS = ["series", "size", "generation", "tier", "model"];
const S = {
  a: [],
  f: [],
  c: ALL,
  filters: Object.fromEntries(FILTER_KEYS.map((key) => [key, ALL])),
  n: N,
};

const G = document.querySelector("#product-grid");
const T = document.querySelector("#product-status");
const Q = document.querySelector("#product-search");
const R = document.querySelector("#product-search-clear");
const F = document.querySelector("#family-filter");
const A = document.querySelector("#advanced-filters");
const M = document.querySelector("#load-more");
const X = document.querySelector("#product-template");

const C = ["iPhone", "iPad", "MacBook", "Mac", "Apple Watch", "AirPods", "Beats", "AirTag", "HomePod"];
const CONFIG = {
  iPhone: [{ key: "series", label: "シリーズ", order: ["Pro Max", "Pro", "Max", "Air", "Plus", "無印", "mini", "SE", "e"] }],
  iPad: [
    { key: "series", label: "シリーズ", order: ["Pro", "Air", "無印", "mini"] },
    { key: "size", label: "サイズ", sort: "size" },
  ],
  MacBook: [
    { key: "series", label: "シリーズ", order: ["Pro", "Air", "Neo"] },
    { key: "size", label: "サイズ", sort: "size" },
    { key: "generation", label: "チップ世代", sort: "chip" },
    { key: "tier", label: "チップ種類", order: ["無印", "Pro", "Max", "Ultra"] },
  ],
  Mac: [
    { key: "series", label: "シリーズ", order: ["iMac", "mini", "Studio", "Pro"] },
    { key: "generation", label: "チップ世代", sort: "chip" },
    { key: "tier", label: "チップ種類", order: ["無印", "Pro", "Max", "Ultra"] },
  ],
  "Apple Watch": [{ key: "series", label: "シリーズ", order: ["Ultra", "Series", "SE", "その他"] }],
  AirPods: [
    { key: "series", label: "シリーズ", order: ["無印", "Pro", "Max"] },
    { key: "model", label: "世代", sort: "airpods" },
  ],
};

const uniq = (values) => [...new Set((values || []).filter(Boolean))];

function category(product) {
  const text = `${product.family || ""} ${product.name || ""}`.toLowerCase();
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("airpods")) return "AirPods";
  if (text.includes("beats")) return "Beats";
  if (text.includes("airtag")) return "AirTag";
  if (text.includes("homepod")) return "HomePod";
  if (text.includes("macbook")) return "MacBook";
  if (/imac|mac mini|mac studio|mac pro/.test(text)) return "Mac";
  return "";
}

function chipText(product) {
  return `${(product.chips || []).join(" ")} ${product.name || ""}`;
}

function hasMChip(product) {
  return /\bM\d+(?:\s+(?:Pro|Max|Ultra))?\b/i.test(chipText(product));
}

function isNeo(product) {
  return /MacBook Neo/i.test(product.name || "") || /\bA18 Pro\b/i.test(chipText(product));
}

function isPart(product) {
  const name = product.name || "";
  const family = product.family || "";
  const text = `${name} ${family}`;
  if (/software|application/i.test(family)) return true;
  if (/(^|[ (])(left|right)([ )]|$)/i.test(name)) return true;
  if (/nano-sim card for ipad/i.test(name)) return true;
  if (/\bdock\b|raid card|superdrive|developer transition kit|virtual machine|riser|diagnostic dock|restore dock/i.test(name)) return true;
  if (!/^PowerBook\b/i.test(name) && /\bkeyboard\b/i.test(name)) return true;
  if (!/^airpods\b/i.test(name) && /charging case|smart case|battery case|\bcase\b/i.test(name)) return true;
  if (/iphone/i.test(name) && /bluetooth headset|\bheadset\b|leather sleeve|\bsleeve\b|silicone case|clear case|finewoven case|smart battery case/i.test(name)) return true;
  return /battery|cable|adapter|charger|replacement|service part|logic board|display unit|demo unit|prototype|unreleased|unknown|module|bracelet|store panel|housing|enclosure|bumper|magic keyboard|keyboard folio|magsafe wallet|wallet with magsafe|ssd (?:kit|upgrade)|storage upgrade|upgrade kit|iphone pocket/i.test(text);
}

function stripRegionalSuffixes(value) {
  return String(value || "")
    .replace(/\s*[（(](?:GSM|CDMA|Global|China(?: Mainland)?|Japan|Verizon|AT&T|Sprint|T-Mobile|Rest of World|ROW|TD-LTE|MM|VZ|1\s*or\s*2\s*TB|1TB)(?:[^）)]*)[）)]\s*/gi, " ")
    .replace(/\s*[-–—]\s*(?:GSM|CDMA|Global)\s*$/gi, " ")
    .replace(/\s*\+\s*3G(?:\s*[（(][^）)]*[）)])?\s*$/gi, " ")
    .replace(/\s*[（(]Mid 2012[）)]\s*$/gi, " ");
}

function japaneseName(value, family) {
  let name = stripRegionalSuffixes(value)
    .replace(/\s+with\s+.*charging case.*$/i, "")
    .replace(/\s*[（(](?:left|right)[^）)]*[）)]\s*/gi, " ")
    .trim();
  name = name
    .replace(/\b(\d+)(?:st|nd|rd|th) generation\b/gi, "第$1世代")
    .replace(/\b(\d+(?:\.\d+)?)-inch\b/gi, "$1インチ");
  if (family === "Apple Watch") {
    name = name.replace(/\s*[（(][^）)]*(?:\d+mm|GPS|Cellular|Aluminum|Titanium|Stainless|Nike|Hermès)[^）)]*[）)]/gi, "");
  }
  if (family === "iPad") name = name.replace(/,?\s*(?:Wi[‑-]Fi(?:\s*\+\s*Cellular)?|Cellular)\s*/gi, "");
  return name
    .replace(/\(([^)]*)\)/g, "（$1）")
    .replace(/\s+（/g, "（")
    .replace(/\s*,\s*/g, "、")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function series(product) {
  const name = product.name || "";
  if (product.category === "iPhone") {
    if (/Pro Max/i.test(name)) return "Pro Max";
    if (/\bMax\b/i.test(name)) return "Max";
    if (/\bPro\b/i.test(name)) return "Pro";
    if (/\bPlus\b/i.test(name)) return "Plus";
    if (/\bAir\b/i.test(name)) return "Air";
    if (/\bmini\b/i.test(name)) return "mini";
    if (/\bSE\b/i.test(name)) return "SE";
    if (/\b\d+e\b/i.test(name)) return "e";
    return "無印";
  }
  if (product.category === "iPad") {
    if (/\bmini\b/i.test(name)) return "mini";
    if (/\bPro\b/i.test(name)) return "Pro";
    if (/\bAir\b/i.test(name)) return "Air";
    return "無印";
  }
  if (product.category === "MacBook") {
    if (/MacBook Neo/i.test(name)) return "Neo";
    if (/MacBook Pro/i.test(name)) return "Pro";
    if (/MacBook Air/i.test(name)) return "Air";
    return "";
  }
  if (product.category === "Mac") {
    if (/^iMac\b/i.test(name)) return "iMac";
    if (/^Mac mini\b/i.test(name)) return "mini";
    if (/^Mac Studio\b/i.test(name)) return "Studio";
    if (/^Mac Pro\b/i.test(name)) return "Pro";
    return "";
  }
  if (product.category === "Apple Watch") {
    if (/\bUltra\b/i.test(name)) return "Ultra";
    if (/\bSeries\b/i.test(name)) return "Series";
    if (/\bSE\b/i.test(name)) return "SE";
    return "その他";
  }
  if (product.category === "AirPods") {
    if (/^AirPods Max/i.test(name)) return "Max";
    if (/^AirPods Pro/i.test(name)) return "Pro";
    return "無印";
  }
  return "";
}

function productSize(product) {
  const match = (product.name || "").match(/(\d+(?:\.\d+)?)インチ/);
  if (match) return `${Number(match[1])}インチ`;
  if (product.category === "MacBook" && (/MacBook (?:Air|Pro)/i.test(product.name || "") || isNeo(product))) return "13インチ";
  return "";
}

function chipGenerations(product) {
  const generations = [];
  for (const chip of product.chips || []) {
    for (const match of String(chip).matchAll(/\b([MA]\d+)\b/gi)) generations.push(match[1].toUpperCase());
  }
  if (!generations.length) {
    for (const match of chipText(product).matchAll(/\b([MA]\d+)\b/gi)) generations.push(match[1].toUpperCase());
  }
  return uniq(generations);
}

function chipTiers(product) {
  const tiers = [];
  const chipSources = (product.chips || []).length ? product.chips : [chipText(product)];
  for (const chip of chipSources) {
    const text = String(chip);
    const named = [...text.matchAll(/\b(?:M|A)\d+\s+(Ultra|Max|Pro)\b/gi)];
    if (named.length) {
      for (const match of named) {
        const tier = match[1].toLowerCase();
        tiers.push(tier === "ultra" ? "Ultra" : tier === "max" ? "Max" : "Pro");
      }
    } else if (/\b(?:M|A)\d+\b/i.test(text)) {
      tiers.push("無印");
    }
  }
  return uniq(tiers);
}

function primaryChipTier(product) {
  const rank = { Ultra: 0, Max: 1, Pro: 2, 無印: 3 };
  return chipTiers(product).sort((a, b) => (rank[a] ?? 9) - (rank[b] ?? 9))[0] || "";
}

function airPodsGeneration(product) {
  const name = product.name || "";
  if (/^AirPods 4（ANC）/i.test(name)) return "4 ANC";
  const match = name.match(/^AirPods(?: Pro| Max)?\s+(\d+)/i);
  return match?.[1] || "";
}

function filterValues(product, key) {
  if (key === "series") return [series(product)];
  if (key === "size") return [productSize(product)];
  if (key === "generation") return chipGenerations(product);
  if (key === "tier") return chipTiers(product);
  if (key === "model") return [airPodsGeneration(product)];
  return [];
}

function matchesFilter(product, key, selected) {
  return selected === ALL || filterValues(product, key).includes(selected);
}

function variantRank(product) {
  const name = product.name || "";
  if (product.category === "iPhone") {
    if (/Pro Max/i.test(name)) return 0;
    if (/\bPro\b/i.test(name)) return 10;
    if (/\bMax\b/i.test(name)) return 15;
    if (/\b(?:Air|Plus)\b/i.test(name)) return 20;
    if (/\bmini\b/i.test(name)) return 40;
    if (/\b(?:SE|\de)\b/i.test(name)) return 50;
    return 30;
  }
  if (["MacBook", "Mac"].includes(product.category)) {
    const size = Number(productSize(product).replace("インチ", "") || 0);
    const tier = { Ultra: 0, Max: 1, Pro: 2, 無印: 3 }[primaryChipTier(product)] ?? 4;
    return (30 - size) * 10 + tier;
  }
  if (product.category === "iPad") {
    const line = series(product) === "Pro" ? 0 : series(product) === "Air" ? 10 : series(product) === "mini" ? 30 : 20;
    const size = Number(productSize(product).replace("インチ", "") || 0);
    return line + (20 - size) / 100;
  }
  if (product.category === "Apple Watch") return /Ultra/i.test(name) ? 0 : /Series/i.test(name) ? 10 : /SE/i.test(name) ? 20 : 30;
  return 0;
}

function productSort(a, b) {
  return (
    (b.released || "").localeCompare(a.released || "") ||
    variantRank(a) - variantRank(b) ||
    a.name.localeCompare(b.name, "ja", { numeric: true })
  );
}

function mergeProducts(rows) {
  const grouped = new Map();
  for (const raw of rows) {
    const family = category(raw);
    if (!family || isPart(raw)) continue;
    if (family === "MacBook" && !hasMChip(raw) && !isNeo(raw)) continue;
    if (family === "Mac" && !hasMChip(raw)) continue;
    const name = japaneseName(raw.name, family);
    const year = (raw.released || "").slice(0, 4);
    const key = family === "iPhone" ? `${family}|${name}` : `${family}|${name}|${year}`;
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
      initialOS: raw.initialOS || "",
      documentationUrl: raw.documentationUrl || raw.officialSourceUrl || "",
      documentationDirect: Boolean(raw.documentationDirect),
    };
    product.released = [product.released, raw.released].filter(Boolean).sort()[0] || null;
    product.discontinued = [product.discontinued, raw.discontinued].filter(Boolean).sort().at(-1) || null;
    product.prices = uniq([...product.prices, ...(raw.prices || [])]);
    product.storage = uniq([...product.storage, ...(raw.storage || [])]);
    product.chips = uniq([...product.chips, ...(raw.chips || [])]);
    product.models = uniq([...product.models, ...(raw.models || [])]);
    product.identifiers = uniq([...product.identifiers, ...(raw.identifiers || [])]);
    product.initialOS ||= raw.initialOS;
    product.priceHistory ||= raw.priceHistory;
    if (raw.documentationDirect || !product.documentationUrl) {
      product.documentationUrl = raw.documentationUrl || raw.officialSourceUrl || product.documentationUrl;
      product.documentationDirect = Boolean(raw.documentationDirect);
    }
    const colorMap = new Map(product.colors.map((color) => [color.name, color]));
    for (const color of raw.colors || []) if (color?.name && !colorMap.has(color.name)) colorMap.set(color.name, color);
    product.colors = [...colorMap.values()];
    grouped.set(key, product);
  }
  return [...grouped.values()].sort(productSort);
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
  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
    fact(product.priceHistory ? "価格履歴" : "発売時価格", product.prices.join(" → ")),
  ];
  card.querySelector(".product-facts").append(...facts);

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

  const details = card.querySelector(".product-details");
  const detailFacts = [];
  if (!["AirPods", "AirTag"].includes(product.category)) {
    detailFacts.push(fact("初期OS", product.initialOS));
  }
  detailFacts.push(
    fact("販売終了", date(product.discontinued)),
    fact("日本向けモデル番号", product.models.join(", ")),
    fact("識別子", product.identifiers.join(", ")),
  );
  details.querySelector("dl").append(...detailFacts);

  if (product.documentationUrl) {
    const links = document.createElement("div");
    links.className = "release-links";
    const link = document.createElement("a");
    link.href = product.documentationUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = product.documentationDirect ? "Appleの技術仕様を見る" : "Apple公式資料を開く";
    links.append(link);
    details.append(links);
  }
  return card;
}

function haystack(product) {
  return [
    product.name,
    product.family,
    product.category,
    product.initialOS,
    ...FILTER_KEYS.flatMap((key) => filterValues(product, key)),
    ...product.chips,
    ...product.storage,
    ...product.models,
    ...product.identifiers,
    ...product.colors.map((color) => color.name),
  ].join(" ").toLowerCase();
}

function matchesSelectedFilters(product) {
  return (CONFIG[S.c] || []).every(({ key }) => matchesFilter(product, key, S.filters[key]));
}

function draw() {
  G.replaceChildren(...S.f.slice(0, S.n).map(card));
  if (!S.f.length) G.innerHTML = '<div class="empty-state">該当する製品がありません。</div>';
  T.textContent = `${S.f.length.toLocaleString("ja-JP")}製品`;
  M.hidden = S.n >= S.f.length;
}

function updateSearchClear() {
  if (R) R.hidden = !Q.value;
}

function apply() {
  const query = Q.value.trim().toLowerCase();
  S.f = S.a.filter((product) =>
    (S.c === ALL || product.category === S.c) &&
    matchesSelectedFilters(product) &&
    (!query || haystack(product).includes(query)),
  );
  S.n = N;
  draw();
}

function button(name, active, onClick, count = null) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = `filter-button${active ? " active" : ""}`;
  element.dataset.filter = name;
  element.textContent = count == null ? name : `${name} ${count}`;
  element.onclick = onClick;
  return element;
}

function sortOptions(values, mode) {
  if (mode === "size") return values.sort((a, b) => parseFloat(b) - parseFloat(a));
  if (mode === "chip") {
    const rank = (value) => value.startsWith("M") ? Number(value.slice(1)) : 100 + Number(value.slice(1));
    return values.sort((a, b) => rank(a) - rank(b));
  }
  if (mode === "airpods") {
    const rank = (value) => value === "4 ANC" ? 4.5 : Number(value) || 99;
    return values.sort((a, b) => rank(a) - rank(b));
  }
  return values.sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
}

function resetFilters(fromIndex = 0, definitions = CONFIG[S.c] || []) {
  definitions.slice(fromIndex).forEach(({ key }) => { S.filters[key] = ALL; });
}

function advancedFilters() {
  A.replaceChildren();
  const definitions = CONFIG[S.c] || [];
  if (!definitions.length) {
    A.hidden = true;
    return;
  }
  A.hidden = false;
  let candidates = S.a.filter((product) => product.category === S.c);

  definitions.forEach((definition, index) => {
    const available = uniq(candidates.flatMap((product) => filterValues(product, definition.key))).filter(Boolean);
    const options = definition.order
      ? definition.order.filter((value) => available.includes(value))
      : sortOptions(available, definition.sort);

    if (!options.length) {
      S.filters[definition.key] = ALL;
      return;
    }
    if (S.filters[definition.key] !== ALL && !options.includes(S.filters[definition.key])) {
      S.filters[definition.key] = ALL;
      resetFilters(index + 1, definitions);
    }

    const group = document.createElement("div");
    group.className = "filter-group";
    const label = document.createElement("p");
    label.className = "filter-label";
    label.textContent = definition.label;
    const row = document.createElement("div");
    row.className = "family-filter subfilter-row";

    [ALL, ...options].forEach((name) => row.append(button(name, name === S.filters[definition.key], () => {
      S.filters[definition.key] = name;
      resetFilters(index + 1, definitions);
      advancedFilters();
      apply();
    })));

    group.append(label, row);
    A.append(group);
    if (S.filters[definition.key] !== ALL) {
      candidates = candidates.filter((product) => matchesFilter(product, definition.key, S.filters[definition.key]));
    }
  });

  A.hidden = !A.childElementCount;
}

function familyButtons() {
  F.replaceChildren();
  [ALL, ...C].forEach((name) => {
    const count = name === ALL ? S.a.length : S.a.filter((product) => product.category === name).length;
    if (name !== ALL && !count) return;
    F.append(button(name, name === S.c, () => {
      S.c = name;
      S.filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, ALL]));
      F.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item.dataset.filter === name));
      advancedFilters();
      apply();
    }, count));
  });
}

Q.addEventListener("input", () => {
  updateSearchClear();
  apply();
});

if (R) {
  R.addEventListener("click", () => {
    Q.value = "";
    updateSearchClear();
    apply();
    Q.focus();
  });
}

M.onclick = () => {
  S.n += N;
  draw();
};

updateSearchClear();
fetch(U)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    S.a = mergeProducts(data.products || []);
    S.f = S.a;
    familyButtons();
    advancedFilters();
    draw();
  })
  .catch((error) => {
    console.error(error);
    T.textContent = "読み込みエラー";
    G.innerHTML = '<div class="empty-state">製品データを読み込めませんでした。</div>';
  });
