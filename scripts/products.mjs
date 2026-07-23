import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const wanted =
  /iphone|ipad|apple watch|airpods|airtag|homepod|macbook|imac|mac mini|mac studio|mac pro|macintosh|powerbook|ibook/i;

const iPhoneStorage = new Map([
  ["iPhone", ["4GB", "8GB", "16GB"]],
  ["iPhone 3G", ["8GB", "16GB"]],
  ["iPhone 3GS", ["8GB", "16GB", "32GB"]],
  ["iPhone 4", ["8GB", "16GB", "32GB"]],
  ["iPhone 4s", ["8GB", "16GB", "32GB", "64GB"]],
  ["iPhone 5", ["16GB", "32GB", "64GB"]],
  ["iPhone 5c", ["8GB", "16GB", "32GB"]],
  ["iPhone 5s", ["16GB", "32GB", "64GB"]],
  ["iPhone 6", ["16GB", "32GB", "64GB", "128GB"]],
  ["iPhone 6 Plus", ["16GB", "64GB", "128GB"]],
  ["iPhone 6s", ["16GB", "32GB", "64GB", "128GB"]],
  ["iPhone 6s Plus", ["16GB", "32GB", "64GB", "128GB"]],
  ["iPhone SE（第1世代）", ["16GB", "32GB", "64GB", "128GB"]],
  ["iPhone 7", ["32GB", "128GB", "256GB"]],
  ["iPhone 7 Plus", ["32GB", "128GB", "256GB"]],
  ["iPhone 8", ["64GB", "128GB", "256GB"]],
  ["iPhone 8 Plus", ["64GB", "128GB", "256GB"]],
  ["iPhone X", ["64GB", "256GB"]],
  ["iPhone XR", ["64GB", "128GB", "256GB"]],
  ["iPhone XS", ["64GB", "256GB", "512GB"]],
  ["iPhone XS Max", ["64GB", "256GB", "512GB"]],
  ["iPhone 11", ["64GB", "128GB", "256GB"]],
  ["iPhone 11 Pro", ["64GB", "256GB", "512GB"]],
  ["iPhone 11 Pro Max", ["64GB", "256GB", "512GB"]],
  ["iPhone SE（第2世代）", ["64GB", "128GB", "256GB"]],
  ["iPhone 12 mini", ["64GB", "128GB", "256GB"]],
  ["iPhone 12", ["64GB", "128GB", "256GB"]],
  ["iPhone 12 Pro", ["128GB", "256GB", "512GB"]],
  ["iPhone 12 Pro Max", ["128GB", "256GB", "512GB"]],
  ["iPhone 13 mini", ["128GB", "256GB", "512GB"]],
  ["iPhone 13", ["128GB", "256GB", "512GB"]],
  ["iPhone 13 Pro", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 13 Pro Max", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone SE（第3世代）", ["64GB", "128GB", "256GB"]],
  ["iPhone 14", ["128GB", "256GB", "512GB"]],
  ["iPhone 14 Plus", ["128GB", "256GB", "512GB"]],
  ["iPhone 14 Pro", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 14 Pro Max", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 15", ["128GB", "256GB", "512GB"]],
  ["iPhone 15 Plus", ["128GB", "256GB", "512GB"]],
  ["iPhone 15 Pro", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 15 Pro Max", ["256GB", "512GB", "1TB"]],
  ["iPhone 16e", ["128GB", "256GB", "512GB"]],
  ["iPhone 16", ["128GB", "256GB", "512GB"]],
  ["iPhone 16 Plus", ["128GB", "256GB", "512GB"]],
  ["iPhone 16 Pro", ["128GB", "256GB", "512GB", "1TB"]],
  ["iPhone 16 Pro Max", ["256GB", "512GB", "1TB"]],
  ["iPhone 17e", ["256GB", "512GB"]],
  ["iPhone 17", ["256GB", "512GB"]],
  ["iPhone Air", ["256GB", "512GB", "1TB"]],
  ["iPhone 17 Pro", ["256GB", "512GB", "1TB"]],
  ["iPhone 17 Pro Max", ["256GB", "512GB", "1TB", "2TB"]],
]);

const officialStorage = new Map([
  ...iPhoneStorage,
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
  ["iPhone", ["日本未発売"]],
  ["iPhone 3G", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 3GS", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 4", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 4s", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 5", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 5c", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 5s", ["キャリア販売（契約条件により異なる）"]],
  ["iPhone 6", ["67,800円（税別）"]],
  ["iPhone 6 Plus", ["79,800円（税別）"]],
  ["iPhone 6s", ["86,800円（税別）"]],
  ["iPhone 6s Plus", ["98,800円（税別）"]],
  ["iPhone SE（第1世代）", ["52,800円（税別）"]],
  ["iPhone 7", ["72,800円（税別）"]],
  ["iPhone 7 Plus", ["85,800円（税別）"]],
  ["iPhone 8", ["78,800円（税別）"]],
  ["iPhone 8 Plus", ["89,800円（税別）"]],
  ["iPhone X", ["112,800円（税別）"]],
  ["iPhone XR", ["84,800円（税別）"]],
  ["iPhone XS", ["112,800円（税別）"]],
  ["iPhone XS Max", ["124,800円（税別）"]],
  ["iPhone 11", ["74,800円（税別）"]],
  ["iPhone 11 Pro", ["106,800円（税別）"]],
  ["iPhone 11 Pro Max", ["119,800円（税別）"]],
  ["iPhone SE（第2世代）", ["44,800円（税別）"]],
  ["iPhone 12 mini", ["82,280円"]],
  ["iPhone 12", ["94,380円"]],
  ["iPhone 12 Pro", ["117,480円"]],
  ["iPhone 12 Pro Max", ["129,580円"]],
  ["iPhone 13 mini", ["86,800円", "99,800円"]],
  ["iPhone 13", ["98,800円", "117,800円"]],
  ["iPhone 13 Pro", ["122,800円", "144,800円"]],
  ["iPhone 13 Pro Max", ["134,800円", "159,800円"]],
  ["iPhone SE（第3世代）", ["57,800円", "62,800円"]],
  ["iPhone 14", ["119,800円"]],
  ["iPhone 14 Plus", ["134,800円"]],
  ["iPhone 14 Pro", ["149,800円"]],
  ["iPhone 14 Pro Max", ["164,800円"]],
  ["iPhone 15", ["124,800円"]],
  ["iPhone 15 Plus", ["139,800円"]],
  ["iPhone 15 Pro", ["159,800円"]],
  ["iPhone 15 Pro Max", ["189,800円"]],
  ["iPhone 16e", ["99,800円"]],
  ["iPhone 16", ["124,800円"]],
  ["iPhone 16 Plus", ["139,800円"]],
  ["iPhone 16 Pro", ["159,800円"]],
  ["iPhone 16 Pro Max", ["189,800円"]],
  ["iPhone 17e", ["99,800円"]],
  ["iPhone 17", ["129,800円"]],
  ["iPhone Air", ["159,800円"]],
  ["iPhone 17 Pro", ["179,800円"]],
  ["iPhone 17 Pro Max", ["194,800円"]],
  ["iPad Air 11インチ（M4）", ["98,800円"]],
  ["iPad Air 13インチ（M4）", ["128,800円"]],
  ["iPad Air 11インチ（M3）", ["98,800円"]],
  ["iPad Air 13インチ（M3）", ["128,800円"]],
  ["iPad（A16）", ["58,800円"]],
  ["iPad mini（A17 Pro）", ["78,800円"]],
  ["iPad Pro 11インチ（M5）", ["168,800円"]],
  ["iPad Pro 13インチ（M5）", ["218,800円"]],
  ["Apple Watch Ultra 3", ["129,800円"]],
  ["Apple Watch Series 11", ["64,800円"]],
  ["Apple Watch SE 3", ["37,800円"]],
  ["Apple Watch Series 10", ["59,800円"]],
  ["AirPods Max 2", ["89,800円"]],
  ["AirPods Max with USB-C", ["84,800円"]],
  ["AirTag（第2世代）", ["1個 4,980円 / 4個 16,980円"]],
  ["HomePod（第2世代）", ["44,800円"]],
  ["MacBook Air（13インチ、M5）", ["184,800円"]],
  ["MacBook Air（15インチ、M5）", ["219,800円"]],
  ["MacBook Pro 14インチ（M5）", ["248,800円", "279,800円"]],
  ["MacBook Pro 14インチ（M5 Max）", ["599,800円"]],
  ["MacBook Pro 16インチ（M5 Pro）", ["449,800円"]],
  ["MacBook Pro 16インチ（M5 Max）", ["649,800円"]],
]);

const japanIPhoneModels = new Map([
  ["iPhone", []],
  ["iPhone 3G", ["A1241"]],
  ["iPhone 3GS", ["A1303"]],
  ["iPhone 4", ["A1332"]],
  ["iPhone 4s", ["A1387"]],
  ["iPhone 5", ["A1429"]],
  ["iPhone 5c", ["A1456"]],
  ["iPhone 5s", ["A1453"]],
  ["iPhone 6", ["A1586"]],
  ["iPhone 6 Plus", ["A1524"]],
  ["iPhone 6s", ["A1688"]],
  ["iPhone 6s Plus", ["A1687"]],
  ["iPhone SE（第1世代）", ["A1723"]],
  ["iPhone 7", ["A1779"]],
  ["iPhone 7 Plus", ["A1785"]],
  ["iPhone 8", ["A1906"]],
  ["iPhone 8 Plus", ["A1898"]],
  ["iPhone X", ["A1902"]],
  ["iPhone XR", ["A2106"]],
  ["iPhone XS", ["A2098"]],
  ["iPhone XS Max", ["A2102"]],
  ["iPhone 11", ["A2221"]],
  ["iPhone 11 Pro", ["A2215"]],
  ["iPhone 11 Pro Max", ["A2218"]],
  ["iPhone SE（第2世代）", ["A2296"]],
  ["iPhone 12 mini", ["A2398"]],
  ["iPhone 12", ["A2402"]],
  ["iPhone 12 Pro", ["A2406"]],
  ["iPhone 12 Pro Max", ["A2410"]],
  ["iPhone 13 mini", ["A2626"]],
  ["iPhone 13", ["A2631"]],
  ["iPhone 13 Pro", ["A2636"]],
  ["iPhone 13 Pro Max", ["A2641"]],
  ["iPhone SE（第3世代）", ["A2782"]],
  ["iPhone 14", ["A2881"]],
  ["iPhone 14 Plus", ["A2885"]],
  ["iPhone 14 Pro", ["A2889"]],
  ["iPhone 14 Pro Max", ["A2893"]],
  ["iPhone 15", ["A3089"]],
  ["iPhone 15 Plus", ["A3093"]],
  ["iPhone 15 Pro", ["A3101"]],
  ["iPhone 15 Pro Max", ["A3105"]],
  ["iPhone 16e", ["A3409"]],
  ["iPhone 16", ["A3286"]],
  ["iPhone 16 Plus", ["A3289"]],
  ["iPhone 16 Pro", ["A3292"]],
  ["iPhone 16 Pro Max", ["A3295"]],
  ["iPhone 17e", ["A3575"]],
  ["iPhone 17", ["A3519"]],
  ["iPhone Air", ["A3516"]],
  ["iPhone 17 Pro", ["A3522"]],
  ["iPhone 17 Pro Max", ["A3525"]],
]);

const iPhoneInitialOS = new Map([
  ["iPhone", "iPhone OS 1.0"],
  ["iPhone 3G", "iPhone OS 2.0"],
  ["iPhone 3GS", "iPhone OS 3.0"],
  ["iPhone 4", "iOS 4"],
  ["iPhone 4s", "iOS 5"],
  ["iPhone 5", "iOS 6"],
  ["iPhone 5c", "iOS 7"],
  ["iPhone 5s", "iOS 7"],
  ["iPhone 6", "iOS 8"],
  ["iPhone 6 Plus", "iOS 8"],
  ["iPhone 6s", "iOS 9"],
  ["iPhone 6s Plus", "iOS 9"],
  ["iPhone SE（第1世代）", "iOS 9.3"],
  ["iPhone 7", "iOS 10"],
  ["iPhone 7 Plus", "iOS 10"],
  ["iPhone 8", "iOS 11"],
  ["iPhone 8 Plus", "iOS 11"],
  ["iPhone X", "iOS 11"],
  ["iPhone XR", "iOS 12"],
  ["iPhone XS", "iOS 12"],
  ["iPhone XS Max", "iOS 12"],
  ["iPhone 11", "iOS 13"],
  ["iPhone 11 Pro", "iOS 13"],
  ["iPhone 11 Pro Max", "iOS 13"],
  ["iPhone SE（第2世代）", "iOS 13.4"],
  ["iPhone 12 mini", "iOS 14"],
  ["iPhone 12", "iOS 14"],
  ["iPhone 12 Pro", "iOS 14"],
  ["iPhone 12 Pro Max", "iOS 14"],
  ["iPhone 13 mini", "iOS 15"],
  ["iPhone 13", "iOS 15"],
  ["iPhone 13 Pro", "iOS 15"],
  ["iPhone 13 Pro Max", "iOS 15"],
  ["iPhone SE（第3世代）", "iOS 15.4"],
  ["iPhone 14", "iOS 16"],
  ["iPhone 14 Plus", "iOS 16"],
  ["iPhone 14 Pro", "iOS 16"],
  ["iPhone 14 Pro Max", "iOS 16"],
  ["iPhone 15", "iOS 17"],
  ["iPhone 15 Plus", "iOS 17"],
  ["iPhone 15 Pro", "iOS 17"],
  ["iPhone 15 Pro Max", "iOS 17"],
  ["iPhone 16e", "iOS 18"],
  ["iPhone 16", "iOS 18"],
  ["iPhone 16 Plus", "iOS 18"],
  ["iPhone 16 Pro", "iOS 18"],
  ["iPhone 16 Pro Max", "iOS 18"],
  ["iPhone 17e", "iOS 26"],
  ["iPhone 17", "iOS 26"],
  ["iPhone Air", "iOS 26"],
  ["iPhone 17 Pro", "iOS 26"],
  ["iPhone 17 Pro Max", "iOS 26"],
]);

const array = (value) =>
  value == null || value === "" ? [] : Array.isArray(value) ? value : [value];
const unique = (values) =>
  [...new Set(values.filter(Boolean).map((value) => String(value).trim()))];
const dates = (value) =>
  unique(array(value).map((item) => (typeof item === "string" ? item : item?.date)));

function files(root) {
  if (!root || !fs.existsSync(root)) return [];
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
  if (/macbook|imac|mac mini|mac studio|mac pro|macintosh|powerbook|ibook/.test(text)) return "Mac";
  return "";
}

function isPart(product) {
  const name = product.name || "";
  const family = product.type || "";
  const text = `${name} ${family}`;
  if (/software|application/i.test(family)) return true;
  if (/(^|[ (])(left|right)([ )]|$)/i.test(name)) return true;
  if (/\bdock\b|raid card|superdrive|developer transition kit|virtual machine|riser|diagnostic dock|restore dock/i.test(name)) return true;
  if (!/^PowerBook\b/i.test(name) && /\bkeyboard\b/i.test(name)) return true;
  if (!/^airpods\b/i.test(name) && /charging case|smart case|battery case|\bcase\b/i.test(name)) return true;
  if (/iphone/i.test(name) && /leather sleeve|\bsleeve\b|silicone case|clear case|finewoven case|smart battery case/i.test(name)) return true;
  return /battery|cable|adapter|charger|replacement|service part|logic board|display unit|demo unit|prototype|unreleased|unknown|module|bracelet|store panel|housing|enclosure|bumper|magic keyboard|keyboard folio|magsafe wallet|wallet with magsafe|ssd (?:kit|upgrade)|storage upgrade|upgrade kit|iphone pocket/i.test(text);
}

function stripRegionalSuffixes(value) {
  return String(value || "")
    .replace(/\s*[（(](?:GSM|CDMA|Global|China(?: Mainland)?|Japan|Verizon|AT&T|Sprint|T-Mobile|Rest of World|ROW)(?:[^）)]*)[）)]\s*/gi, " ")
    .replace(/\s*[-–—]\s*(?:GSM|CDMA|Global)\s*$/gi, " ");
}

