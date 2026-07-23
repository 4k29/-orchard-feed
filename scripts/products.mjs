import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const wanted =
  /iphone|ipad|apple watch|airpods|airtag|homepod|macbook|imac|mac mini|mac studio|mac pro|macintosh|powerbook|ibook/i;

const officialStorage = new Map([
  ["iPhone 17e", ["256GB", "512GB"]],
  ["iPhone 17", ["256GB", "512GB"]],
  ["iPhone Air", ["256GB", "512GB", "1TB"]],
  ["iPhone 17 Pro", ["256GB", "512GB", "1TB"]],
  ["iPhone 17 Pro Max", ["256GB", "512GB", "1TB", "2TB"]],
  ["iPhone 16e", ["128GB", "256GB", "512GB"]],
  ["iPhone 16", ["128GB", "256GB", "512GB"]],
  ["iPhone 16 Plus", ["128GB", "256GB", "512GB"]],
  ["iPhone 16 Pro", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 16 Pro Max", ["256GB", "512GB", "1TB"]],
  ["iPad（A16）", ["128GB", "256GB", "512GB"]],
  ["iPad mini（A17 Pro）", ["128GB", "256GB", "512GB"]],
  ["iPad Air 11インチ（M4）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Air 13インチ（M4）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Air 11インチ（M3）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Air 13インチ（M3）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Air 11インチ（M2）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Air 13インチ（M2）", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPad Pro 11インチ（M5）", ["256GB", "512GB", "1TB", "2TB"]],
  ["iPad Pro 13インチ（M5）", ["256GB", "512GB", "1TB", "2TB"]],
  ["iPad Pro 11インチ（M4）", ["256GB", "512GB", "1TB", "2TB"]],
  ["iPad Pro 13インチ（M4）", ["256GB", "512GB", "1TB", "2TB"]],
  ["MacBook Air（13インチ、M5）", ["512GB", "1TB", "2TB", "4TB"]],
  ["MacBook Air（15インチ、M5）", ["512GB", "1TB", "2TB", "4TB"]],
  ["MacBook Pro 14インチ（M5）", ["512GB", "1TB", "2TB", "4TB"]],
  ["MacBook Pro 14インチ（M5 Pro）", ["1TB", "2TB", "4TB"]],
  ["MacBook Pro 14インチ（M5 Max）", ["1TB", "2TB", "4TB", "8TB"]],
  ["MacBook Pro 16インチ（M5 Pro）", ["1TB", "2TB", "4TB"]],
  ["MacBook Pro 16インチ（M5 Max）", ["1TB", "2TB", "4TB", "8TB"]],
]);

const officialPrices = new Map([
  ["iPhone 17e", ["99,800円"]],
  ["iPhone 17", ["129,800円"]],
  ["iPhone Air", ["159,800円"]],
  ["iPhone 17 Pro", ["179,800円"]],
  ["iPhone 17 Pro Max", ["194,800円"]],
  ["iPhone 16e", ["99,800円"]],
  ["iPhone 16", ["124,800円"]],
  ["iPhone 16 Plus", ["139,800円"]],
  ["iPhone 16 Pro", ["159,800円"]],
  ["iPhone 16 Pro Max", ["189,800円"]],
  ["iPad Air 11インチ（M4）", ["98,800円"]],
  ["iPad Air 13インチ（M4）", ["128,800円"]],
  ["iPad Pro 11インチ（M5）", ["168,800円"]],
  ["iPad Pro 13インチ（M5）", ["218,800円"]],
  ["MacBook Air（13インチ、M5）", ["184,800円"]],
  ["MacBook Air（15インチ、M5）", ["219,800円"]],
  ["MacBook Pro 14インチ（M5）", ["248,800円", "279,800円"]],
  ["MacBook Pro 14インチ（M5 Max）", ["599,800円"]],
  ["MacBook Pro 16インチ（M5 Pro）", ["449,800円"]],
  ["MacBook Pro 16インチ（M5 Max）", ["649,800円"]],
]);

const array = (value) =>
  value == null || value === "" ? [] : Array.isArray(value) ? value : [value];
const unique = (values) =>
  [...new Set(values.filter(Boolean).map((value) => String(value).trim()))];
const dates = (value) =>
  unique(array(value).map((item) => (typeof item === "string" ? item : item?.date)));

function files(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(root, entry.name))
      : entry.isFile() && entry.name.endsWith(".json")
        ? [path.join(root, entry.name)]
        : [],
  );
}

