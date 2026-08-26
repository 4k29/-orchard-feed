import test from "node:test";
import assert from "node:assert/strict";
import { configurationFor } from "../scripts/apply-mac-configurations.mjs";

const product = (name, chip) => ({ name, family: "Mac", chips: chip ? [chip] : [] });

test("Mac Studio configurations are chip-specific", () => {
  assert.deepEqual(configurationFor(product("Mac Studio（M5 Max）", "M5 Max")), {
    memory: ["36GB", "48GB", "64GB", "128GB"],
    storage: ["512GB", "1TB", "2TB", "4TB", "8TB"],
  });
  assert.deepEqual(configurationFor(product("Mac Studio（M5 Ultra）", "M5 Ultra")), {
    memory: ["96GB", "256GB", "512GB"],
    storage: ["1TB", "2TB", "4TB", "8TB", "16TB"],
  });
});

test("MacBook configurations cover current and split Max variants", () => {
  assert.deepEqual(configurationFor(product("MacBook Air（13インチ、M5）", "M5")), {
    memory: ["16GB", "24GB", "32GB"],
    storage: ["512GB", "1TB", "2TB", "4TB"],
  });
  assert.deepEqual(configurationFor(product("MacBook Pro（14インチ、14-core M3 Max、Nov 2023）", "M3 Max")).memory, ["36GB", "96GB"]);
});

test("MacBook Neo has its fixed memory and storage choices", () => {
  assert.deepEqual(configurationFor(product("MacBook Neo", "A18 Pro")), {
    memory: ["8GB"],
    storage: ["256GB", "512GB"],
  });
});