function nameJa(value, family) {
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
    if (/\bMax\b/i.test(name)) return 5;
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
  const yearOrder = (b.released || "").slice(0, 4).localeCompare((a.released || "").slice(0, 4));
  if (yearOrder) return yearOrder;
  if (a.family === "iPhone" && b.family === "iPhone") {
    return (
      variantRank(a) - variantRank(b) ||
      (b.released || "").localeCompare(a.released || "") ||
      a.name.localeCompare(b.name, "ja", { numeric: true })
    );
  }
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
      if (value && typeof value === "object") return array(value.JPY ?? value.jp ?? value.Japan ?? value.japan);
      return [];
    }),
  );
}

function canonical(value) {
  return nameJa(value, String(value).includes("iPad") ? "iPad" : String(value).includes("iPhone") ? "iPhone" : "")
    .replace(/[（）()、,\s\u00a0‑–—-]/g, "")
    .replace(/モデル$/u, "")
    .toLowerCase();
}

function officialValue(map, name) {
  if (map.has(name)) return map.get(name);
  const key = canonical(name);
  for (const [candidate, value] of map) {
    if (canonical(candidate) === key) return value;
  }
  return null;
}

function parseStorage(text) {
  const tokens = [...String(text).matchAll(/(\d+(?:\.\d+)?)\s*(GB|TB)?/gi)];
  const defaultUnit = [...tokens].reverse().find((match) => match[2])?.[2]?.toUpperCase() || "GB";
  return unique(tokens.map((match) => `${match[1]}${(match[2] || defaultUnit).toUpperCase()}`));
}