function category(product) {
  const text = `${product.type} ${product.name}`.toLowerCase();
  if (text.includes("iphone")) return "iPhone";
  if (text.includes("ipad")) return "iPad";
  if (text.includes("watch")) return "Apple Watch";
  if (text.includes("airpods")) return "AirPods";
  if (text.includes("airtag")) return "AirTag";
  if (text.includes("homepod")) return "HomePod";
  if (/macbook|imac|mac mini|mac studio|mac pro|macintosh|powerbook|ibook/.test(text)) {
    return "Mac";
  }
  return "";
}

function isPart(product) {
  const name = product.name || "";
  const family = product.type || "";
  if (/software|application/i.test(family)) return true;
  if (/(^|[ (])(left|right)([ )]|$)/i.test(name)) return true;
  if (/\bdock\b|raid card|superdrive|developer transition kit|virtual machine|riser|diagnostic dock|restore dock/i.test(name)) {
    return true;
  }
  if (!/^PowerBook\b/i.test(name) && /\bkeyboard\b/i.test(name)) return true;
  if (!/^airpods\b/i.test(name) && /charging case|smart case|battery case|\bcase\b/i.test(name)) {
    return true;
  }
  return /battery|cable|adapter|charger|replacement|service part|logic board|display unit|demo unit|prototype|unreleased|unknown|module|bracelet|store panel|housing|enclosure|bumper|magic keyboard|keyboard folio|magsafe wallet|wallet with magsafe|ssd (?:kit|upgrade)|storage upgrade|upgrade kit|iphone pocket/i.test(
    `${name} ${family}`,
  );
}

function nameJa(value, family) {
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
    .replace(/\s+（/g, "（")
    .replace(/\s*,\s*/g, "、")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function colors(value) {
  const result = new Map();
  for (const color of array(value)) {
    if (color?.name && !result.has(color.name)) {
      result.set(color.name, {
        name: color.name,
        hex: String(color.hex || "").replace(/^#/, ""),
      });
    }
  }
  return [...result.values()];
}

function variantRank(product) {
  const name = product.name;
  if (product.family === "iPhone") {
    if (/Pro Max/i.test(name)) return 0;
    if (/\bPro\b/i.test(name)) return 10;
    if (/\b(?:Air|Plus)\b/i.test(name)) return 20;
    if (/\bmini\b/i.test(name)) return 40;
    if (/\b(?:SE|\de)\b/i.test(name)) return 50;
    return 30;
  }
  if (product.family === "Mac" && /MacBook/i.test(name)) {
    const size = Number(name.match(/(\d+(?:\.\d+)?)インチ/)?.[1] || 0);
    const chip = /\bMax\b/i.test(name) ? 0 : /\bPro\b/i.test(name) ? 1 : 2;
    return (20 - size) * 10 + chip;
  }
  if (product.family === "iPad") {
    const line = /\bPro\b/i.test(name) ? 0 : /\bAir\b/i.test(name) ? 10 : /\bmini\b/i.test(name) ? 30 : 20;
    const size = Number(name.match(/(\d+(?:\.\d+)?)インチ/)?.[1] || 0);
    return line + (20 - size) / 100;
  }
  if (product.family === "Apple Watch") {
    return /Ultra/i.test(name) ? 0 : /Series/i.test(name) ? 10 : /SE/i.test(name) ? 20 : 30;
  }
  return 0;
}

function productSort(a, b) {
  return (
    (b.released || "").localeCompare(a.released || "") ||
    variantRank(a) - variantRank(b) ||
    a.name.localeCompare(b.name, "ja", { numeric: true })
  );
}

function priceValues(product) {
  const raw = [
    ...array(product.price),
    ...array(product.prices),
    ...array(product.info).flatMap((item) => array(item?.Price ?? item?.price)),
  ];
  return unique(
    raw.flatMap((value) => {
      if (typeof value === "number") return [`${value.toLocaleString("ja-JP")}円`];
      if (typeof value === "string") return [value];
      if (value && typeof value === "object") {
        return array(value.JPY ?? value.jp ?? value.Japan ?? value.japan);
      }
      return [];
    }),
  );
}

function canonical(value) {
  return String(value)
    .replace(/[（）()、,\s\u00a0‑–—-]/g, "")
    .replace(/モデル$/u, "")
    .toLowerCase();
}

async function scrapeAppleMetadata() {
  const result = new Map();
  for (const url of [
    "https://support.apple.com/ja-jp/108044",
    "https://support.apple.com/ja-jp/108043",
  ]) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const $ = load(await response.text());
      $("h2").each((_, heading) => {
        const name = $(heading).text().replace(/\s+/g, " ").trim();
        if (!/^(?:iPhone|iPad)/.test(name) || /モデル番号を調べる/.test(name)) return;
        const text = $(heading)
          .nextUntil("h2")
          .toArray()
          .map((node) => $(node).text())
          .join(" ")
          .replace(/\s+/g, " ");
        const capacityText = text.match(/容量[：:]\s*(.*?)(?:カラー|モデル番号|特徴)[：:]?/u)?.[1] || "";
        const storage = unique(
          [...capacityText.matchAll(/(\d+(?:\.\d+)?)\s*(GB|TB)/gi)].map(
            (match) => `${match[1]}${match[2].toUpperCase()}`,
          ),
        );
        const pairs = [...text.matchAll(/(A\d{4})[（(]([^）)]+)[）)]/g)].map(
          (match) => ({ model: match[1], region: match[2] }),
        );
        let models = pairs
          .filter(({ region }) => region.includes("日本"))
          .map(({ model }) => model);
        if (!models.length && name.startsWith("iPhone")) {
          models = pairs
            .filter(({ region }) => /その他の国や地域/.test(region))
            .map(({ model }) => model);
        }
        if (name.startsWith("iPad")) {
          models = pairs
            .filter(({ region }) => !/中国本土のみ|中国本土専用/.test(region))
            .map(({ model }) => model);
        }
        if (storage.length || models.length) {
          result.set(canonical(name), {
            storage,
            models: unique(models),
            sourceUrl: url,
          });
        }
      });
    } catch (error) {
      console.warn(`Apple metadata fetch failed: ${url}`, error.message);
    }
  }
  return result;
}

