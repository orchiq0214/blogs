(function attachQuizRules(root, factory) {
  const rules = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = rules;
  }
  root.CdgaQuizRules = rules;
})(typeof globalThis !== "undefined" ? globalThis : window, function buildQuizRules() {
  function isStudyMode(session) {
    return Boolean(session?.settings?.studyMode);
  }

  function isAnswerVisible(session, questionId) {
    if (!session) return false;
    if (session.status === "submitted") return true;
    if (isStudyMode(session)) return true;
    const mode = session.settings?.revealMode;
    if (mode === "after_each" && session.answers?.[questionId]) return true;
    if (mode === "manual" && session.revealed?.[questionId]) return true;
    return false;
  }

  function getAnswerCardClasses({ questionId, index, currentIndex, session }) {
    const classes = [];
    const answer = session?.answers?.[questionId] || null;
    const visible = isAnswerVisible(session, questionId);
    if (index === currentIndex) classes.push("current");
    if (answer) classes.push("answered");
    if (answer && visible && answer.isCorrect === false) classes.push("card-wrong");
    if (answer && visible && answer.isCorrect === true) classes.push("card-correct");
    return classes;
  }

  function nextStudyMode(session) {
    return !isStudyMode(session);
  }

  return {
    isStudyMode,
    isAnswerVisible,
    getAnswerCardClasses,
    nextStudyMode,
  };
});
