import fs from "node:fs";
import { load } from "cheerio";

const input = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));

const unique = (values) => [...new Set((values || []).filter(Boolean).map(String))];
const intersects = (values, candidates) => values.some((value) => candidates.includes(value));
const yen = (value, tax = "税込") => `${Number(value).toLocaleString("ja-JP")}円（${tax}）`;
const setPrices = (product, values, source = "Apple公式価格資料") => {
  if (!values?.length) return;
  product.prices = values;
  product.priceHistory = values.length > 1;
  product.priceSource = source;
};
const setDoc = (product, url, source = "Apple公式技術仕様") => {
  if (!url) return;
  product.documentationUrl = url;
  product.documentationDirect = true;
  product.documentationSource = source;
};

const macBookDocs = new Map([
  ["Air-M1-13", "https://support.apple.com/ja-jp/111883"],
  ["Air-M2-13", "https://support.apple.com/ja-jp/111867"],
  ["Air-M2-15", "https://support.apple.com/ja-jp/111346"],
  ["Air-M3-13", "https://support.apple.com/ja-jp/118551"],
  ["Air-M3-15", "https://support.apple.com/ja-jp/118552"],
  ["Air-M4-13", "https://support.apple.com/ja-jp/122209"],
  ["Air-M4-15", "https://support.apple.com/ja-jp/122210"],
  ["Air-M5-13", "https://support.apple.com/ja-jp/126320"],
  ["Air-M5-15", "https://support.apple.com/ja-jp/126321"],
  ["Pro-M1-13-base", "https://support.apple.com/ja-jp/111893"],
  ["Pro-M1-14-high", "https://support.apple.com/ja-jp/111902"],
  ["Pro-M1-16-high", "https://support.apple.com/ja-jp/111901"],
  ["Pro-M2-13-base", "https://support.apple.com/ja-jp/111869"],
  ["Pro-M2-14-high", "https://support.apple.com/ja-jp/111340"],
  ["Pro-M2-16-high", "https://support.apple.com/ja-jp/111838"],
  ["Pro-M3-14-base", "https://support.apple.com/ja-jp/117735"],
  ["Pro-M3-14-high", "https://support.apple.com/ja-jp/117736"],
  ["Pro-M3-16-high", "https://support.apple.com/ja-jp/117737"],
  ["Pro-M4-14-base", "https://support.apple.com/ja-jp/121552"],
  ["Pro-M4-14-high", "https://support.apple.com/ja-jp/121553"],
  ["Pro-M4-16-high", "https://support.apple.com/ja-jp/121554"],
  ["Pro-M5-14-base", "https://support.apple.com/ja-jp/125405"],
  ["Pro-M5-14-high", "https://support.apple.com/ja-jp/126318"],
  ["Pro-M5-16-high", "https://support.apple.com/ja-jp/126319"],
]);

const watchDocs = new Map([
  ["Apple Watch Series 1", "https://support.apple.com/ja-jp/111985"],
  ["Apple Watch Series 2", "https://support.apple.com/ja-jp/112022"],
  ["Apple Watch Series 3", "https://support.apple.com/ja-jp/111891"],
  ["Apple Watch Series 4", "https://support.apple.com/ja-jp/111984"],
  ["Apple Watch Series 5", "https://support.apple.com/ja-jp/118453"],
  ["Apple Watch Series 6", "https://support.apple.com/ja-jp/111918"],
  ["Apple Watch SE 1", "https://support.apple.com/ja-jp/111862"],
  ["Apple Watch Series 7", "https://support.apple.com/ja-jp/111909"],
  ["Apple Watch Series 8", "https://support.apple.com/ja-jp/111848"],
  ["Apple Watch SE 2", "https://support.apple.com/ja-jp/111853"],
  ["Apple Watch Ultra 1", "https://support.apple.com/ja-jp/111852"],
  ["Apple Watch Series 9", "https://support.apple.com/ja-jp/111833"],
  ["Apple Watch Ultra 2", "https://support.apple.com/ja-jp/111832"],
  ["Apple Watch Series 10", "https://support.apple.com/ja-jp/121202"],
  ["Apple Watch Series 11", "https://support.apple.com/ja-jp/125093"],
  ["Apple Watch SE 3", "https://support.apple.com/ja-jp/125094"],
  ["Apple Watch Ultra 3", "https://support.apple.com/ja-jp/125095"],
]);

