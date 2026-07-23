import fs from "node:fs";

const file = process.argv[2] || "site/products.js";
let source = fs.readFileSync(file, "utf8");

const candidates = [
`  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
  ];
  if (!["AirPods", "AirTag"].includes(product.category)) facts.push(fact("初期OS", product.initialOS));
  facts.push(fact(product.priceHistory ? "価格履歴" : "発売時価格", product.prices.join(product.priceHistory ? " → " : " / ")));
  card.querySelector(".product-facts").append(...facts);`,
`  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
    fact("初期OS", product.initialOS),
    fact("価格", product.prices.join(" → ")),
  ];
  card.querySelector(".product-facts").append(...facts);`,
`  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
    fact("初期OS", product.initialOS),
    fact(product.priceHistory ? "価格履歴" : "発売時価格", product.prices.join(" → ")),
  ];
  card.querySelector(".product-facts").append(...facts);`,
];

const desired = `  const facts = [
    fact("発売日", date(product.released)),
    fact("チップ", product.chips.join(" / ")),
    fact("ストレージ", product.storage.join(" / ")),
  ];
  if (!["AirPods", "AirTag"].includes(product.category)) facts.push(fact("初期OS", product.initialOS));
  facts.push(fact(product.priceHistory ? "価格履歴" : "発売時価格", product.prices.join(" → ")));
  card.querySelector(".product-facts").append(...facts);`;

if (!source.includes(desired)) {
  const current = candidates.find((candidate) => source.includes(candidate));
  if (!current) throw new Error("Product fact layout block was not found.");
  source = source.replace(current, desired);
}

source = source.replace(
  'if (mode === "size") return values.sort((a, b) => Number(b) - Number(a));',
  'if (mode === "size") return values.sort((a, b) => parseFloat(b) - parseFloat(a));',
);

fs.writeFileSync(file, source);
console.log("Aligned product facts and removed unnecessary OS rows.");
