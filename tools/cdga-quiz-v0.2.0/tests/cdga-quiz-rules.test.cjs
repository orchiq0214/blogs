const assert = require("node:assert/strict");
const {
  isAnswerVisible,
  getAnswerCardClasses,
  nextStudyMode,
} = require("../quiz-rules.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const baseSession = {
  status: "in_progress",
  settings: { studyMode: false, revealMode: "after_submit" },
  answers: {
    Q001: { choice: "B", isCorrect: false },
    Q002: { choice: "A", isCorrect: true },
  },
  revealed: {},
};

test("study mode reveals answers without submitting", () => {
  const session = { ...baseSession, settings: { ...baseSession.settings, studyMode: true } };
  assert.equal(isAnswerVisible(session, "Q003"), true);
});

test("exam mode keeps answers hidden until submit", () => {
  assert.equal(isAnswerVisible(baseSession, "Q001"), false);
});

test("answer card marks wrong and correct questions only when answers are visible", () => {
  const studySession = { ...baseSession, settings: { ...baseSession.settings, studyMode: true } };
  assert.deepEqual(getAnswerCardClasses({ questionId: "Q001", index: 0, currentIndex: 0, session: studySession }), [
    "current",
    "answered",
    "card-wrong",
  ]);
  assert.deepEqual(getAnswerCardClasses({ questionId: "Q002", index: 1, currentIndex: 0, session: studySession }), [
    "answered",
    "card-correct",
  ]);
  assert.deepEqual(getAnswerCardClasses({ questionId: "Q001", index: 0, currentIndex: 0, session: baseSession }), [
    "current",
    "answered",
  ]);
});

test("mode toggle switches between exam and study without changing answers", () => {
  assert.equal(nextStudyMode(baseSession), true);
  const studySession = { ...baseSession, settings: { ...baseSession.settings, studyMode: true } };
  assert.equal(nextStudyMode(studySession), false);
  assert.equal(baseSession.answers.Q001.choice, "B");
});
