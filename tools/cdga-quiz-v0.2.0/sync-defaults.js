(function attachSyncDefaults(root, factory) {
  const defaults = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = defaults;
  }
  root.CdgaSyncDefaults = defaults;
})(typeof globalThis !== "undefined" ? globalThis : window, function buildSyncDefaults() {
  const DEFAULT_SYNC_CONFIG = {
    owner: "orchiq0214",
    repo: "data-portfolio-private",
    branch: "main",
    questionBankPath: "cdga-quiz/question-banks/CDGA100道模拟题.md",
    statePath: "cdga-quiz/data/cdga-state.json",
    token: "",
    autoSync: true,
  };

  function normalizeSyncConfig(config = {}) {
    const merged = { ...DEFAULT_SYNC_CONFIG, ...config };
    return {
      ...merged,
      owner: merged.owner || DEFAULT_SYNC_CONFIG.owner,
      repo: merged.repo || DEFAULT_SYNC_CONFIG.repo,
      branch: merged.branch || DEFAULT_SYNC_CONFIG.branch,
      questionBankPath: merged.questionBankPath || DEFAULT_SYNC_CONFIG.questionBankPath,
      statePath: merged.statePath || DEFAULT_SYNC_CONFIG.statePath,
    };
  }

  return {
    DEFAULT_SYNC_CONFIG,
    normalizeSyncConfig,
  };
});
