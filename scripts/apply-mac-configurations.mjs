import fs from "node:fs";
import { fileURLToPath } from "node:url";

const input = process.argv[2] || "data/products.json";

const values = (...items) => items.map(String);

function chipName(product) {
  const text = `${(product.chips || []).join(" ")} ${product.name || ""}`;
  return text.match(/\bM\d+(?:\s+(?:Pro|Max|Ultra))?\b/i)?.[0].replace(/\s+/g, " ") || "";
}

function generation(chip) {
  return Number(chip.match(/^M(\d+)/i)?.[1] || 0);
}

function memoryOptions(product, chip) {
  const name = String(product.name || "");
  if (/MacBook Neo/i.test(name)) return values("8GB");

  const gen = generation(chip);
  if (/\bUltra$/i.test(chip)) {
    if (gen === 1) return values("64GB", "128GB");
    if (gen === 2) return values("64GB", "128GB", "192GB");
    if (gen === 3 || gen === 5) return values("96GB", "256GB", "512GB");
    return [];
  }
  if (/\bMax$/i.test(chip)) {
    if (gen === 1) return values("32GB", "64GB");
    if (gen === 2) return values("32GB", "64GB", "96GB");
    if (gen === 3 && /14-core/i.test(name)) return values("36GB", "96GB");
    if (gen === 3 && /16-core/i.test(name)) return values("48GB", "64GB", "128GB");
    if (gen === 3) return values("36GB", "48GB", "64GB", "96GB", "128GB");
    if (gen === 4 || gen === 5) return values("36GB", "48GB", "64GB", "128GB");
    return [];
  }
  if (/\bPro$/i.test(chip)) {
    if (gen <= 2) return values("16GB", "32GB");
    if (gen === 3) return values("18GB", "36GB");
    if (gen === 4 || gen === 5) return values("24GB", "48GB", "64GB");
    return [];
  }
  if (gen <= 1) return values("8GB", "16GB");
  if (gen <= 3) return values("8GB", "16GB", "24GB");
  if (gen <= 6) return values("16GB", "24GB", "32GB");
  return [];
}

function storageOptions(product, chip) {
  const name = String(product.name || "");
  const gen = generation(chip);
  const tier = chip.match(/\b(Pro|Max|Ultra)$/i)?.[1]?.toLowerCase() || "base";

  if (/MacBook Neo/i.test(name)) return values("256GB", "512GB");
  if (/^MacBook Air/i.test(name)) {
    return gen >= 5
      ? values("512GB", "1TB", "2TB", "4TB")
      : values("256GB", "512GB", "1TB", "2TB");
  }
  if (/^MacBook Pro/i.test(name)) {
    if (/13インチ/i.test(name)) return values("256GB", "512GB", "1TB", "2TB");
    if (tier === "max") {
      return gen >= 3
        ? values("1TB", "2TB", "4TB", "8TB")
        : values("512GB", "1TB", "2TB", "4TB", "8TB");
    }
    if (tier === "pro") {
      if (gen >= 5) return values("1TB", "2TB", "4TB");
      return gen >= 3
        ? values("512GB", "1TB", "2TB", "4TB")
        : values("512GB", "1TB", "2TB", "4TB", "8TB");
    }
    return gen >= 5
      ? values("512GB", "1TB", "2TB", "4TB")
      : values("512GB", "1TB", "2TB");
  }
  if (/^iMac\b/i.test(name)) return values("256GB", "512GB", "1TB", "2TB");
  if (/^Mac mini\b/i.test(name)) {
    return tier === "pro"
      ? values("512GB", "1TB", "2TB", "4TB", "8TB")
      : values("256GB", "512GB", "1TB", "2TB");
  }
  if (/^Mac Studio\b/i.test(name)) {
    if (tier === "ultra") {
      return gen >= 3
        ? values("1TB", "2TB", "4TB", "8TB", "16TB")
        : values("1TB", "2TB", "4TB", "8TB");
    }
    return values("512GB", "1TB", "2TB", "4TB", "8TB");
  }
  if (/^Mac Pro\b/i.test(name)) return values("1TB", "2TB", "4TB", "8TB");
  return [];
}

export function configurationFor(product) {
  const name = String(product.name || "");
  if (/MacBook Neo/i.test(name)) {
    return { memory: memoryOptions(product, ""), storage: storageOptions(product, "") };
  }
  const chip = chipName(product);
  if (!chip) return { memory: [], storage: [] };
  return {
    memory: memoryOptions(product, chip),
    storage: storageOptions(product, chip),
  };
}

function isTargetMac(product) {
  return product.family === "Mac" && /^(?:MacBook|iMac|Mac mini|Mac Studio|Mac Pro)\b/i.test(product.name || "");
}

export function applyMacConfigurations(data) {
  const missing = [];
  let updated = 0;
  for (const product of data.products || []) {
    if (!isTargetMac(product)) continue;
    const configuration = configurationFor(product);
    if (!configuration.memory.length || !configuration.storage.length) {
      missing.push(product.name);
      continue;
    }
    product.memory = configuration.memory;
    product.storage = configuration.storage;
    product.memorySource = "Apple公式技術仕様";
    product.storageSource = "Apple公式技術仕様";

    if (/^Mac Studio（M5 (?:Max|Ultra)）$/i.test(product.name || "")) {
      product.documentationUrl = "https://www.apple.com/jp/mac-studio/specs/";
      product.documentationDirect = true;
    }
    if (/^Mac mini（(?:M6|M5 Pro)）$/i.test(product.name || "")) {
      product.documentationUrl = "https://www.apple.com/jp/mac-mini/specs/";
      product.documentationDirect = true;
    }
    updated += 1;
  }
  if (missing.length) throw new Error(`Mac configuration mapping missing: ${missing.join(" / ")}`);
  const productsByName = new Map((data.products || []).map((product) => [product.name, product]));
  data.metadataWarnings = (data.metadataWarnings || []).filter((warning) => {
    const name = String(warning).replace(/^Mac(?:Book)? documentation:\s*/, "");
    const product = productsByName.get(name);
    return !product?.documentationDirect || !product?.documentationUrl;
  });
  return updated;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(fs.readFileSync(input, "utf8"));
  const updated = applyMacConfigurations(data);
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(input, `${JSON.stringify(data)}\n`);
  console.log(`Applied memory and storage options to ${updated} Mac products.`);
}