const watchPrices = new Map([
  ["Apple Watch Series 1", [yen(27800, "税別")]],
  ["Apple Watch Series 2", [yen(37800, "税別")]],
  ["Apple Watch Series 3", [yen(36800, "税別")]],
  ["Apple Watch Series 4", [yen(45800, "税別")]],
  ["Apple Watch Series 5", [yen(42800, "税別")]],
  ["Apple Watch Series 6", [yen(42800, "税別")]],
  ["Apple Watch SE 1", [yen(29800, "税別")]],
  ["Apple Watch Series 7", [yen(48800), yen(58800)]],
  ["Apple Watch Series 8", [yen(59800)]],
  ["Apple Watch SE 2", [yen(37800)]],
  ["Apple Watch Ultra 1", [yen(124800)]],
  ["Apple Watch Series 9", [yen(59800)]],
  ["Apple Watch Ultra 2", [yen(128800)]],
  ["Apple Watch Series 10", [yen(59800)]],
  ["Apple Watch Series 11", [yen(64800)]],
  ["Apple Watch SE 3", [yen(37800)]],
  ["Apple Watch Ultra 3", [yen(129800)]],
]);

const airPodsMeta = [
  { models: ["A1523", "A1722"], name: "AirPods 1", doc: "https://support.apple.com/ja-jp/111855", prices: [yen(16800, "税別")] },
  { models: ["A2031", "A2032"], name: "AirPods 2", doc: "https://support.apple.com/ja-jp/111856", prices: [yen(17800, "税別"), yen(19800)] },
  { models: ["A2564", "A2565"], name: "AirPods 3", doc: "https://support.apple.com/ja-jp/111863", prices: [yen(23800), yen(27800)] },
  { models: ["A3050", "A3053", "A3054"], name: "AirPods 4", doc: "https://support.apple.com/ja-jp/121203", prices: [yen(21800)] },
  { models: ["A3055", "A3056", "A3057"], name: "AirPods 4（ANC）", doc: "https://support.apple.com/ja-jp/121204", prices: [yen(29800)] },
  { models: ["A2083", "A2084"], name: "AirPods Pro 1", doc: "https://support.apple.com/ja-jp/111861", prices: [yen(30580), yen(38800)] },
  { models: ["A2618", "A2619", "A2698", "A2699", "A2931"], name: "AirPods Pro 2（Lightning）", doc: "https://support.apple.com/ja-jp/111851", prices: [yen(39800)] },
  { models: ["A3047", "A3048", "A3049"], name: "AirPods Pro 2（USB-C）", doc: "https://support.apple.com/ja-jp/111851", prices: [yen(39800)] },
  { models: ["A3063", "A3064", "A3065"], name: "AirPods Pro 3", doc: "https://support.apple.com/ja-jp/125135", prices: [yen(39800)] },
  { models: ["A2096"], name: "AirPods Max 1", doc: "https://support.apple.com/ja-jp/111858", prices: [yen(67980), yen(84800)], colors: ["Space Gray", "Silver", "Sky Blue", "Green", "Pink"] },
  { models: ["A3184"], name: "AirPods Max 1（USB-C）", doc: "https://support.apple.com/ja-jp/121205", prices: [yen(84800)], colors: ["Blue", "Purple", "Midnight", "Starlight", "Orange"] },
  { models: ["A3454"], name: "AirPods Max 2", doc: "https://support.apple.com/ja-jp/126620", prices: [yen(89800)], colors: ["Blue", "Purple", "Midnight", "Starlight", "Orange"] },
];

const syntheticAirPods = [
  { name: "AirPods 4", released: "2024-09-20", models: ["A3050", "A3053", "A3054"], identifiers: [], chips: ["H2"] },
  { name: "AirPods 4（ANC）", released: "2024-09-20", models: ["A3055", "A3056", "A3057"], identifiers: [], chips: ["H2"] },
  { name: "AirPods Pro 3", released: "2025-09-19", models: ["A3063", "A3064", "A3065"], identifiers: [], chips: ["H3"] },
];

const iPhonePriceHistory = new Map([
  ["iPhone 17e", [yen(99800), yen(107800)]],
  ["iPhone 17", [yen(129800), yen(142800)]],
  ["iPhone Air", [yen(159800), yen(177800)]],
  ["iPhone 17 Pro", [yen(179800), yen(194800)]],
  ["iPhone 17 Pro Max", [yen(194800), yen(209800)]],
]);