function appleSearchUrl(name) {
  return `https://support.apple.com/ja-jp/search?query=${encodeURIComponent(`${name} 技術仕様`)}`;
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
        const rawName = $(heading).text().replace(/\s+/g, " ").trim();
        if (!/^(?:iPhone|iPad)/.test(rawName) || /モデル番号を調べる/.test(rawName)) return;
        const family = rawName.startsWith("iPhone") ? "iPhone" : "iPad";
        const name = nameJa(rawName, family);
        const section = $(heading).nextUntil("h2");
        const text = section.toArray().map((node) => $(node).text()).join(" ").replace(/\s+/g, " ");
        const capacityText = text.match(/容量[：:]\s*(.*?)(?:カラー|モデル番号|背面カバー|特徴)[：:]?/u)?.[1] || "";
        const storage = parseStorage(capacityText);
        const pairs = [...text.matchAll(/(A\d{4})[（(]([^）)]+)[）)]/g)].map((match) => ({ model: match[1], region: match[2] }));
        let models = family === "iPhone" ? officialValue(japanIPhoneModels, name) || [] : pairs.filter(({ region }) => !/中国本土のみ|中国本土専用/.test(region)).map(({ model }) => model);
        let documentationUrl = "";
        section.find("a").each((__, anchor) => {
          if (documentationUrl || !/技術仕様/.test($(anchor).text())) return;
          const href = $(anchor).attr("href");
          if (href) documentationUrl = new URL(href, url).href;
        });
        result.set(canonical(name), {
          storage,
          models: unique(models),
          documentationUrl: documentationUrl || appleSearchUrl(name),
          documentationDirect: Boolean(documentationUrl),
          sourceUrl: url,
        });
      });
    } catch (error) {
      console.warn(`Apple metadata fetch failed: ${url}`, error.message);
    }
  }
  return result;
}

