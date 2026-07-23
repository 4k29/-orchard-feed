import fs from "node:fs";

const input = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(input, "utf8"));
const yen = (value, tax = "税込") => `${Number(value).toLocaleString("ja-JP")}円（${tax}）`;
const setPrices = (product, prices) => {
  product.prices = prices;
  product.priceHistory = prices.length > 1;
  product.priceSource = "Apple Newsroom（日本）・Apple公式価格資料";
};
const setDoc = (product, url) => {
  product.documentationUrl = url;
  product.documentationDirect = true;
  product.documentationSource = "Apple公式技術仕様";
};

const maxColors = {
  "AirPods Max 1": [
    ["Space Gray", "6E6E73"],
    ["Silver", "E3E4E5"],
    ["Sky Blue", "91AAB6"],
    ["Green", "A8C4B8"],
    ["Pink", "E8B4B8"],
  ],
  "AirPods Max 1（USB-C）": [
    ["Blue", "64727D"],
    ["Purple", "DAD8E1"],
    ["Midnight", "22252B"],
    ["Starlight", "EAE1D4"],
    ["Orange", "FFC09E"],
  ],
  "AirPods Max 2": [
    ["Blue", "64727D"],
    ["Purple", "DAD8E1"],
    ["Midnight", "22252B"],
    ["Starlight", "EAE1D4"],
    ["Orange", "FFC09E"],
  ],
};

const products = [];
for (const product of data.products || []) {
  const name = product.name || "";
  if (/Charging Case|Charging Box|Store Display Model/i.test(name)) continue;

  if (/^Apple Watch（第1世代）$/i.test(name)) {
    setDoc(product, "https://support.apple.com/ja-jp/112009");
    setPrices(product, [yen(42800, "税別")]);
  }
  if (name === "Apple Watch Series 3") {
    setPrices(product, [yen(36800, "税別"), yen(19800, "税別"), yen(22800)]);
  }
  if (name === "Apple Watch SE 1") {
    setPrices(product, [yen(29800, "税別"), yen(32800)]);
  }
  if (name === "Apple Watch SE 2") {
    setPrices(product, [yen(37800), yen(34800)]);
  }

  if (/MacBook Pro/i.test(name) && /\bM1 Max\b/i.test(`${name} ${(product.chips || []).join(" ")}`)) {
    product.prices = [];
    product.priceHistory = false;
    delete product.priceSource;
  }

  if (name === "AirPods Pro 3") product.chips = ["H2"];
  if (maxColors[name]) product.colors = maxColors[name].map(([colorName, hex]) => ({ name: colorName, hex }));

  products.push(product);
}

data.products = products;
data.count = products.length;
data.updatedAt = new Date().toISOString();
fs.writeFileSync(input, `${JSON.stringify(data)}\n`);
console.log(`Finalized ${products.length} product records.`);
