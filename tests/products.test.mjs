import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildProducts } from "../scripts/products.mjs";

test("buildProducts combines regional variants without losing metadata", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orchard-products-"));
  fs.writeFileSync(path.join(root, "one.json"), JSON.stringify({
    name: "Example Phone",
    type: "iPhone",
    identifier: "Phone1,1",
    model: "A1000",
    soc: "A1",
    released: "2020-01-02",
    colors: [{ name: "Blue", hex: "112233" }],
    info: [{ type: "Memory", Storage: ["64GB", "128GB"] }],
  }));
  fs.writeFileSync(path.join(root, "two.json"), JSON.stringify({
    name: "Example Phone",
    type: "iPhone",
    identifier: "Phone1,2",
    model: ["A1001"],
    soc: "A1",
    released: "2020-01-02",
    colors: [{ name: "Red", hex: "AA0000" }],
  }));

  const products = buildProducts(root);
  assert.equal(products.length, 1);
  assert.deepEqual(products[0].identifiers, ["Phone1,1", "Phone1,2"]);
  assert.deepEqual(products[0].models, ["A1000", "A1001"]);
  assert.deepEqual(products[0].storage, ["64GB", "128GB"]);
  assert.deepEqual(products[0].colors.map((color) => color.name), ["Blue", "Red"]);
});

test("buildProducts excludes operating systems and simulator records", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orchard-products-"));
  fs.writeFileSync(path.join(root, "software.json"), JSON.stringify({ name: "Example OS", type: "Software" }));
  fs.writeFileSync(path.join(root, "mac.json"), JSON.stringify({ name: "Example Mac", type: "Mac mini" }));
  assert.deepEqual(buildProducts(root).map((product) => product.name), ["Example Mac"]);
});
