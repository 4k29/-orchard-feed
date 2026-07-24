import fs from "node:fs";

const input = process.argv[2] || "data/products.json";
const output = process.argv[3] || "data/target-products-report.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));
const rows = data.products || [];

const isMacBook = (product) => /MacBook/i.test(product.name || "");
const isDesktopMac = (product) => product.family === "Mac" && /^(?:iMac|Mac mini|Mac Studio|Mac Pro)\b/i.test(product.name || "");
const isTarget = (product) =>
  product.family === "iPhone" ||
  isMacBook(product) ||
  isDesktopMac(product) ||
  product.family === "Apple Watch" ||
  product.family === "AirPods" ||
  product.family === "AirTag";
const compact = (product) => ({
  name: product.name,
  family: product.family,
  released: product.released,
  prices: product.prices || [],
  priceHistory: Boolean(product.priceHistory),
  chips: product.chips || [],
  models: product.models || [],
  identifiers: product.identifiers || [],
  colors: product.colors || [],
  documentationUrl: product.documentationUrl || "",
  documentationDirect: Boolean(product.documentationDirect),
});

const targets = rows.filter(isTarget);
const keyCounts = new Map();
for (const product of targets) {
  const key = `${product.name}|${product.released || ""}`;
  keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
}
const duplicateKeys = [...keyCounts].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
const missingDocs = targets.filter((product) => !product.documentationDirect || !product.documentationUrl).map(compact);
const missingPrices = targets.filter((product) => !(product.prices || []).length).map(compact);
const missingPriceDates = rows.filter((product) => {
  const prices = product.prices || [];
  return prices.length > 1 && prices.slice(1).some((price) => !/\(\d{2}\/\d{1,2}\/\d{1,2}\)$/.test(String(price)));
}).map(compact);
const airPods = targets.filter((product) => product.family === "AirPods").map(compact);
const watches = targets.filter((product) => product.family === "Apple Watch").map(compact);
const macs = targets.filter((product) => isMacBook(product) || isDesktopMac(product)).map(compact);

const report = {
  updatedAt: data.updatedAt,
  metadataWarnings: data.metadataWarnings || [],
  summary: {
    products: rows.length,
    targets: targets.length,
    missingDocs: missingDocs.length,
    missingPrices: missingPrices.length,
    missingPriceDates: missingPriceDates.length,
    duplicateKeys: duplicateKeys.length,
    airPods: airPods.length,
    watches: watches.length,
    macs: macs.length,
  },
  duplicateKeys,
  missingDocs,
  missingPrices,
  missingPriceDates,
  airPods,
};

fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Validated ${targets.length} target product records.`);