function chipText(product) {
  return `${(product.chips || []).join(" ")} ${product.name || ""}`;
}
function chipInfo(product) {
  const match = chipText(product).match(/\bM(\d+)\b/i);
  if (!match) return null;
  return { generation: `M${match[1]}`, high: /\bM\d+\s+(?:Pro|Max|Ultra)\b/i.test(chipText(product)) };
}
function notebookSize(product) {
  const direct = String(product.name || "").match(/(13|14|15|16)(?:\.\d+)?\s*(?:インチ|inch)/i);
  if (direct) return Number(direct[1]);
  const ids = (product.identifiers || []).join(" ");
  if (/Mac14,15|Mac15,13|Mac16,13|Mac17,4/.test(ids)) return 15;
  if (/MacBookPro18,[12]|Mac14,(?:6|10)|Mac15,(?:7|9|11)|Mac16,(?:5|7)|Mac17,(?:6|8)/.test(ids)) return 16;
  if (/MacBookPro18,[34]|Mac14,[59]|Mac15,(?:3|6|8|10)|Mac16,(?:1|6|8)|Mac17,(?:2|7|9)/.test(ids)) return 14;
  return 13;
}
function macBookKey(product) {
  if (/MacBook Neo/i.test(product.name || "")) return "Neo";
  const info = chipInfo(product);
  if (!info) return "";
  const family = /MacBook Air/i.test(product.name || "") ? "Air" : /MacBook Pro/i.test(product.name || "") ? "Pro" : "";
  if (!family) return "";
  return family === "Air"
    ? `${family}-${info.generation}-${notebookSize(product)}`
    : `${family}-${info.generation}-${notebookSize(product)}-${info.high ? "high" : "base"}`;
}

function applyMacBookPrice(product) {
  const name = product.name || "";
  const text = chipText(product);
  const size = notebookSize(product);
  if (/MacBook Neo/i.test(name)) return setPrices(product, [yen(99800), yen(119800)]);
  if (/MacBook Air/i.test(name) && /\bM1\b/i.test(text)) return setPrices(product, [yen(115280), yen(134800)]);
  if (/MacBook Air/i.test(name) && /\bM2\b/i.test(text) && size === 13) return setPrices(product, [yen(164800), yen(148800)]);
  if (/MacBook Air/i.test(name) && /\bM2\b/i.test(text) && size === 15) return setPrices(product, [yen(198800)]);
  if (/MacBook Air/i.test(name) && /\bM3\b/i.test(text)) return setPrices(product, [yen(size === 15 ? 198800 : 164800)]);
  if (/MacBook Air/i.test(name) && /\bM4\b/i.test(text)) return setPrices(product, [yen(size === 15 ? 198800 : 164800)]);
  if (/MacBook Air/i.test(name) && /\bM5\b/i.test(text)) return setPrices(product, [yen(size === 15 ? 219800 : 184800), yen(size === 15 ? 264800 : 224800)]);
  if (/MacBook Pro/i.test(name) && /\bM1\b/i.test(text) && size === 13) return setPrices(product, [yen(148280)]);
  if (/MacBook Pro/i.test(name) && /\bM1 (?:Pro|Max)\b/i.test(text) && size === 14) return setPrices(product, [yen(239800), yen(274800)]);
  if (/MacBook Pro/i.test(name) && /\bM1 (?:Pro|Max)\b/i.test(text) && size === 16) return setPrices(product, [yen(299800), yen(338800)]);
  if (/MacBook Pro/i.test(name) && /\bM2\b/i.test(text) && size === 13) return setPrices(product, [yen(178800)]);
  if (/MacBook Pro/i.test(name) && /\bM2 Pro\b/i.test(text) && size === 14) return setPrices(product, [yen(288800)]);
  if (/MacBook Pro/i.test(name) && /\bM2 Pro\b/i.test(text) && size === 16) return setPrices(product, [yen(348800)]);
  if (/MacBook Pro/i.test(name) && /\bM3\b/i.test(text) && !/\bM3 (?:Pro|Max)\b/i.test(text)) return setPrices(product, [yen(248800)]);
  if (/MacBook Pro/i.test(name) && /\bM3 Pro\b/i.test(text)) return setPrices(product, [yen(size === 16 ? 398800 : 328800)]);
  if (/MacBook Pro/i.test(name) && /\bM4\b/i.test(text) && !/\bM4 (?:Pro|Max)\b/i.test(text)) return setPrices(product, [yen(248800)]);
  if (/MacBook Pro/i.test(name) && /\bM4 Pro\b/i.test(text)) return setPrices(product, [yen(size === 16 ? 398800 : 328800)]);
  if (/MacBook Pro/i.test(name) && /\bM5\b/i.test(text) && !/\bM5 (?:Pro|Max)\b/i.test(text)) return setPrices(product, [yen(248800), yen(279800), yen(339800)]);
  if (/MacBook Pro/i.test(name) && /\bM5 Pro\b/i.test(text)) return setPrices(product, [yen(size === 16 ? 449800 : 369800), yen(size === 16 ? 519800 : 429800)]);
  if (/MacBook Pro/i.test(name) && /\bM5 Max\b/i.test(text)) return setPrices(product, [yen(size === 16 ? 649800 : 599800), yen(size === 16 ? 749800 : 699800)]);
}

