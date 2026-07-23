import fs from "node:fs";

const file = process.argv[2] || "site/products.js";
let source = fs.readFileSync(file, "utf8");

const facts = `  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
    fact(product.priceHistory ? "価格履歴" : "発売時価格", product.prices.join(" → ")),
  ];
  card.querySelector(".product-facts").append(...facts);`;

if (!source.includes(facts)) {
  const factsPattern = /  const facts = \[[\s\S]*?  card\.querySelector\("\.product-facts"\)\.append\(\.\.\.facts\);/;
  if (!factsPattern.test(source)) throw new Error("Product fact layout block was not found.");
  source = source.replace(factsPattern, facts);
}

const details = `  const details = card.querySelector(".product-details");
  const detailFacts = [];
  if (!["AirPods", "AirTag"].includes(product.category)) {
    detailFacts.push(fact("初期OS", product.initialOS));
  }
  detailFacts.push(
    fact("販売終了", date(product.discontinued)),
    fact("日本向けモデル番号", product.models.join(", ")),
    fact("識別子", product.identifiers.join(", ")),
  );
  details.querySelector("dl").append(...detailFacts);`;

if (!source.includes(details)) {
  const detailsPattern = /  const details = card\.querySelector\("\.product-details"\);\n(?:  const detailFacts = \[\];\n(?:[\s\S]*?)  details\.querySelector\("dl"\)\.append\(\.\.\.detailFacts\);|  details\.querySelector\("dl"\)\.append\([\s\S]*?\n  \);)/;
  if (!detailsPattern.test(source)) throw new Error("Product details block was not found.");
  source = source.replace(detailsPattern, details);
}

source = source
  .replace(
    'if (mode === "size") return values.sort((a, b) => Number(b) - Number(a));',
    'if (mode === "size") return values.sort((a, b) => parseFloat(b) - parseFloat(a));',
  )
  .replace('fetch(U, { cache: "no-store" })', "fetch(U)");

fs.writeFileSync(file, source);
console.log("Optimized product rendering and enabled browser caching.");
