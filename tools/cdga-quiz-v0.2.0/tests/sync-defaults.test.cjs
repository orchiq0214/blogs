const assert = require("node:assert/strict");
const {
  DEFAULT_SYNC_CONFIG,
  normalizeSyncConfig,
} = require("../sync-defaults.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("default sync config points to the private CDGA data repo template", () => {
  assert.equal(DEFAULT_SYNC_CONFIG.owner, "orchiq0214");
  assert.equal(DEFAULT_SYNC_CONFIG.repo, "data-portfolio-private");
  assert.equal(DEFAULT_SYNC_CONFIG.branch, "main");
  assert.equal(DEFAULT_SYNC_CONFIG.questionBankPath, "cdga-quiz/question-banks/CDGA100道模拟题.md");
  assert.equal(DEFAULT_SYNC_CONFIG.statePath, "cdga-quiz/data/cdga-state.json");
});

test("blank saved config is refilled with defaults while preserving token", () => {
  const config = normalizeSyncConfig({
    owner: "",
    repo: "",
    branch: "",
    questionBankPath: "",
    statePath: "",
    token: "secret-token",
    autoSync: false,
  });

  assert.equal(config.owner, "orchiq0214");
  assert.equal(config.repo, "data-portfolio-private");
  assert.equal(config.branch, "main");
  assert.equal(config.questionBankPath, "cdga-quiz/question-banks/CDGA100道模拟题.md");
  assert.equal(config.statePath, "cdga-quiz/data/cdga-state.json");
  assert.equal(config.token, "secret-token");
  assert.equal(config.autoSync, false);
});
