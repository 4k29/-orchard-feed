import fs from "node:fs";

const input = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));
const shortDate = (value) => String(value).replace(/^20(\d{2})\//, "$1/");
const yen = (value, tax = "") => `${Number(value).toLocaleString("ja-JP")}円${tax === "税別" ? "（税別）" : ""}～`;
const dated = (value, date, tax = "") => `${yen(value, tax)}(${shortDate(date)})`;
const setPrices = (product, prices, source = "Apple Newsroom（日本）・Apple Store（日本）") => {
  product.prices = prices;
  product.priceHistory = prices.length > 1;
  product.priceSource = source;
};
const setDoc = (product, url) => {
  product.documentationUrl = url;
  product.documentationDirect = true;
  product.documentationSource = "Apple公式技術仕様";
};
const chipText = (product) => `${product.name || ""} ${(product.chips || []).join(" ")}`;
const sizeOf = (product) => Number((product.name || "").match(/(13|14|15|16)インチ/)?.[1] || 13);

const currentPriceHistory = new Map([
  ["iPhone 17e", [yen(99800), dated(107800, "2026/7/18")]],
  ["iPhone 17", [yen(129800), dated(142800, "2026/7/18")]],
  ["iPhone Air", [yen(159800), dated(177800, "2026/7/18")]],
  ["iPhone 17 Pro", [yen(179800), dated(194800, "2026/7/18")]],
  ["iPhone 17 Pro Max", [yen(194800), dated(214800, "2026/7/18")]],
  ["iPhone 16", [yen(114800), dated(124800, "2026/7/18")]],
  ["iPhone 16 Plus", [yen(129800), dated(144800, "2026/7/18")]],
  ["MacBook Neo", [yen(99800), dated(119800, "2026/6/25")]],
  ["Apple Watch Series 11", [yen(64800), dated(71800, "2026/7/18")]],
  ["Apple Watch SE 3", [yen(37800), dated(41800, "2026/7/18")]],
  ["Apple Watch Ultra 3", [yen(129800), dated(142800, "2026/7/18")]],
  ["AirPods 4", [yen(21800), dated(23800, "2026/7/18")]],
  ["AirPods 4（ANC）", [yen(29800), dated(32800, "2026/7/18")]],
  ["AirPods Pro 3", [yen(39800), dated(42800, "2026/7/18")]],
  ["AirPods Max 2", [yen(89800)]],
]);

const revisionDates = new Map([
  ["iPad Air 13インチ（M4）", ["26/6/25"]],
  ["iPad Air 11インチ（M4）", ["26/6/25"]],
  ["iPad Pro 13インチ（M5）", ["26/6/25"]],
  ["iPad Pro 11インチ（M5）", ["26/6/25"]],
  ["iPad（A16）", ["26/6/25"]],
  ["iPad mini（A17 Pro）", ["26/6/25"]],
  ["MacBook Air（M2、2022）", ["24/3/5"]],
  ["iPad Air（第5世代）", ["22/7/1", "22/10/19"]],
  ["iPhone SE（第3世代）", ["22/7/1"]],
  ["AirPods 3", ["22/7/1"]],
  ["MacBook Pro（16インチ、M1 Max、2021）", ["22/6/7"]],
  ["MacBook Pro（16インチ、M1 Pro、2021）", ["22/6/7"]],
  ["MacBook Pro（14インチ、M1 Max、2021）", ["22/6/7"]],
  ["MacBook Pro（14インチ、M1 Pro、2021）", ["22/6/7"]],
  ["Apple Watch Series 7", ["22/7/1"]],
  ["iPhone 13 Pro Max", ["22/7/1"]],
  ["iPhone 13 Pro", ["22/7/1"]],
  ["iPad（第9世代）", ["22/7/1"]],
  ["iPhone 13", ["22/7/1"]],
  ["iPad mini（第6世代）", ["22/7/1", "22/10/19"]],
  ["iPhone 13 mini", ["22/7/1"]],
  ["iPad Pro 12.9インチ（第5世代）", ["22/7/1"]],
  ["iPad Pro 11インチ（第3世代）", ["22/7/1"]],
  ["AirPods Max 1", ["22/7/1"]],
  ["MacBook Air（M1、2020）", ["22/6/7"]],
  ["AirPods Pro 1", ["22/7/1"]],
  ["iPad（第4世代）", ["13/5/31"]],
  ["iPad mini", ["13/5/31"]],
]);

const maxColors = {
  "AirPods Max 1": [
    ["Space Gray", "6E6E73"],
    ["Silver", "E3E4E5"],
    ["Sky Blue", "91AAB6"],
    ["Green", "A8C4B8"],
    ["Pink", "E8B4B8"],
  ],
  "AirPods Max 1（USB-C）": [
    ["Blue", "64727D"],
    ["Purple", "DAD8E1"],
    ["Midnight", "22252B"],
    ["Starlight", "EAE1D4"],
    ["Orange", "FFC09E"],
  ],
  "AirPods Max 2": [
    ["Blue", "64727D"],
    ["Purple", "DAD8E1"],
    ["Midnight", "22252B"],
    ["Starlight", "EAE1D4"],
    ["Orange", "FFC09E"],
  ],
};

function setMacBookPrices(product) {
  const text = chipText(product);
  const size = sizeOf(product);
  if (/MacBook Neo/.test(text)) return setPrices(product, currentPriceHistory.get("MacBook Neo"));
  if (/MacBook Air/.test(text) && /\bM5\b/.test(text)) {
    return setPrices(product, size === 15
      ? [yen(219800), dated(264800, "2026/6/25")]
      : [yen(184800), dated(224800, "2026/6/25")]);
  }
  if (/MacBook Pro/.test(text) && /\bM5 Max\b/.test(text)) {
    return setPrices(product, size === 16
      ? [yen(649800), dated(749800, "2026/6/25")]
      : [yen(599800), dated(699800, "2026/6/25")]);
  }
  if (/MacBook Pro/.test(text) && /\bM5 Pro\b/.test(text)) {
    return setPrices(product, size === 16
      ? [yen(449800), dated(519800, "2026/6/25")]
      : [yen(369800), dated(429800, "2026/6/25")]);
  }
  if (/MacBook Pro/.test(text) && /\bM5\b/.test(text)) {
    return setPrices(product, [yen(248800), dated(278800, "2026/3/3"), dated(339800, "2026/6/25")]);
  }
}

function normalizeExistingPrices(product) {
  if (!product.prices?.length) return;
  product.prices = product.prices.map((price) => {
    const text = String(price)
      .replace(/（税込）/g, "")
      .replace(/〜/g, "～")
      .replace(/\(20(\d{2})\/(\d{1,2})\/(\d{1,2})\)/g, "($1/$2/$3)");
    if (/～(?:\([^)]*\))?$/.test(text)) return text;
    const dateMatch = text.match(/\((\d{2}\/\d{1,2}\/\d{1,2})\)$/);
    if (dateMatch) return `${text.slice(0, dateMatch.index)}～(${dateMatch[1]})`;
    return `${text}～`;
  });
}

