import fs from "node:fs";

const input = process.argv[2] || "data/products.json";
const output = process.argv[3] || "data/target-products-report.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));
const targets = new Set(["iPhone", "Mac", "Apple Watch", "AirPods"]);
const products = (data.products || [])
  .filter((product) => targets.has(product.family))
  .map((product) => ({
    name: product.name,
    family: product.family,
    released: product.released,
    discontinued: product.discontinued,
    prices: product.prices || [],
    chips: product.chips || [],
    models: product.models || [],
    identifiers: product.identifiers || [],
    colors: (product.colors || []).map((color) => color.name),
    documentationUrl: product.documentationUrl || "",
    documentationDirect: Boolean(product.documentationDirect),
  }));
fs.writeFileSync(output, `${JSON.stringify(products, null, 2)}\n`);
console.log(`Wrote ${products.length} target product records.`);
