import fs from "node:fs";

const file = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const docs = new Map([
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

function chip(product) {
  const text = `${(product.chips || []).join(" ")} ${product.name || ""}`;
  const match = text.match(/\bM(\d+)\b/i);
  if (!match) return null;
  return { generation: `M${match[1]}`, high: /\bM\d+\s+(?:Pro|Max|Ultra)\b/i.test(text) };
}

function size(product) {
  const direct = String(product.name || "").match(/(13|14|15|16)(?:\.\d+)?\s*(?:インチ|inch)/i);
  if (direct) return Number(direct[1]);
  const ids = (product.identifiers || []).join(" ");
  if (/Mac14,15|Mac15,13|Mac16,13|Mac17,4/.test(ids)) return 15;
  if (/MacBookPro18,[12]|Mac14,(?:6|10)|Mac15,(?:7|9|11)|Mac16,(?:5|7)|Mac17,(?:6|8)/.test(ids)) return 16;
  if (/MacBookPro18,[34]|Mac14,[59]|Mac15,(?:3|6|8|10)|Mac16,(?:1|6|8)|Mac17,(?:2|7|9)/.test(ids)) return 14;
  return 13;
}

const products = [];
const unmatched = [];
let removed = 0;
let updated = 0;

for (const product of data.products || []) {
  if (!/MacBook/i.test(product.name || "")) {
    products.push(product);
    continue;
  }
  const info = chip(product);
  if (!info) {
    removed += 1;
    continue;
  }
  const family = /MacBook Air/i.test(product.name || "") ? "Air" : /MacBook Pro/i.test(product.name || "") ? "Pro" : "";
  const key = family === "Air"
    ? `${family}-${info.generation}-${size(product)}`
    : `${family}-${info.generation}-${size(product)}-${info.high ? "high" : "base"}`;
  const url = docs.get(key);
  if (!url) {
    unmatched.push(`${product.name} [${key}]`);
    products.push(product);
    continue;
  }
  product.documentationUrl = url;
  product.documentationDirect = true;
  product.documentationSource = "Apple公式技術仕様";
  products.push(product);
  updated += 1;
}

const result = {
  updatedAt: new Date().toISOString(),
  sources: data.sources || [],
  count: products.length,
  macbookDocsUnmatched: unmatched,
  products,
};
fs.writeFileSync(file, `${JSON.stringify(result)}\n`);
console.log(`MacBook links updated: ${updated}; pre-M-chip records removed: ${removed}; unmatched: ${unmatched.length}.`);
