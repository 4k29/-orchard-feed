import fs from "node:fs";
import path from "node:path";

const [, , input = "data/products.json"] = process.argv;
const file = path.resolve(input);
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const canonical = (value) =>
  String(value || "")
    .replace(/[（）()、,\s\u00a0‑–—-]/g, "")
    .replace(/モデル$/u, "")
    .toLowerCase();

function normalizeIPadName(value) {
  return String(value || "")
    .replace(/\s*[（(](?:TD-LTE|MM|VZ|1\s*or\s*2\s*TB|1TB)[）)]\s*/gi, " ")
    .replace(/\s*\+\s*3G(?:\s*[（(][^）)]*[）)])?\s*$/gi, "")
    .replace(/\s*[（(]Mid 2012[）)]\s*$/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const prices = new Map();
const add = (history, ...names) => {
  for (const name of names) prices.set(canonical(name), history);
};

// Wi-Fiモデルの最小容量。2014〜2020年は当時のApple表記に合わせて税別。
add(["48,800円（税込）"], "iPad");
add(["44,800円（税込）"], "iPad 2");
add(["42,800円（税込）"], "iPad（第3世代）");
add(["42,800円（税込）", "49,800円（税込）"], "iPad（第4世代）");
add(["28,800円（税込）", "32,800円（税込）"], "iPad mini");
add(["51,800円（税込）"], "iPad Air");
add(["41,900円（税込）"], "iPad mini 2");
add(["53,800円（税別）"], "iPad Air 2");
add(["42,800円（税別）"], "iPad mini 3");
add(["42,800円（税別）"], "iPad mini 4");
add(["94,800円（税別）"], "iPad Pro（12.9インチ）（第1世代）", "iPad Pro 12.9インチ（第1世代）");
add(["66,800円（税別）"], "iPad Pro（9.7インチ）", "iPad Pro 9.7インチ");
add(["37,800円（税別）"], "iPad（第5世代）");
add(["69,800円（税別）"], "iPad Pro（10.5インチ）", "iPad Pro 10.5インチ");
add(["86,800円（税別）"], "iPad Pro（12.9インチ）（第2世代）", "iPad Pro 12.9インチ（第2世代）");
add(["37,800円（税別）"], "iPad（第6世代）");
add(["89,800円（税別）"], "iPad Pro 11インチ（第1世代）");
add(["111,800円（税別）"], "iPad Pro 12.9インチ（第3世代）");
add(["45,800円（税別）"], "iPad mini（第5世代）", "iPad mini 5");
add(["54,800円（税別）"], "iPad Air（第3世代）", "iPad Air 3");
add(["34,800円（税別）"], "iPad（第7世代）");
add(["84,800円（税別）"], "iPad Pro 11インチ（第2世代）");
add(["104,800円（税別）"], "iPad Pro 12.9インチ（第4世代）");
add(["34,800円（税別）"], "iPad（第8世代）");
add(["62,800円（税別）"], "iPad Air（第4世代）", "iPad Air 4");
add(["94,800円（税込）", "117,800円（税込）"], "iPad Pro 11インチ（第3世代）");
add(["129,800円（税込）", "159,800円（税込）"], "iPad Pro 12.9インチ（第5世代）");
add(["39,800円（税込）", "49,800円（税込）"], "iPad（第9世代）");
add(["59,800円（税込）", "72,800円（税込）", "78,800円（税込）"], "iPad mini（第6世代）", "iPad mini 6");
add(["74,800円（税込）", "84,800円（税込）", "92,800円（税込）"], "iPad Air（第5世代）", "iPad Air 5");
add(["68,800円（税込）"], "iPad（第10世代）");
add(["124,800円（税込）"], "iPad Pro 11インチ（第4世代）", "iPad Pro 11インチ（M2）");
add(["172,800円（税込）"], "iPad Pro 12.9インチ（第6世代）", "iPad Pro 12.9インチ（M2）");
add(["98,800円（税込）"], "iPad Air 11インチ（M2）", "iPad Air 11インチ（M3）");
add(["128,800円（税込）"], "iPad Air 13インチ（M2）", "iPad Air 13インチ（M3）");
add(["168,800円（税込）"], "iPad Pro 11インチ（M4）");
add(["218,800円（税込）"], "iPad Pro 13インチ（M4）");
add(["78,800円（税込）", "99,800円（税込）"], "iPad mini（A17 Pro）");
add(["58,800円（税込）", "74,800円（税込）"], "iPad（A16）");
add(["168,800円（税込）", "209,800円（税込）"], "iPad Pro 11インチ（M5）");
add(["218,800円（税込）", "269,800円（税込）"], "iPad Pro 13インチ（M5）");
add(["98,800円（税込）", "129,800円（税込）"], "iPad Air 11インチ（M4）");
add(["128,800円（税込）", "169,800円（税込）"], "iPad Air 13インチ（M4）");

const uniqueStrings = (values) => [...new Set(values.filter(Boolean).map(String))];
const uniqueObjects = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    if (!value) return false;
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

function mergeIPad(base, incoming) {
  const baseDate = base.released || "9999";
  const incomingDate = incoming.released || "9999";
  if (incomingDate < baseDate) {
    base.released = incoming.released;
    if (incoming.initialOS) base.initialOS = incoming.initialOS;
  }
  const discontinued = [base.discontinued, incoming.discontinued].filter(Boolean).sort();
  base.discontinued = discontinued.at(-1) || null;
  for (const key of ["storage", "chips", "models", "identifiers"]) {
    base[key] = uniqueStrings([...(base[key] || []), ...(incoming[key] || [])]);
  }
  base.colors = uniqueObjects([...(base.colors || []), ...(incoming.colors || [])]);
  if (incoming.documentationDirect && !base.documentationDirect) {
    base.documentationUrl = incoming.documentationUrl || incoming.officialSourceUrl || base.documentationUrl;
    base.documentationDirect = true;
  } else if (!base.documentationUrl) {
    base.documentationUrl = incoming.documentationUrl || incoming.officialSourceUrl || "";
  }
  base.officialSourceUrl ||= incoming.officialSourceUrl;
  base.storageSource ||= incoming.storageSource;
  base.modelSource ||= incoming.modelSource;
  return base;
}

const indexed = [];
const grouped = new Map();
const unmatched = [];
let removedAccessories = 0;

(data.products || []).forEach((product, index) => {
  if (product.family !== "iPad") {
    indexed.push({ index, product });
    return;
  }
  if (/nano-sim card for ipad/i.test(product.name || "")) {
    removedAccessories += 1;
    return;
  }
  const name = normalizeIPadName(product.name);
  const key = canonical(name);
  const history = prices.get(key);
  if (!history) unmatched.push(name);
  const existing = grouped.get(key);
  if (existing) {
    existing.product = mergeIPad(existing.product, { ...product, name });
    existing.index = Math.min(existing.index, index);
  } else {
    grouped.set(key, { index, product: { ...product, name } });
  }
});

if (unmatched.length) {
  throw new Error(`発売時価格が未登録のiPadがあります: ${[...new Set(unmatched)].join(" / ")}`);
}

for (const [key, entry] of grouped) {
  entry.product.prices = [...prices.get(key)];
  entry.product.priceHistory = entry.product.prices.length > 1;
  entry.product.priceSource = "Apple Newsroom（日本）・国内価格改定記録";
  indexed.push(entry);
}

indexed.sort((a, b) => a.index - b.index);
data.products = indexed.map(({ product }) => product);
data.count = data.products.length;
data.updatedAt = new Date().toISOString();

fs.writeFileSync(file, `${JSON.stringify(data)}\n`);
console.log(`Applied verified launch prices to ${grouped.size} iPad models; removed ${removedAccessories} accessory record(s).`);