function softwareLabel(os) {
  const labels = {
    audioOS: "HomePodソフトウェア",
    "HomePod Software": "HomePodソフトウェア",
    "AirPods Firmware": "AirPodsファームウェア",
  };
  return `${labels[os.osStr] || os.osStr} ${os.version}`.trim();
}

function buildInitialSoftware(root) {
  const result = new Map();
  for (const file of files(root)) {
    let os;
    try {
      os = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (!os.version || os.beta || os.rc || os.internal) continue;
    const ids = unique([
      ...(os.preinstalled === true || os.preinstalledOS === true ? array(os.deviceMap) : []),
      ...(Array.isArray(os.preinstalled) ? os.preinstalled : []),
      ...(Array.isArray(os.preinstalledOS) ? os.preinstalledOS : []),
    ]);
    if (!ids.length) continue;
    const candidate = { label: softwareLabel(os), released: String(os.released || "") };
    for (const id of ids) {
      const current = result.get(id);
      if (!current || (candidate.released && candidate.released < current.released)) result.set(id, candidate);
    }
  }
  return result;
}

function fallbackInitialOS(product) {
  const exact = officialValue(iPhoneInitialOS, product.name);
  if (exact) return exact;
  const date = product.released || "";
  const year = Number(date.slice(0, 4));
  if (product.family === "iPad") {
    if (date >= "2025-09") return "iPadOS 26";
    if (date >= "2024-09") return "iPadOS 18";
    if (date >= "2023-09") return "iPadOS 17";
    if (date >= "2022-09") return "iPadOS 16";
    if (date >= "2021-09") return "iPadOS 15";
    if (date >= "2020-09") return "iPadOS 14";
    if (date >= "2019-09") return "iPadOS 13";
    if (year >= 2018) return "iOS 12";
    if (year >= 2017) return "iOS 11";
    if (year >= 2016) return "iOS 10";
    if (year >= 2015) return "iOS 9";
    if (year >= 2014) return "iOS 8";
    if (year >= 2013) return "iOS 7";
    if (year >= 2012) return "iOS 6";
    if (year >= 2011) return "iOS 5";
    if (year >= 2010) return "iPhone OS 3.2";
  }
  if (product.family === "Apple Watch") {
    if (year >= 2025) return "watchOS 26";
    if (year === 2024) return "watchOS 11";
    if (year === 2023) return "watchOS 10";
    if (year === 2022) return "watchOS 9";
    if (year === 2021) return "watchOS 8";
    if (year === 2020) return "watchOS 7";
    if (year === 2019) return "watchOS 6";
    if (year === 2018) return "watchOS 5";
    if (year === 2017) return "watchOS 4";
    if (year === 2016) return "watchOS 3";
    return "watchOS 1";
  }
  if (product.family === "Mac") {
    if (date >= "2025-09") return "macOS 26";
    if (date >= "2024-09") return "macOS 15";
    if (date >= "2023-09") return "macOS 14";
    if (date >= "2022-09") return "macOS 13";
    if (date >= "2021-10") return "macOS 12";
    if (date >= "2020-11") return "macOS 11";
    if (year === 2019) return "macOS 10.15";
    if (year === 2018) return "macOS 10.14";
    if (year === 2017) return "macOS 10.13";
    if (year === 2016) return "macOS 10.12";
    return "Mac OS / macOS（初期版）";
  }
  if (product.family === "HomePod") return "HomePodソフトウェア（初期版）";
  if (product.family === "AirPods") return "AirPodsファームウェア（初期版）";
  if (product.family === "AirTag") return "AirTagファームウェア（初期版）";
  return "初期ソフトウェア（版不明）";
}

export function buildProducts(root) {
  const grouped = new Map();
  const rows = files(root)
    .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
    .filter((product) => product.name && product.type && wanted.test(`${product.type} ${product.name}`) && !isPart(product));
  for (const product of rows) {
    const family = category(product);
    if (!family) continue;
    const name = nameJa(product.name, family);
    const released = dates(product.released);
    const key = family === "iPhone" ? [family, name].join("|") : [family, name, (released[0] || "").slice(0, 4)].join("|");
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
      initialOS: "",
      documentationUrl: appleSearchUrl(name),
      documentationDirect: false,
    };
    item.released = [item.released, released[0]].filter(Boolean).sort()[0] || null;
    const discontinued = dates(product.discontinued);
    item.discontinued = unique([item.discontinued, ...discontinued]).sort().at(-1) || null;
    item.prices = unique([...item.prices, ...priceValues(product)]);
    item.storage = unique([...item.storage, ...array(product.info).flatMap((info) => array(info?.Storage ?? info?.storage))]);
    const verifiedStorage = officialValue(officialStorage, name);
    if (verifiedStorage) {
      item.storage = verifiedStorage;
      item.storageSource = "Apple公式技術仕様";
    }
    const verifiedPrices = officialValue(officialPrices, name);
    if (verifiedPrices) {
      item.prices = verifiedPrices;
      item.priceSource = family === "iPhone" ? "Apple日本価格資料" : "Apple Newsroom（日本）";
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
  const [, , root, output = "data/products.json", osRoot] = process.argv;
  if (!root) process.exit(1);
  const products = buildProducts(path.resolve(root));
  const metadata = await scrapeAppleMetadata();
  const initialSoftware = buildInitialSoftware(osRoot ? path.resolve(osRoot) : "");
  for (const product of products) {
    const official = metadata.get(canonical(product.name));
    if (official) {
      if (official.storage.length) product.storage = official.storage;
      if (product.family === "iPhone") {
        product.models = officialValue(japanIPhoneModels, product.name) || official.models;
      } else if (official.models.length) {
        product.models = official.models;
      }
      product.storageSource = "Apple公式サポート";
      product.modelSource = "Apple公式サポート（日本）";
      product.officialSourceUrl = official.sourceUrl;
      product.documentationUrl = official.documentationUrl;
      product.documentationDirect = official.documentationDirect;
    } else if (product.family === "iPhone") {
      product.models = officialValue(japanIPhoneModels, product.name) || [];
    }
    const candidates = product.identifiers.map((id) => initialSoftware.get(id)).filter(Boolean).sort((a, b) => a.released.localeCompare(b.released));
    product.initialOS = candidates[0]?.label || fallbackInitialOS(product);
    product.documentationUrl ||= appleSearchUrl(product.name);
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