function appendRevisionDates(product) {
  const dates = revisionDates.get(product.name || "");
  if (!dates || !product.prices?.length) return;
  product.prices = product.prices.map((price, index) => {
    if (index === 0 || /\(\d{2}\/\d{1,2}\/\d{1,2}\)$/.test(String(price))) return price;
    const date = dates[index - 1];
    return date ? `${price}(${date})` : price;
  });
  product.priceHistory = product.prices.length > 1;
}

const products = [];
for (const product of data.products || []) {
  const name = product.name || "";
  if (/Charging Case|Charging Box|Store Display Model/i.test(name)) continue;

  if (/^Apple Watch（第1世代）$/i.test(name)) {
    setDoc(product, "https://support.apple.com/ja-jp/112009");
    setPrices(product, [yen(42800, "税別")]);
  }
  if (name === "Apple Watch Series 3") setPrices(product, [yen(36800, "税別")]);
  if (name === "Apple Watch SE 1") setPrices(product, [yen(29800, "税別")]);
  if (name === "Apple Watch SE 2") setPrices(product, [yen(37800)]);

  if (name === "AirTag") {
    setPrices(product, [
      "1個 3,800円 / 4個 12,800円～",
      "1個 4,780円 / 4個 15,980円～(22/7/1)",
      "1個 4,980円 / 4個 16,980円～(23/9/13)",
    ], "Apple Newsroom（日本）・Apple Store（日本）・国内価格改定記録");
  }
  if (name === "AirPods 2") {
    setPrices(product, [
      yen(17800, "税別"),
      dated(16800, "2021/10/19"),
      dated(19800, "2022/7/1"),
    ]);
  }

  const mapped = currentPriceHistory.get(name);
  if (mapped) setPrices(product, mapped);
  if (/MacBook/i.test(name)) setMacBookPrices(product);

  if (name === "AirPods Pro 3") product.chips = ["H2"];
  if (maxColors[name]) product.colors = maxColors[name].map(([colorName, hex]) => ({ name: colorName, hex }));

  normalizeExistingPrices(product);
  appendRevisionDates(product);
  if ((product.prices || []).length > 1) product.priceHistory = true;
  if (/^(?:AirPods|AirTag)\b/.test(name)) product.priceHistory = true;
  products.push(product);
}

data.products = products;
data.count = products.length;
data.updatedAt = new Date().toISOString();
fs.writeFileSync(input, `${JSON.stringify(data)}\n`);
console.log(`Finalized ${products.length} product records.`);