function normalizeWatch(product) {
  const year = Number(String(product.released || "").slice(0, 4));
  if (/^Apple Watch SE$/i.test(product.name || "")) product.name = `Apple Watch SE ${year >= 2022 ? 2 : 1}`;
  if (/^Apple Watch Ultra$/i.test(product.name || "")) product.name = "Apple Watch Ultra 1";
  const doc = watchDocs.get(product.name);
  if (doc) setDoc(product, doc);
  const prices = watchPrices.get(product.name);
  if (prices) setPrices(product, prices);
}

function normalizeAirPods(product) {
  const models = unique(product.models || []);
  const meta = airPodsMeta.find((item) => intersects(models, item.models));
  if (!meta) return;
  product.name = meta.name;
  setDoc(product, meta.doc);
  setPrices(product, meta.prices);
  if (meta.colors) product.colors = meta.colors.map((name) => ({ name, hex: "" }));
}

async function scrapeMacDocumentation() {
  const pages = [
    "https://support.apple.com/ja-jp/108054",
    "https://support.apple.com/ja-jp/102852",
    "https://support.apple.com/ja-jp/102231",
    "https://support.apple.com/ja-jp/102887",
  ];
  const result = new Map();
  for (const page of pages) {
    try {
      const response = await fetch(page);
      if (!response.ok) continue;
      const $ = load(await response.text());
      $("h2").each((_, heading) => {
        const section = $(heading).nextUntil("h2");
        const text = `${$(heading).text()} ${section.text()}`.replace(/\s+/g, " ");
        let url = "";
        section.find("a").each((__, anchor) => {
          if (url || !/技術仕様/.test($(anchor).text())) return;
          const href = $(anchor).attr("href");
          if (href) url = new URL(href, page).href;
        });
        if (!url) return;
        const keys = unique([
          ...text.matchAll(/(?:MacBookAir|MacBookPro|Macmini|MacPro|iMac|Mac)\d+,\d+/g),
          ...text.matchAll(/A\d{4}/g),
        ].map((match) => match[0]));
        keys.forEach((key) => result.set(key, url));
      });
    } catch (error) {
      console.warn(`Apple Mac metadata fetch failed: ${page}: ${error.message}`);
    }
  }
  return result;
}

for (const synthetic of syntheticAirPods) {
  const exists = (data.products || []).some((product) => intersects(product.models || [], synthetic.models));
  if (exists) continue;
  data.products.push({
    ...synthetic,
    family: "AirPods",
    discontinued: null,
    prices: [],
    storage: [],
    colors: [{ name: "White", hex: "FFFFFF" }],
    initialOS: "",
    documentationUrl: "",
    documentationDirect: false,
  });
}

const macDocumentation = await scrapeMacDocumentation();
const products = [];
const warnings = [];

for (const product of data.products || []) {
  const isMacBook = /MacBook/i.test(product.name || "");
  const isMacDesktop = product.family === "Mac" && /^(?:iMac|Mac mini|Mac Studio|Mac Pro)\b/i.test(product.name || "");
  const hasMChip = /\bM\d+(?:\s+(?:Pro|Max|Ultra))?\b/i.test(chipText(product));
  const isNeo = /MacBook Neo/i.test(product.name || "") || /\bA18 Pro\b/i.test(chipText(product));
  if (isMacBook && !hasMChip && !isNeo) continue;
  if (product.family === "Mac" && !isMacBook && (!isMacDesktop || !hasMChip)) continue;

  if (product.family === "iPhone") {
    const prices = iPhonePriceHistory.get(product.name);
    if (prices) setPrices(product, prices, "Apple Newsroom（日本）・Apple Store（日本）");
  }

  if (isMacBook) {
    const key = macBookKey(product);
    const doc = key === "Neo" ? "https://support.apple.com/ja-jp/126322" : macBookDocs.get(key);
    if (doc) setDoc(product, doc);
    else warnings.push(`MacBook documentation: ${product.name}`);
    applyMacBookPrice(product);
  }

  if (isMacDesktop) {
    const identifiers = unique([...(product.identifiers || []), ...(product.models || [])]);
    const doc = identifiers.map((identifier) => macDocumentation.get(identifier)).find(Boolean);
    if (doc) setDoc(product, doc);
    else warnings.push(`Mac documentation: ${product.name}`);
  }

  if (product.family === "Apple Watch") normalizeWatch(product);
  if (product.family === "AirPods") normalizeAirPods(product);

  products.push(product);
}

data.products = products;
data.count = products.length;
data.updatedAt = new Date().toISOString();
data.metadataWarnings = warnings;
fs.writeFileSync(input, `${JSON.stringify(data)}\n`);
console.log(`Applied product metadata to ${products.length} products; ${warnings.length} warning(s).`);
