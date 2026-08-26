import assert from "node:assert/strict";
import test from "node:test";
import { appleDbImageCandidates, beatsType, category } from "../scripts/products.mjs";

test("Beats products use their own family and type", () => {
  const product = {
    name: "Beats Studio Pro",
    identifier: ["BeatsStudioPro1,1", "Device1,8215"],
    type: "Beats Headphones",
  };
  assert.equal(category(product), "Beats");
  assert.equal(beatsType(product), "ヘッドフォン");
  assert.match(appleDbImageCandidates(product)[0], /BeatsStudioPro1%2C1\/0\.avif$/);
});

test("AppleDB image candidates prefer color keys and include a numeric fallback", () => {
  const candidates = appleDbImageCandidates({
    name: "Magic Trackpad (USB-C)",
    colors: [{ name: "Black", key: "Black" }],
  });
  assert.equal(candidates[0], "https://img.appledb.dev/device@preview/Magic%20Trackpad%20(USB-C)/Black.avif");
  assert.ok(candidates.includes("https://img.appledb.dev/device@preview/Magic%20Trackpad%20(USB-C)/0.png"));
});
