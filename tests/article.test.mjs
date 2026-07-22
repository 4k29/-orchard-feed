import assert from "node:assert/strict";
import test from "node:test";
import { extractArticleText } from "../scripts/article.mjs";

test("structured article bodies are extracted", () => {
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">{"@type":"NewsArticle","articleBody":"Apple announced a product with several important details for customers and developers. This text is deliberately long enough to be preferred over the page navigation and metadata. It also explains why the announcement matters and when the change becomes available."}</script>
  </head><body><main>Menu Short fallback</main></body></html>`;

  assert.match(extractArticleText(html), /^Apple announced a product/);
});

test("article text is used without navigation and scripts", () => {
  const html = `<!doctype html><html><body><article>
    <nav>Navigation should disappear</nav>
    <h1>Test story</h1>
    <p>The first useful paragraph explains what happened in the announcement.</p>
    <p>The second paragraph adds context and describes why readers should care about it.</p>
    <script>console.log("ignore this")</script>
  </article></body></html>`;

  const text = extractArticleText(html);
  assert.match(text, /Test story The first useful paragraph/);
  assert.doesNotMatch(text, /Navigation should disappear|console\.log/);
});
