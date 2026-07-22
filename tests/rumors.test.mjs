import assert from "node:assert/strict";
import test from "node:test";
import { collectRumorCandidates, groupRumors } from "../scripts/rumors.mjs";

const now = new Date("2026-07-22T00:00:00Z");

test("weekly candidates include only recent rumor-source articles", () => {
  const articles = [
    { id: "new", category: "rumors", publishedAt: "2026-07-21T00:00:00Z" },
    { id: "official", category: "official", publishedAt: "2026-07-21T00:00:00Z" },
    { id: "old", category: "rumors", publishedAt: "2026-07-01T00:00:00Z" },
  ];
  assert.deepEqual(collectRumorCandidates(articles, { now }).map((item) => item.id), ["new"]);
});

test("rumors are grouped into matching Apple product families", () => {
  const groups = groupRumors([
    {
      id: "phone",
      titleJa: "iPhone 18 Proの新しいカメラの噂",
      titleOriginal: "iPhone 18 Pro camera rumor",
      summaryJa: "",
      tags: [],
    },
    {
      id: "mac",
      titleJa: "M6搭載MacBook Proの報道",
      titleOriginal: "M6 MacBook Pro report",
      summaryJa: "",
      tags: [],
    },
  ]);
  assert.deepEqual(groups.find((group) => group.id === "iphone").articles.map((item) => item.id), ["phone"]);
  assert.deepEqual(groups.find((group) => group.id === "mac").articles.map((item) => item.id), ["mac"]);
});
