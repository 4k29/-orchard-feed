import fs from "node:fs";
import { load } from "cheerio";

const input = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));

const clean = (value) =>
  String(value || "")
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function hasBuiltInDisplay(product) {
  const name = String(product.name || "");
  return (
    product.family === "iPhone" ||
    product.family === "iPad" ||
    product.family === "Apple Watch" ||
    (product.family === "Mac" && /^(?:MacBook|iMac)\b/i.test(name))
  );
}

function displaySection($) {
  let heading = null;
  $("h1, h2, h3, h4").each((_, candidate) => {
    if (heading) return;
    if (clean($(candidate).text()).replace(/[：:]/g, "") === "ディスプレイ") heading = candidate;
  });
  if (heading) {
    const tag = String(heading.tagName || "h2").toLowerCase();
    const stops = tag === "h1" ? "h1" : tag === "h2" ? "h1, h2" : tag === "h3" ? "h1, h2, h3" : "h1, h2, h3, h4";
    return clean(`${$(heading).text()} ${$(heading).nextUntil(stops).text()}`);
  }
  const body = clean($.root().text());
  const index = body.indexOf("ディスプレイ");
  return index < 0 ? "" : body.slice(index, index + 3000);
}

function panelFrom(value) {
  const text = clean(value);
  if (/タンデムOLED/i.test(text)) return "タンデムOLED";
  if (/ミニLEDバックライト|mini-?LED/i.test(text)) return "mini-LEDバックライトLCD";
  if (/OLED/i.test(text)) return "OLED";
  if (/IPS/i.test(text)) return "IPS LCD";
  return "";
}

function displayType(section, fallback) {
  const text = clean(section);
  const watch = text.match(/(LTPO\d?(?:広視野角)?OLED(?:常時表示)?Retina|LTPO OLED(?:常時表示)?Retina|OLED(?:常時表示)?Retina)ディスプレイ/i);
  let name = watch?.[1] || "";
  if (!name) {
    const known = [
      "Ultra Retina XDR",
      "Liquid Retina XDR",
      "Super Retina XDR",
      "Super Retina HD",
      "Liquid Retina HD",
      "Liquid Retina",
      "Retina HD",
    ];
    name = known.find((candidate) => text.includes(`${candidate}ディスプレイ`)) || "";
  }
  if (!name) {
    const retina = text.match(/(\d+(?:\.\d+)?K)\s*Retinaディスプレイ/i);
    if (retina) name = `Retina ${retina[1]}`;
    else if (text.includes("Retinaディスプレイ")) name = "Retina";
  }
  if (!name) return fallback || "";

  const panel = panelFrom(text) || clean(fallback).match(/（([^）]+)）/)?.[1] || "";
  if (panel && !name.toLowerCase().includes(panel.toLowerCase().replace("バックライトLCD", ""))) {
    return `${name}（${panel}）`;
  }
  return name;
}

function maximumBrightness(section) {
  const text = clean(section);
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*)\s*(?:ニト|nits?|cd\s*\/\s*m(?:²|2))/gi)]
    .map((match) => ({
      value: Number(match[1].replace(/,/g, "")),
      index: match.index || 0,
    }))
    .filter((item) => Number.isFinite(item.value));
  if (!matches.length) return "";
  const peak = matches.sort((a, b) => b.value - a.value)[0];
  const context = text.slice(Math.max(0, peak.index - 100), peak.index + 120);
  const qualifier = /屋外/.test(context) ? "（屋外）" : /HDR/i.test(context) ? "（HDR）" : "";
  return `${peak.value.toLocaleString("ja-JP")} nits${qualifier}`;
}

function refreshRate(section) {
  const text = clean(section);
  const range = text.match(/(\d{1,3})\s*Hz\s*[〜～-]\s*(\d{1,3})\s*Hz/i);
  if (range) {
    return `${range[1]}〜${range[2]}Hz${/ProMotion/i.test(text) ? "（ProMotion）" : "（可変）"}`;
  }
  const maximum = text.match(/最大\s*(\d{1,3})\s*Hz/i);
  if (maximum) return `最大${maximum[1]}Hz${/ProMotion/i.test(text) ? "（ProMotion）" : ""}`;
  const fixed = text.match(/(\d{1,3})\s*Hz(?:の)?(?:固定)?リフレッシュレート/i);
  return fixed ? `${fixed[1]}Hz` : "";
}

function refreshRateValue(value) {
  const numbers = String(value || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 0;
}

const screenProducts = (data.products || []).filter(hasBuiltInDisplay);
for (const product of screenProducts) product.hasDisplay = true;

const byUrl = new Map();
for (const product of screenProducts) {
  const url = String(product.documentationUrl || "");
  if (!product.documentationDirect || !/^https:\/\/support\.apple\.com\//.test(url)) continue;
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(product);
}

const entries = [...byUrl.entries()];
let cursor = 0;
let enriched = 0;

async function worker() {
  while (cursor < entries.length) {
    const [url, products] = entries[cursor++];
    try {
      const response = await fetch(url, {
        headers: {
          "accept-language": "ja-JP,ja;q=0.9",
          "user-agent": "Orchard product metadata sync",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const $ = load(await response.text());
      const section = displaySection($);
      if (!section) continue;
      const brightness = maximumBrightness(section);
      const rate = refreshRate(section);
      for (const product of products) {
        product.displayType = displayType(section, product.displayType);
        if (brightness) product.maxBrightness = brightness;
        if (refreshRateValue(rate) > refreshRateValue(product.displayRefreshRate)) {
          product.displayRefreshRate = rate;
        }
        product.displaySource = "Apple公式技術仕様";
        enriched += 1;
      }
    } catch (error) {
      console.warn(`Display metadata fetch failed: ${url}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(8, entries.length || 1) }, () => worker()));

for (const product of screenProducts) {
  product.displayType ||= "ディスプレイ";
  product.maxBrightness ||= "";
  product.displayRefreshRate ||= "";
}

data.updatedAt = new Date().toISOString();
fs.writeFileSync(input, `${JSON.stringify(data)}\n`);
console.log(
  `Enriched ${enriched}/${screenProducts.length} display products from ${entries.length} Apple specification pages.`,
);
