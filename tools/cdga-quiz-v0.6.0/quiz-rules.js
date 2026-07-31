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

  function mouseNavigationAction({ button, targetIsInteractive }) {
    if (targetIsInteractive) return null;
    if (button === 0) return "next";
    if (button === 2) return "prev";
    return null;
  }

  function createOptionOrder(options, { randomize = true, random = Math.random } = {}) {
    const keys = options.map((option) => option.key);
    if (!randomize) return keys;
    for (let index = keys.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [keys[index], keys[swapIndex]] = [keys[swapIndex], keys[index]];
    }
    return keys;
  }

  function applyOptionOrder(options, order) {
    const byKey = new Map(options.map((option) => [option.key, option]));
    const seen = new Set();
    const ordered = [];
    for (const key of Array.isArray(order) ? order : []) {
      if (byKey.has(key) && !seen.has(key)) {
        ordered.push(byKey.get(key));
        seen.add(key);
      }
    }
    for (const option of options) {
      if (!seen.has(option.key)) ordered.push(option);
    }
    return ordered.map((option, index) => ({
      ...option,
      displayKey: String.fromCharCode(65 + index),
    }));
  }

  function visibleQuestionMeta({ chapter, knowledgePoint, reference }) {
    const seen = new Set();
    return [chapter, knowledgePoint, reference].filter((value) => {
      const label = String(value || "").trim();
      if (!label || seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  }

  function summarizeQuestionPractice({ questionIds, sessions }) {
    const stats = Object.fromEntries(
      questionIds.map((questionId) => [questionId, {
        attempts: 0,
        correct: 0,
        wrong: 0,
        lastResult: null,
        lastAnsweredAt: null,
      }]),
    );
    for (const session of sessions || []) {
      for (const [questionId, answer] of Object.entries(session.answers || {})) {
        const item = stats[questionId];
        if (!item || !answer) continue;
        item.attempts += 1;
        if (answer.isCorrect) item.correct += 1;
        else item.wrong += 1;
        if (!item.lastAnsweredAt || String(answer.answeredAt || "").localeCompare(item.lastAnsweredAt) >= 0) {
          item.lastResult = answer.isCorrect ? "correct" : "wrong";
          item.lastAnsweredAt = answer.answeredAt || null;
        }
      }
    }
    return stats;
  }

  function isGithubStateConflict(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("does not match") || text.includes("sha") || text.includes("conflict");
  }

  function mergeSyncState({ local = {}, remote = {}, updatedAt }) {
    const sessions = new Map();
    for (const session of [...(remote.sessions || []), ...(local.sessions || [])]) {
      const existing = sessions.get(session.id);
      if (!existing || String(session.updatedAt || "").localeCompare(existing.updatedAt || "") >= 0) {
        sessions.set(session.id, session);
      }
    }

    const wrongQuestions = { ...(remote.wrongQuestions || {}) };
    for (const [questionId, item] of Object.entries(local.wrongQuestions || {})) {
      const existing = wrongQuestions[questionId];
      const itemAt = item.lastWrongAt || item.lastCorrectAt || "";
      const existingAt = existing?.lastWrongAt || existing?.lastCorrectAt || "";
      if (!existing || String(itemAt).localeCompare(existingAt) >= 0) wrongQuestions[questionId] = item;
    }

    return {
      ...remote,
      ...local,
      sessions: [...sessions.values()].sort((left, right) => String(right.updatedAt || "").localeCompare(left.updatedAt || "")),
      wrongQuestions,
      updatedAt,
    };
  }

  function wrongQuestionReviewState(item = {}) {
    if (Number(item.correctStreak || 0) >= 3) return "mastered";
    if (Number(item.count || 0) >= 2) return "high_risk";
    return "pending";
  }

  function sortWrongQuestionItems(items = []) {
    const rank = { high_risk: 0, pending: 1, mastered: 2 };
    return [...items].sort((left, right) => {
      const stateDifference = rank[wrongQuestionReviewState(left)] - rank[wrongQuestionReviewState(right)];
      if (stateDifference) return stateDifference;
      const wrongDifference = Number(right.count || 0) - Number(left.count || 0);
      if (wrongDifference) return wrongDifference;
      return String(right.lastWrongAt || "").localeCompare(String(left.lastWrongAt || ""));
    });
  }

  return {
    isStudyMode,
    isAnswerVisible,
    getAnswerCardClasses,
    nextStudyMode,
    mouseNavigationAction,
    createOptionOrder,
    applyOptionOrder,
    visibleQuestionMeta,
    summarizeQuestionPractice,
    isGithubStateConflict,
    mergeSyncState,
    wrongQuestionReviewState,
    sortWrongQuestionItems,
  };
});
