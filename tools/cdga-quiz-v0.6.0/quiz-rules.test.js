const assert = require("assert");
const rules = require("./quiz-rules.js");

assert.strictEqual(rules.mouseNavigationAction({ button: 0, targetIsInteractive: false }), "next");
assert.strictEqual(rules.mouseNavigationAction({ button: 2, targetIsInteractive: false }), "prev");
assert.strictEqual(rules.mouseNavigationAction({ button: 0, targetIsInteractive: true }), null);
assert.strictEqual(rules.mouseNavigationAction({ button: 1, targetIsInteractive: false }), null);

const sampleOptions = [
  { key: "A", text: "alpha" },
  { key: "B", text: "beta" },
  { key: "C", text: "gamma" },
];
assert.deepStrictEqual(
  rules.createOptionOrder(sampleOptions, { randomize: false }),
  ["A", "B", "C"],
);
assert.deepStrictEqual(
  rules.createOptionOrder(sampleOptions, { randomize: true, random: () => 0 }),
  ["B", "C", "A"],
);
assert.deepStrictEqual(
  rules.applyOptionOrder(sampleOptions, ["C", "A", "B"]).map((option) => option.displayKey),
  ["A", "B", "C"],
);
assert.strictEqual(
  rules.applyOptionOrder(sampleOptions, ["C", "A", "B"])[0].key,
  "C",
);
assert.deepStrictEqual(
  rules.visibleQuestionMeta({
    chapter: "第三章 数据治理",
    knowledgePoint: "第三章 数据治理",
    reference: "第三章 数据治理",
  }),
  ["第三章 数据治理"],
);
assert.deepStrictEqual(
  rules.visibleQuestionMeta({
    chapter: "第三章 数据治理",
    knowledgePoint: "度量指标",
    reference: "DMBOK 2-3.5",
  }),
  ["第三章 数据治理", "度量指标", "DMBOK 2-3.5"],
);
const practiceStats = rules.summarizeQuestionPractice({
  questionIds: ["Q001", "Q002"],
  sessions: [
    {
      id: "session_1",
      answers: {
        Q001: { isCorrect: false, answeredAt: "2026-07-01T10:00:00.000Z" },
      },
    },
    {
      id: "session_2",
      answers: {
        Q001: { isCorrect: true, answeredAt: "2026-07-02T10:00:00.000Z" },
      },
    },
  ],
});
assert.deepStrictEqual(practiceStats.Q001, {
  attempts: 2,
  correct: 1,
  wrong: 1,
  lastResult: "correct",
  lastAnsweredAt: "2026-07-02T10:00:00.000Z",
});
assert.deepStrictEqual(practiceStats.Q002, {
  attempts: 0,
  correct: 0,
  wrong: 0,
  lastResult: null,
  lastAnsweredAt: null,
});
assert.strictEqual(
  rules.isGithubStateConflict("cdga-quiz/data/cdga-state.json does not match e8ed6993f79e38f39b3e3c3a35d75a8009db8c82"),
  true,
);
const mergedState = rules.mergeSyncState({
  local: {
    sessions: [{ id: "local", updatedAt: "2026-07-02T10:00:00.000Z" }],
    wrongQuestions: { Q001: { lastWrongAt: "2026-07-02T10:00:00.000Z" } },
  },
  remote: {
    sessions: [{ id: "remote", updatedAt: "2026-07-01T10:00:00.000Z" }],
    wrongQuestions: { Q002: { lastWrongAt: "2026-07-01T10:00:00.000Z" } },
  },
  updatedAt: "2026-07-03T10:00:00.000Z",
});
assert.deepStrictEqual(mergedState.sessions.map((session) => session.id), ["local", "remote"]);
assert.deepStrictEqual(Object.keys(mergedState.wrongQuestions).sort(), ["Q001", "Q002"]);

assert.strictEqual(rules.wrongQuestionReviewState({ count: 1, correctStreak: 0 }), "pending");
assert.strictEqual(rules.wrongQuestionReviewState({ count: 2, correctStreak: 1 }), "high_risk");
assert.strictEqual(rules.wrongQuestionReviewState({ count: 2, correctStreak: 3 }), "mastered");
assert.deepStrictEqual(
  rules.sortWrongQuestionItems([
    { questionId: "mastered", count: 3, correctStreak: 3 },
    { questionId: "pending", count: 1, correctStreak: 0 },
    { questionId: "high-risk", count: 2, correctStreak: 0 },
  ]).map((item) => item.questionId),
  ["high-risk", "pending", "mastered"],
);

console.log("quiz rules mouse navigation: ok");
