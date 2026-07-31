const assert = require("assert");
const defaults = require("./sync-defaults.js");

assert.strictEqual(
  defaults.DEFAULT_SYNC_CONFIG.questionBankPath,
  "cdga-quiz/question-banks/CDGA分章节练习题.md",
);

console.log("sync defaults: ok");
