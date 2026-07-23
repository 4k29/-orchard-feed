import fs from "node:fs";

const file = process.argv[2] || "site/products.js";
const source = fs.readFileSync(file, "utf8");

const required = [
  'const ALL = "All";',
  'const R = document.querySelector("#product-search-clear");',
  "function chipTiers(product)",
  "function filterValues(product, key)",
  "candidates.flatMap((product) => filterValues(product, definition.key))",
  'detailFacts.push(fact("初期OS", product.initialOS));',
  "fetch(U)",
];

for (const fragment of required) {
  if (!source.includes(fragment)) {
    throw new Error(`Required product-page fragment is missing: ${fragment}`);
  }
}

const macConfig = source.match(/  Mac: \[([\s\S]*?)\n  \],\n  "Apple Watch"/);
if (!macConfig) throw new Error("Mac filter configuration was not found.");
if (macConfig[1].includes('key: "size"')) throw new Error("Mac size filter must remain disabled.");
if (source.includes('cache: "no-store"')) throw new Error("Product data must use browser caching.");

console.log("Product page layout and filters are valid.");
