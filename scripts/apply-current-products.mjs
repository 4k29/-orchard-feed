import fs from "node:fs";

const path = process.argv[2] || "data/products.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));
const prices = new Map([
  ["Mac mini（M6）", [149800, "https://www.apple.com/jp/newsroom/2026/08/apple-unveils-a-more-powerful-mac-mini-featuring-the-all-new-m6-and-m5-pro/"]],
  ["Mac mini（M5 Pro）", [299800, "https://www.apple.com/jp/newsroom/2026/08/apple-unveils-a-more-powerful-mac-mini-featuring-the-all-new-m6-and-m5-pro/"]],
  ["Mac Studio（M5 Max）", [419800, "https://www.apple.com/jp/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/"]],
  ["Mac Studio（M5 Ultra）", [949800, "https://www.apple.com/jp/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/"]],
  ["iPhone 18 Pro", [219800, "https://www.apple.com/jp/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/"]],
  ["iPhone 18 Pro Max", [239800, "https://www.apple.com/jp/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/"]],
  ["iPhone Duo", [364800, "https://www.apple.com/jp/newsroom/2026/09/apple-unveils-iphone-duo/"]],
  ["Apple Watch Series 12", [71800, "https://www.apple.com/jp/newsroom/2026/09/introducing-apple-watch-series-12-with-the-all-new-health-sensing-system/"]],
  ["Apple Watch Ultra 4", [142800, "https://www.apple.com/jp/newsroom/2026/09/apple-unveils-apple-watch-ultra-4/"]],
]);
const specifications = new Map([
  ["iPhone 18 Pro", ["https://www.apple.com/jp/iphone-18-pro/specs/", ["256GB", "512GB", "1TB", "2TB"], "Super Retina XDR OLED", "最大3,000ニト（屋外）", "最大120Hz（ProMotion）"]],
  ["iPhone 18 Pro Max", ["https://www.apple.com/jp/iphone-18-pro/specs/", ["256GB", "512GB", "1TB", "2TB"], "Super Retina XDR OLED", "最大3,000ニト（屋外）", "最大120Hz（ProMotion）"]],
  ["iPhone Duo", ["https://www.apple.com/jp/iphone-duo/specs/", ["256GB", "512GB", "1TB", "2TB"], "Super Retina XDR OLED（内側・外側）", "最大3,000ニト（屋外）", "最大120Hz（ProMotion）"]],
  ["Apple Watch Series 12", ["https://www.apple.com/jp/apple-watch-series-12/specs/", ["64GB"], "LTPO3広視野角OLED常時表示Retina", "ピーク2,000ニト", "1Hz"]],
  ["Apple Watch Ultra 4", ["https://www.apple.com/jp/apple-watch-ultra-4/specs/", ["64GB"], "LTPO3広視野角OLED常時表示Retina", "ピーク3,000ニト", "1Hz"]],
]);

for (const product of data.products) {
  const price = prices.get(product.name);
  if (price) {
    product.prices = [`${price[0].toLocaleString("ja-JP")}円～`];
    product.priceHistory = false;
    product.priceSource = "Apple Newsroom（日本）";
    product.priceSourceUrl = price[1];
  }
  const specs = specifications.get(product.name);
  if (specs) {
    product.documentationUrl = specs[0];
    product.documentationDirect = true;
    product.documentationSource = "Apple公式技術仕様";
    product.storage = specs[1];
    product.storageSource = "Apple公式技術仕様";
    product.displayType = specs[2];
    product.maxBrightness = specs[3];
    product.displayRefreshRate = specs[4];
    product.displaySource = "Apple公式技術仕様";
  }
  if (product.name === "iPhone Duo") product.initialOS = "iOS 27.1";
}

const airPods = [
  ["AirPods 5", 23800],
  ["AirPods 5（ワイヤレス充電ケース）", 27800],
];
for (const [name, price] of airPods) {
  if (data.products.some((product) => product.name === name)) continue;
  data.products.push({
    name, family: "AirPods", released: "2026-09-18", discontinued: null,
    prices: [`${price.toLocaleString("ja-JP")}円～`], priceHistory: false,
    priceSource: "Apple Newsroom（日本）",
    priceSourceUrl: "https://www.apple.com/jp/newsroom/2026/09/apple-introduces-airpods-5-with-best-in-class-open-ear-active-noise-cancellation/",
    storage: [], colors: [{ name: "White", hex: "FFFFFF" }], chips: ["H2"],
    models: [], identifiers: [], initialOS: "",
    documentationUrl: "https://www.apple.com/jp/airpods-5/specs/",
    documentationDirect: true, documentationSource: "Apple公式技術仕様",
  });
}

data.count = data.products.length;
fs.writeFileSync(path, `${JSON.stringify(data)}\n`);
console.log(`Verified current Apple product metadata for ${prices.size} products and AirPods 5.`);
