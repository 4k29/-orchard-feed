import assert from "node:assert/strict";
import test from "node:test";
import {
  FEEDS,
  mergeArticles,
  parseFeed,
  plainText,
  selectFreshNotifications,
} from "../scripts/feed.mjs";

const feed = {
  id: "test-feed",
  name: "Test Feed",
  category: "official",
  tags: ["公式"],
};

test("Apple Newsroom English and Japan feeds are configured", () => {
  const newsroomFeeds = FEEDS.filter((item) => item.id.startsWith("apple-newsroom"));
  assert.deepEqual(
    newsroomFeeds.map(({ id, url }) => ({ id, url })),
    [
      {
        id: "apple-newsroom",
        url: "https://www.apple.com/newsroom/rss-feed.rss",
      },
      {
        id: "apple-newsroom-jp",
        url: "https://www.apple.com/jp/newsroom/rss-feed.rss",
      },
    ],
  );
});

test("RSS items are normalized", () => {
  const xml = `<?xml version="1.0"?><rss version="2.0"><channel><item>
    <title>Apple &amp; Test</title>
    <link>https://example.com/one</link>
    <guid>post-one</guid>
    <pubDate>Tue, 21 Jul 2026 12:00:00 GMT</pubDate>
    <description><![CDATA[<p>A short <strong>summary</strong>.</p>]]></description>
  </item></channel></rss>`;
  const [article] = parseFeed(xml, feed);
  assert.equal(article.titleOriginal, "Apple & Test");
  assert.equal(article.summaryOriginal, "A short summary .");
  assert.equal(article.url, "https://example.com/one");
  assert.equal(article.publishedAt, "2026-07-21T12:00:00.000Z");
});

test("Atom entries are normalized", () => {
  const xml = `<?xml version="1.0"?><feed><entry>
    <title>Developer update</title>
    <link rel="alternate" href="https://example.com/two" />
    <id>post-two</id><updated>2026-07-21T13:00:00Z</updated>
    <summary>New SDK details.</summary>
  </entry></feed>`;
  const [article] = parseFeed(xml, feed);
  assert.equal(article.url, "https://example.com/two");
  assert.equal(article.summaryOriginal, "New SDK details.");
});

test("articles are de-duplicated and newest-first", () => {
  const old = { url: "https://example.com/old", publishedAt: "2026-07-20T00:00:00Z" };
  const fresh = { url: "https://example.com/new", publishedAt: "2026-07-22T00:00:00Z" };
  const duplicate = { ...old, titleJa: "newer copy wins" };
  assert.deepEqual(mergeArticles([old], [fresh, duplicate]), [fresh, duplicate]);
});

test("HTML is stripped from summaries", () => {
  assert.equal(plainText("<p>Hello&nbsp;<b>world</b></p>"), "Hello world");
});

test("old feed backfill is not treated as a new Discord notification", () => {
  const articles = [
    { url: "https://example.com/old", publishedAt: "2026-05-18T15:00:00Z" },
    { url: "https://example.com/delayed", publishedAt: "2026-07-21T23:00:00Z" },
    { url: "https://example.com/fresh", publishedAt: "2026-07-22T01:37:00Z" },
  ];

  assert.deepEqual(
    selectFreshNotifications(articles, {
      previousUpdatedAt: "2026-07-22T01:21:00Z",
      now: "2026-07-22T02:00:00Z",
    }),
    articles.slice(1),
  );
});
