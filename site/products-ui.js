(() => {
  const roots = [
    document.querySelector("#family-filter"),
    document.querySelector("#advanced-filters"),
  ].filter(Boolean);

  function formatSizeLabels(root) {
    root.querySelectorAll("button").forEach((button) => {
      const current = button.textContent;
      const next = current.replace(/(\d+(?:\.\d+)?)インチ/g, '$1"');
      if (next !== current) button.textContent = next;
    });
  }

  roots.forEach((root) => {
    formatSizeLabels(root);
    new MutationObserver(() => formatSizeLabels(root)).observe(root, {
      childList: true,
      subtree: true,
    });
  });
})();