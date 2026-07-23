(() => {
  const roots = [
    document.querySelector("#family-filter"),
    document.querySelector("#advanced-filters"),
  ].filter(Boolean);

  function formatSizeLabels(root) {
    root.querySelectorAll("button").forEach((button) => {
      button.textContent = button.textContent.replace(/(\d+(?:\.\d+)?)インチ/g, '$1"');
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
