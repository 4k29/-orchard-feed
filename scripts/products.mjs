import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const hardwareExclusions = new Set([
  "SDK",
  "Security",
  "Simulator",
  "Software",
  "Virtual Machine",
]);

function listJsonFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return listJsonFiles(target);
    return entry.isFile() && entry.name.endsWith(".json") ? [target] : [];
  });
}

function array(value) {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function dates(value) {
  return unique(array(value).map((item) => typeof item === "string" ? item : item?.date));
}

function storageFromInfo(info) {
  return unique(array(info).flatMap((section) => {
    if (!section || typeof section !== "object") return [];
    return array(section.Storage ?? section.storage);
  }));
}

function colorList(colors) {
  const byName = new Map();
  for (const color of array(colors)) {
    if (!color?.name) continue;
    const hex = String(color.hex || "").replace(/^#/, "");
    if (!byName.has(color.name)) byName.set(color.name, { name: color.name, hex });
  }
  return [...byName.values()];
}

export function buildProducts(deviceRoot) {
  const source = listJsonFiles(deviceRoot)
    .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
    .filter((item) => item.name && item.type && !hardwareExclusions.has(item.type));

  const groups = new Map();
  for (const item of source) {
    const released = dates(item.released);
    const groupKey = [item.type, item.name, released[0] || "unknown"].join("|");
    const current = groups.get(groupKey) || {
      name: item.name,
      family: item.type,
      announced: null,
      released: released[0] || null,
      discontinued: null,
      prices: [],
      storage: [],
      colors: [],
      chips: [],
      models: [],
      identifiers: [],
    };

    current.released ||= released[0] || null;
    current.discontinued ||= dates(item.discontinued)[0] || null;
    current.storage = unique([...current.storage, ...storageFromInfo(item.info)]);
    current.chips = unique([...current.chips, ...array(item.soc)]);
    current.models = unique([...current.models, ...array(item.model)]);
    current.identifiers = unique([...current.identifiers, ...array(item.identifier)]);
    current.colors = colorList([...current.colors, ...colorList(item.colors)]);
    groups.set(groupKey, current);
  }

  return [...groups.values()]
    .sort((a, b) => (b.released || "0000").localeCompare(a.released || "0000") || a.name.localeCompare(b.name));
}

function main() {
  const [, , deviceRoot, output = "data/products.json"] = process.argv;
  if (!deviceRoot) {
    console.error("Usage: node scripts/products.mjs <AppleDB deviceFiles> [output]");
    process.exit(1);
  }

  const products = buildProducts(path.resolve(deviceRoot));
  const result = {
    updatedAt: new Date().toISOString(),
    source: {
      name: "AppleDB",
      url: "https://appledb.dev/",
      license: "MIT",
    },
    note: "発表日・価格・ストレージは、元データに存在する場合のみ掲載しています。",
    count: products.length,
    products,
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result)}\n`);
  console.log(`Wrote ${products.length} products to ${output}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