export function buildProducts(root) {
  const grouped = new Map();
  const rows = files(root)
    .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
    .filter(
      (product) =>
        product.name &&
        product.type &&
        wanted.test(`${product.type} ${product.name}`) &&
        !isPart(product),
    );
  for (const product of rows) {
    const family = category(product);
    if (!family) continue;
    const name = nameJa(product.name, family);
    const released = dates(product.released);
    const key = [family, name, (released[0] || "").slice(0, 4)].join("|");
    const item = grouped.get(key) || {
      name,
      family,
      released: released[0] || null,
      discontinued: null,
      prices: [],
      storage: [],
      colors: [],
      chips: [],
      models: [],
      identifiers: [],
    };
    item.discontinued ||= dates(product.discontinued)[0] || null;
    item.prices = unique([...item.prices, ...priceValues(product)]);
    item.storage = unique([
      ...item.storage,
      ...array(product.info).flatMap((info) => array(info?.Storage ?? info?.storage)),
    ]);
    if (officialStorage.has(name)) {
      item.storage = officialStorage.get(name);
      item.storageSource = "Apple公式技術仕様";
    }
    if (officialPrices.has(name)) {
      item.prices = officialPrices.get(name);
      item.priceSource = "Apple Newsroom（日本）";
    }
    item.chips = unique([...item.chips, ...array(product.soc)]);
    item.models = unique([...item.models, ...array(product.model)]);
    item.identifiers = unique([...item.identifiers, ...array(product.identifier)]);
    item.colors = colors([...item.colors, ...colors(product.colors)]);
    grouped.set(key, item);
  }
  return [...grouped.values()].sort(productSort);
}

async function main() {
  const [, , root, output = "data/products.json"] = process.argv;
  if (!root) process.exit(1);
  const products = buildProducts(path.resolve(root));
  const metadata = await scrapeAppleMetadata();
  for (const product of products) {
    const official = metadata.get(canonical(product.name));
    if (!official) continue;
    if (official.storage.length) product.storage = official.storage;
    if (official.models.length) product.models = official.models;
    product.storageSource = "Apple公式サポート";
    product.modelSource = "Apple公式サポート（日本）";
    product.officialSourceUrl = official.sourceUrl;
  }
  products.sort(productSort);
  fs.writeFileSync(
    output,
    `${JSON.stringify({
      updatedAt: new Date().toISOString(),
      sources: [
        { name: "Apple Support（日本）", url: "https://support.apple.com/ja-jp/docs" },
        { name: "Apple Newsroom（日本）", url: "https://www.apple.com/jp/newsroom/" },
        { name: "AppleDB", url: "https://appledb.dev/", license: "MIT" },
      ],
      count: products.length,
      products,
    })}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
