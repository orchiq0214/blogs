const DEFAULT_BANK_PATH = "question-banks/CDGA100道模拟题.md";
const DEFAULT_STATE_PATH = "data/cdga-state.json";
const LOCAL_CONFIG_KEY = "cdga_static_config_v1";
const LOCAL_STATE_KEY = "cdga_static_state_v1";
const LOCAL_BANK_KEY = "cdga_static_bank_markdown_v1";

const appState = {
  view: "dashboard",
  config: loadConfig(),
  bank: null,
  state: defaultState(),
  activeSession: null,
  currentIndex: 0,
  elapsedBase: 0,
  timerStartedAt: null,
  timerHandle: null,
  lastSyncAt: null,
  lastSyncSource: "本地",
  githubStateSha: null,
};

const app = document.querySelector("#app");
const statusLine = document.querySelector("#statusLine");

function defaultState() {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    sessions: [],
    wrongQuestions: {},
  };
}

function loadConfig() {
  try {
    return {
      owner: "",
      repo: "",
      branch: "main",
      questionBankPath: DEFAULT_BANK_PATH,
      statePath: DEFAULT_STATE_PATH,
      token: "",
      autoSync: true,
      ...JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}"),
    };
  } catch {
    return {
      owner: "",
      repo: "",
      branch: "main",
      questionBankPath: DEFAULT_BANK_PATH,
      statePath: DEFAULT_STATE_PATH,
      token: "",
      autoSync: true,
    };
  }
}

function saveConfig(config) {
  appState.config = { ...appState.config, ...config };
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(appState.config));
}

function hasGithubConfig() {
  const config = appState.config;
  return Boolean(config.owner && config.repo && config.branch && config.token);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2600);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function currentElapsed() {
  if (!appState.timerStartedAt) return appState.elapsedBase || 0;
  return (appState.elapsedBase || 0) + Math.floor((Date.now() - appState.timerStartedAt) / 1000);
}

function startTimer() {
  stopTimer();
  appState.elapsedBase = appState.activeSession?.elapsedSeconds || 0;
  appState.timerStartedAt = Date.now();
  appState.timerHandle = window.setInterval(() => {
    const node = document.querySelector("[data-elapsed]");
    if (node) node.textContent = formatTime(currentElapsed());
  }, 1000);
}

function stopTimer() {
  if (appState.timerHandle) window.clearInterval(appState.timerHandle);
  appState.timerHandle = null;
  appState.timerStartedAt = null;
}

function updateStatusLine() {
  const total = appState.bank?.total || 0;
  const wrongCount = Object.values(appState.state.wrongQuestions || {}).filter((item) => !item.resolved).length;
  const sync = hasGithubConfig() ? "GitHub 同步" : "本地保存";
  statusLine.textContent = `${total} 道题 · ${wrongCount} 道待复盘错题 · ${sync}`;
}

function updateTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === appState.view);
  });
}

function setView(view) {
  appState.view = view;
  if (view !== "quiz") stopTimer();
  updateTabs();
  render();
}

function parseMetadata(text) {
  const meta = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    meta[match[1]] = value;
  }
  return meta;
}

function parseSections(block) {
  const sectionRe = /^###\s+(.+?)\s*$/gm;
  const matches = [...block.matchAll(sectionRe)];
  const sections = {};
  for (let index = 0; index < matches.length; index += 1) {
    const name = matches[index][1].trim();
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : block.length;
    sections[name] = block.slice(start, end).trim();
  }
  return sections;
}

function parseOptions(text) {
  const options = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([A-Z])\.\s*(.*)$/);
    if (match) {
      options.push({ key: match[1], text: match[2].trim() });
    } else if (options.length > 0) {
      const last = options[options.length - 1];
      last.text = `${last.text}\n${line}`.trim();
    }
  }
  return options;
}

function parseQuestionBankMarkdown(markdown, source = "Markdown") {
  const raw = markdown.replace(/\r\n/g, "\n");
  const headingRe = /^##\s+Q(\d{1,4})\s*(.*?)\s*$/gm;
  const headings = [...raw.matchAll(headingRe)];
  const questions = headings.map((heading, index) => {
    const number = heading[1].padStart(3, "0");
    const id = `Q${number}`;
    const title = heading[2].trim();
    const start = heading.index + heading[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : raw.length;
    const block = raw.slice(start, end).trim();
    const firstSection = block.search(/^###\s+/m);
    const metadataText = firstSection >= 0 ? block.slice(0, firstSection).trim() : "";
    const meta = parseMetadata(metadataText);
    const sections = parseSections(block);
    const stem = sections["题干"] || title;
    const answer = (sections["答案"] || "").trim().toUpperCase().replace(/\s+/g, "");

    return {
      id,
      number: Number(number),
      title: title || stem.slice(0, 48),
      stem,
      options: parseOptions(sections["选项"] || ""),
      answer,
      explanation: sections["解析"] || "",
      chapter: meta.chapter || "未标注",
      knowledgePoint: meta.knowledge_point || "未标注",
      type: meta.type || "single_choice",
      sourceName: meta.source_name || source,
      sourceQuality: meta.source_quality || "unknown",
      reference: meta.reference || "",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
    };
  });

  if (!questions.length) throw new Error("没有解析到题目，请检查 Markdown 格式");
  return { source, total: questions.length, questions, loadedAt: nowIso() };
}

function questionMap() {
  return new Map((appState.bank?.questions || []).map((question) => [question.id, question]));
}

function chapterSummary() {
  const counts = new Map();
  for (const question of appState.bank?.questions || []) {
    counts.set(question.chapter, (counts.get(question.chapter) || 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function decodeBase64Utf8(content) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

async function githubRequest(path, options = {}) {
  const config = appState.config;
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `GitHub 请求失败：${response.status}`);
  }
  return data;
}

function encodePath(filePath) {
  return filePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function readGithubFile(filePath) {
  const config = appState.config;
  const encodedPath = encodePath(filePath);
  const data = await githubRequest(`/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`);
  if (!data) return null;
  return {
    text: decodeBase64Utf8(data.content || ""),
    sha: data.sha,
  };
}

async function writeGithubFile(filePath, text, message, sha = null) {
  const config = appState.config;
  const encodedPath = encodePath(filePath);
  const body = {
    message,
    content: encodeBase64Utf8(text),
    branch: config.branch,
  };
  if (sha) body.sha = sha;

  return githubRequest(`/contents/${encodedPath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function loadQuestionBank() {
  if (hasGithubConfig()) {
    const file = await readGithubFile(appState.config.questionBankPath);
    if (!file) throw new Error(`GitHub 里找不到题库：${appState.config.questionBankPath}`);
    appState.bank = parseQuestionBankMarkdown(file.text, `GitHub:${appState.config.questionBankPath}`);
    return;
  }

  const localMarkdown = localStorage.getItem(LOCAL_BANK_KEY);
  if (localMarkdown) {
    appState.bank = parseQuestionBankMarkdown(localMarkdown, "浏览器本地题库");
    return;
  }

  const candidates = [`../${DEFAULT_BANK_PATH}`, `./${DEFAULT_BANK_PATH}`];
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (response.ok) {
        const text = await response.text();
        appState.bank = parseQuestionBankMarkdown(text, candidate);
        return;
      }
    } catch {
      // Continue with the next candidate.
    }
  }

  throw new Error("还没有可用题库。请到“同步”页配置 GitHub，或导入 Markdown 题库。");
}

function loadLocalState() {
  try {
    return { ...defaultState(), ...JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) || "{}") };
  } catch {
    return defaultState();
  }
}

function saveLocalState() {
  appState.state.updatedAt = nowIso();
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(appState.state));
}

async function loadState() {
  if (hasGithubConfig()) {
    const file = await readGithubFile(appState.config.statePath);
    if (file) {
      appState.state = { ...defaultState(), ...JSON.parse(file.text) };
      appState.githubStateSha = file.sha;
      appState.lastSyncSource = "GitHub";
      return;
    }
  }
  appState.state = loadLocalState();
  appState.githubStateSha = null;
  appState.lastSyncSource = "本地";
}

function mergeStates(local, remote) {
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
    if (!existing || String(item.lastWrongAt || item.lastCorrectAt || "").localeCompare(existing.lastWrongAt || existing.lastCorrectAt || "") >= 0) {
      wrongQuestions[questionId] = item;
    }
  }

  return {
    ...defaultState(),
    ...remote,
    ...local,
    sessions: [...sessions.values()].sort((left, right) => String(right.updatedAt || "").localeCompare(left.updatedAt || "")),
    wrongQuestions,
    updatedAt: nowIso(),
  };
}

async function saveState(options = {}) {
  saveLocalState();
  if (!hasGithubConfig() || options.remote === false || appState.config.autoSync === false) {
    updateStatusLine();
    return;
  }

  const text = JSON.stringify(appState.state, null, 2);
  try {
    const result = await writeGithubFile(
      appState.config.statePath,
      text,
      "chore: sync cdga quiz state",
      appState.githubStateSha,
    );
    appState.githubStateSha = result.content?.sha || appState.githubStateSha;
    appState.lastSyncAt = nowIso();
    appState.lastSyncSource = "GitHub";
    updateStatusLine();
  } catch (error) {
    if (!String(error.message || "").includes("sha")) {
      toast(`GitHub 同步失败：${error.message}`);
      return;
    }
    const remote = await readGithubFile(appState.config.statePath);
    if (!remote) throw error;
    appState.state = mergeStates(appState.state, JSON.parse(remote.text));
    appState.githubStateSha = remote.sha;
    const retry = await writeGithubFile(
      appState.config.statePath,
      JSON.stringify(appState.state, null, 2),
      "chore: merge cdga quiz state",
      appState.githubStateSha,
    );
    appState.githubStateSha = retry.content?.sha || appState.githubStateSha;
    appState.lastSyncAt = nowIso();
    appState.lastSyncSource = "GitHub";
    saveLocalState();
    updateStatusLine();
  }
}

function latestActiveSession() {
  return (
    appState.state.sessions.find((session) => session.status === "in_progress") ||
    appState.state.sessions.find((session) => session.status === "paused") ||
    null
  );
}

function activeWrongIds() {
  return Object.values(appState.state.wrongQuestions || {})
    .filter((item) => !item.resolved)
    .sort((left, right) => String(right.lastWrongAt || "").localeCompare(left.lastWrongAt || ""))
    .map((item) => item.questionId);
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function clampCount(value, max) {
  if (value === "all") return max;
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return Math.min(20, max);
  return Math.max(1, Math.min(Math.floor(count), max));
}

function createSession(options = {}) {
  const allQuestions = appState.bank.questions;
  let pool = allQuestions;
  const mode = options.mode || "diagnostic";
  const chapter = options.chapter || "all";

  if (chapter !== "all") pool = pool.filter((question) => question.chapter === chapter);
  if (mode === "wrong") {
    const wrongIds = new Set(activeWrongIds());
    const wrongPool = allQuestions.filter((question) => wrongIds.has(question.id));
    pool = wrongPool.length ? wrongPool : pool;
  }
  if (!pool.length) pool = allQuestions;

  const randomOrder = options.randomOrder !== false;
  const ordered = randomOrder ? shuffle(pool) : [...pool];
  const count = clampCount(options.count || 20, ordered.length);
  const session = {
    id: makeId("session"),
    status: "in_progress",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    submittedAt: null,
    questionIds: ordered.slice(0, count).map((question) => question.id),
    currentIndex: 0,
    elapsedSeconds: 0,
    settings: {
      mode,
      chapter,
      count,
      revealMode: options.revealMode || "after_each",
      timerMinutes: Number(options.timerMinutes) || 0,
      randomOrder,
      autoWrong: options.autoWrong !== false,
      aiAssistMode: options.aiAssistMode || "off",
    },
    answers: {},
    revealed: {},
    report: null,
  };
  appState.state.sessions.unshift(session);
  appState.activeSession = session;
  appState.currentIndex = 0;
  return session;
}

function findSession(sessionId) {
  return appState.state.sessions.find((session) => session.id === sessionId);
}

function progressForSession(session) {
  const total = session.questionIds.length;
  const answered = Object.keys(session.answers || {}).length;
  return {
    total,
    answered,
    remaining: Math.max(0, total - answered),
    percent: total ? Math.round((answered / total) * 100) : 0,
  };
}

function isQuestionRevealed(session, questionId) {
  if (session.status === "submitted") return true;
  const mode = session.settings.revealMode;
  if (mode === "after_each" && session.answers[questionId]) return true;
  if (mode === "manual" && session.revealed[questionId]) return true;
  return false;
}

function decorateQuestion(question, session) {
  const answer = session.answers[question.id] || null;
  const revealed = isQuestionRevealed(session, question.id);
  return {
    ...question,
    userChoice: answer ? answer.choice : null,
    isCorrect: answer ? answer.isCorrect : null,
    revealed,
    answer: revealed ? question.answer : null,
    explanation: revealed ? question.explanation : null,
  };
}

function decoratedSession(session) {
  const byId = questionMap();
  return {
    ...session,
    questions: session.questionIds.map((id) => byId.get(id)).filter(Boolean).map((question) => decorateQuestion(question, session)),
    progress: progressForSession(session),
  };
}

function accuracySuggestion(accuracy) {
  if (accuracy >= 80) return "正确率已经适合进入 21 天冲刺：以错题、页码依据和高频概念混淆点为主。";
  if (accuracy >= 65) return "建议走 6 周稳妥速通：继续刷题，同时补齐错题对应章节框架。";
  if (accuracy >= 50) return "先别急着冲刺，优先补 DMBOK 框架和高频章节，再用错题回测。";
  return "当前更适合先做框架扫盲：把错题按章节归类，再逐章补核心概念。";
}

function buildReport(session) {
  const byId = questionMap();
  const chapterStats = {};
  const wrongItems = [];
  let correct = 0;
  let answered = 0;

  for (const questionId of session.questionIds) {
    const question = byId.get(questionId);
    if (!question) continue;
    const record = session.answers[questionId] || null;
    const userChoice = record ? record.choice : null;
    const isCorrect = userChoice === question.answer;
    if (record) answered += 1;
    if (isCorrect) correct += 1;

    if (!chapterStats[question.chapter]) {
      chapterStats[question.chapter] = { chapter: question.chapter, total: 0, correct: 0 };
    }
    chapterStats[question.chapter].total += 1;
    if (isCorrect) chapterStats[question.chapter].correct += 1;

    if (!isCorrect) {
      wrongItems.push({
        questionId,
        title: question.title,
        stem: question.stem,
        options: question.options,
        chapter: question.chapter,
        knowledgePoint: question.knowledgePoint,
        reference: question.reference,
        userChoice,
        answer: question.answer,
        explanation: question.explanation,
      });
    }
  }

  const total = session.questionIds.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  return {
    sessionId: session.id,
    submittedAt: nowIso(),
    total,
    answered,
    correct,
    wrong: total - correct,
    accuracy,
    chapters: Object.values(chapterStats).map((item) => ({
      ...item,
      accuracy: item.total ? Math.round((item.correct / item.total) * 100) : 0,
    })),
    wrongItems,
    suggestion: accuracySuggestion(accuracy),
  };
}

function updateWrongBook(session, report) {
  if (!session.settings.autoWrong) return;
  const now = nowIso();
  const wrongSet = new Set(report.wrongItems.map((item) => item.questionId));

  for (const item of report.wrongItems) {
    const previous = appState.state.wrongQuestions[item.questionId] || {
      questionId: item.questionId,
      count: 0,
      correctStreak: 0,
      resolved: false,
      history: [],
    };
    previous.count += 1;
    previous.correctStreak = 0;
    previous.resolved = false;
    previous.chapter = item.chapter;
    previous.knowledgePoint = item.knowledgePoint;
    previous.title = item.title;
    previous.reference = item.reference;
    previous.lastChoice = item.userChoice;
    previous.answer = item.answer;
    previous.lastWrongAt = now;
    previous.history.push({ sessionId: session.id, choice: item.userChoice, answer: item.answer, at: now });
    appState.state.wrongQuestions[item.questionId] = previous;
  }

  for (const questionId of session.questionIds) {
    if (wrongSet.has(questionId)) continue;
    const item = appState.state.wrongQuestions[questionId];
    if (!item) continue;
    item.correctStreak = (item.correctStreak || 0) + 1;
    item.lastCorrectAt = now;
    if (item.correctStreak >= 2) item.resolved = true;
  }
}

function renderMetric(value, label) {
  return `
    <div class="metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function renderDashboard() {
  const active = latestActiveSession();
  const chapters = chapterSummary();
  const submittedCount = appState.state.sessions.filter((session) => session.status === "submitted").length;
  const activeWrongCount = Object.values(appState.state.wrongQuestions || {}).filter((item) => !item.resolved).length;

  app.innerHTML = `
    ${
      active
        ? `
      <section class="resume-strip">
        <div>
          <strong>有一套未完成测试</strong>
          <div class="subtle">已答 ${progressForSession(active).answered}/${active.questionIds.length}，上次停在第 ${active.currentIndex + 1} 题</div>
        </div>
        <button class="btn primary" data-action="continue" data-session-id="${active.id}">继续测试</button>
      </section>
    `
        : ""
    }
    ${
      hasGithubConfig()
        ? ""
        : `
      <section class="notice">
        <div>
          <strong>当前是本地保存</strong>
          <div class="subtle">手机和电脑同步，需要到“同步”页配置 GitHub 私有仓库。</div>
        </div>
        <button class="btn" data-view-shortcut="sync">去配置</button>
      </section>
    `
    }
    <section class="grid dashboard-grid">
      <div class="grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h1 class="section-title">备考面板</h1>
              <div class="subtle">目标考试：2026-10-11 下午</div>
            </div>
          </div>
          <div class="panel-body">
            <div class="metric-row">
              ${renderMetric(appState.bank.total, "当前题库")}
              ${renderMetric(submittedCount, "完成测试")}
              ${renderMetric(activeWrongCount, "待复盘错题")}
              ${renderMetric(chapters.length, "章节数")}
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><h2 class="section-title">章节分布</h2></div>
          <div class="panel-body mini-table">
            ${
              chapters.length
                ? chapters
                    .map(
                      (chapter) => `
                <div class="mini-row">
                  <strong>${escapeHtml(chapter.name)}</strong>
                  <span>${chapter.count} 题</span>
                  <span></span>
                </div>
              `,
                    )
                    .join("")
                : `<div class="subtle">题库还没有章节标注</div>`
            }
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-header"><h2 class="section-title">开始一套测试</h2></div>
        <div class="panel-body">
          <form class="form-grid" id="startForm">
            <div class="field">
              <div class="field-title">模式</div>
              <div class="segmented" data-segment="mode">
                <button type="button" class="active" data-value="diagnostic">诊断</button>
                <button type="button" data-value="mock">模拟</button>
                <button type="button" data-value="wrong">错题</button>
              </div>
            </div>
            <div class="field">
              <label for="countSelect">题量</label>
              <select class="select" id="countSelect" name="count">
                <option value="10">10 题</option>
                <option value="20" selected>20 题</option>
                <option value="50">50 题</option>
                <option value="100">100 题</option>
                <option value="all">全部</option>
              </select>
            </div>
            <div class="field">
              <label for="chapterSelect">范围</label>
              <select class="select" id="chapterSelect" name="chapter">
                <option value="all">全部章节</option>
                ${chapters.map((chapter) => `<option value="${escapeHtml(chapter.name)}">${escapeHtml(chapter.name)} (${chapter.count})</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="revealSelect">答案显示</label>
              <select class="select" id="revealSelect" name="revealMode">
                <option value="after_each" selected>每题作答后显示</option>
                <option value="after_submit">整套提交后显示</option>
                <option value="manual">手动查看</option>
              </select>
            </div>
            <label class="checkline"><input type="checkbox" name="randomOrder" checked />随机出题</label>
            <label class="checkline"><input type="checkbox" name="autoWrong" checked />自动加入错题本</label>
            <button class="btn primary" type="submit">开始测试</button>
          </form>
        </div>
      </section>
    </section>
  `;
}

function optionClass(question, option) {
  const classes = ["option"];
  if (question.userChoice === option.key) classes.push("selected");
  if (question.revealed && option.key === question.answer) classes.push("correct");
  if (question.revealed && question.userChoice === option.key && option.key !== question.answer) classes.push("wrong");
  return classes.join(" ");
}

function renderQuiz() {
  const rawSession = appState.activeSession;
  if (!rawSession) {
    app.innerHTML = `<section class="empty">没有进行中的测试</section>`;
    return;
  }
  const session = decoratedSession(rawSession);
  const current = session.questions[appState.currentIndex] || session.questions[0];
  const progress = session.progress;

  app.innerHTML = `
    <section class="quiz-toolbar">
      <div class="quiz-title">
        <strong>第 ${appState.currentIndex + 1} 题 / 共 ${progress.total} 题</strong>
        <span class="subtle">已答 ${progress.answered} 题 · 用时 <span data-elapsed>${formatTime(currentElapsed())}</span></span>
      </div>
      <div class="actions">
        <button class="btn" data-action="pause">暂停</button>
        <button class="btn danger" data-action="submit">提交</button>
      </div>
    </section>
    <section class="quiz-layout">
      <article class="panel question-card">
        <div class="progress"><span style="width:${progress.percent}%"></span></div>
        <div class="question-meta">
          <span class="pill">${escapeHtml(current.id)}</span>
          <span class="pill">${escapeHtml(current.chapter)}</span>
          <span class="pill">${escapeHtml(current.knowledgePoint)}</span>
          ${current.reference ? `<span class="pill">${escapeHtml(current.reference)}</span>` : ""}
        </div>
        <h1 class="stem">${escapeHtml(current.stem)}</h1>
        <div class="options">
          ${current.options
            .map(
              (option) => `
            <button class="${optionClass(current, option)}" data-action="answer" data-choice="${option.key}">
              <span class="option-key">${option.key}</span>
              <span class="option-text">${escapeHtml(option.text)}</span>
            </button>
          `,
            )
            .join("")}
        </div>
        ${
          rawSession.settings.revealMode === "manual" && !current.revealed
            ? `<div class="actions" style="margin-top:14px"><button class="btn warning" data-action="reveal">查看答案</button></div>`
            : ""
        }
        ${
          current.revealed
            ? `
          <div class="explanation">
            <strong>答案：${escapeHtml(current.answer)}</strong>
            <div>${escapeHtml(current.explanation || "暂无解析")}</div>
          </div>
        `
            : ""
        }
        <div class="bottom-nav">
          <button class="btn" data-action="prev" ${appState.currentIndex === 0 ? "disabled" : ""}>上一题</button>
          <button class="btn primary" data-action="next" ${appState.currentIndex >= progress.total - 1 ? "disabled" : ""}>下一题</button>
        </div>
      </article>
      <aside class="panel side-panel">
        <strong>答题卡</strong>
        <div class="subtle">绿色为已作答</div>
        <div class="number-grid">
          ${session.questions
            .map(
              (question, index) => `
            <button class="${index === appState.currentIndex ? "current" : ""} ${question.userChoice ? "answered" : ""}" data-action="jump" data-index="${index}">
              ${index + 1}
            </button>
          `,
            )
            .join("")}
        </div>
      </aside>
    </section>
  `;
  startTimer();
}

function renderReport(session) {
  const report = session.report;
  app.innerHTML = `
    <section class="grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h1 class="section-title">本次结果</h1>
            <div class="subtle">${escapeHtml(report.suggestion)}</div>
          </div>
          <button class="btn primary" data-action="start-wrong">练错题</button>
        </div>
        <div class="panel-body">
          <div class="report-grid">
            ${renderMetric(`${report.accuracy}%`, "正确率")}
            ${renderMetric(report.correct, "答对")}
            ${renderMetric(report.wrong, "错题")}
            ${renderMetric(report.answered, "已答")}
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2 class="section-title">错题</h2></div>
        <div class="panel-body list">
          ${report.wrongItems.length ? report.wrongItems.map(renderWrongItem).join("") : `<div class="subtle">这套没有错题</div>`}
        </div>
      </section>
    </section>
  `;
}

function renderWrongItem(item) {
  const question = item.question || item;
  return `
    <article class="list-item">
      <h3>${escapeHtml(item.questionId || question.id)} ${escapeHtml(item.title || question.title || "")}</h3>
      <p>${escapeHtml(item.stem || question.stem || "")}</p>
      <p>你的答案：${escapeHtml(item.userChoice || item.lastChoice || "未答")} · 正确答案：${escapeHtml(item.answer || question.answer || "")}</p>
      <p>${escapeHtml(item.explanation || question.explanation || "暂无解析")}</p>
    </article>
  `;
}

function renderWrong() {
  const byId = questionMap();
  const items = Object.values(appState.state.wrongQuestions || {})
    .filter((item) => !item.resolved)
    .sort((left, right) => String(right.lastWrongAt || "").localeCompare(left.lastWrongAt || ""))
    .map((item) => ({ ...item, question: byId.get(item.questionId) }));

  app.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h1 class="section-title">错题本</h1>
          <div class="subtle">${items.length} 道待复盘</div>
        </div>
        <button class="btn primary" data-action="start-wrong" ${items.length ? "" : "disabled"}>生成错题测试</button>
      </div>
      <div class="panel-body list">
        ${items.length ? items.map(renderWrongItem).join("") : `<div class="empty">还没有错题</div>`}
      </div>
    </section>
  `;
}

function renderHistory() {
  const sessions = appState.state.sessions.slice(0, 30);
  app.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h1 class="section-title">测试记录</h1></div>
      <div class="panel-body list">
        ${
          sessions.length
            ? sessions
                .map(
                  (session) => `
            <article class="list-item">
              <h3>${escapeHtml(session.status)} · ${escapeHtml(new Date(session.createdAt).toLocaleString())}</h3>
              <p>进度：${progressForSession(session).answered}/${session.questionIds.length}${session.report ? ` · 正确率：${session.report.accuracy}%` : ""}</p>
            </article>
          `,
                )
                .join("")
            : `<div class="empty">还没有测试记录</div>`
        }
      </div>
    </section>
  `;
}

function renderSync() {
  const config = appState.config;
  app.innerHTML = `
    <section class="grid dashboard-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h1 class="section-title">GitHub 同步</h1>
            <div class="subtle">题库和答题日志放在你的仓库里，网页只负责读写。</div>
          </div>
        </div>
        <div class="panel-body">
          <form class="form-grid" id="syncForm">
            <div class="field">
              <label for="ownerInput">GitHub 用户名</label>
              <input class="input" id="ownerInput" name="owner" value="${escapeHtml(config.owner)}" placeholder="orchiq0214" />
            </div>
            <div class="field">
              <label for="repoInput">仓库名</label>
              <input class="input" id="repoInput" name="repo" value="${escapeHtml(config.repo)}" placeholder="cdga-quiz-data" />
            </div>
            <div class="field">
              <label for="branchInput">分支</label>
              <input class="input" id="branchInput" name="branch" value="${escapeHtml(config.branch || "main")}" />
            </div>
            <div class="field">
              <label for="bankPathInput">题库路径</label>
              <input class="input" id="bankPathInput" name="questionBankPath" value="${escapeHtml(config.questionBankPath || DEFAULT_BANK_PATH)}" />
            </div>
            <div class="field">
              <label for="statePathInput">答题日志路径</label>
              <input class="input" id="statePathInput" name="statePath" value="${escapeHtml(config.statePath || DEFAULT_STATE_PATH)}" />
            </div>
            <div class="field">
              <label for="tokenInput">GitHub token</label>
              <input class="input" id="tokenInput" name="token" type="password" value="${escapeHtml(config.token)}" placeholder="只保存在当前浏览器" />
            </div>
            <label class="checkline"><input type="checkbox" name="autoSync" ${config.autoSync === false ? "" : "checked"} />答题后自动同步到 GitHub</label>
            <div class="actions">
              <button class="btn primary" type="submit">保存并连接</button>
              <button class="btn" type="button" data-action="pull-github">从 GitHub 读取</button>
              <button class="btn" type="button" data-action="push-github">推送当前进度</button>
            </div>
          </form>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2 class="section-title">本地导入</h2></div>
        <div class="panel-body form-grid">
          <div class="notice" style="margin:0">
            <div>
              <strong>不用 GitHub 也能先刷</strong>
              <div class="subtle">导入 Markdown 后，记录会先保存在当前浏览器。</div>
            </div>
          </div>
          <div class="field">
            <label for="bankFileInput">导入题库 Markdown</label>
            <input class="input" id="bankFileInput" type="file" accept=".md,.markdown,.txt" />
          </div>
          <div class="mini-table">
            <div class="mini-row"><strong>当前题库</strong><span>${appState.bank?.total || 0} 题</span><span></span></div>
            <div class="mini-row"><strong>保存位置</strong><span>${hasGithubConfig() ? "GitHub" : "本地"}</span><span></span></div>
            <div class="mini-row"><strong>最后同步</strong><span>${appState.lastSyncAt ? new Date(appState.lastSyncAt).toLocaleTimeString() : "-"}</span><span></span></div>
          </div>
        </div>
      </section>
    </section>
  `;
}

function render() {
  updateStatusLine();
  if (appState.view === "dashboard") renderDashboard();
  if (appState.view === "quiz") renderQuiz();
  if (appState.view === "wrong") renderWrong();
  if (appState.view === "history") renderHistory();
  if (appState.view === "sync") renderSync();
}

function selectedSegmentValue(name) {
  const active = document.querySelector(`[data-segment="${name}"] .active`);
  return active ? active.dataset.value : "";
}

async function startSession(overrides = {}) {
  const form = document.querySelector("#startForm");
  const session = createSession({
    mode: selectedSegmentValue("mode") || "diagnostic",
    count: form?.count?.value || "20",
    chapter: form?.chapter?.value || "all",
    revealMode: form?.revealMode?.value || "after_each",
    randomOrder: form?.randomOrder?.checked ?? true,
    autoWrong: form?.autoWrong?.checked ?? true,
    ...overrides,
  });
  await saveState();
  appState.activeSession = session;
  appState.currentIndex = session.currentIndex || 0;
  appState.view = "quiz";
  updateTabs();
  renderQuiz();
}

async function saveSessionProgress(remote = false) {
  if (!appState.activeSession) return;
  appState.activeSession.currentIndex = appState.currentIndex;
  appState.activeSession.elapsedSeconds = currentElapsed();
  appState.activeSession.updatedAt = nowIso();
  await saveState({ remote: remote ? undefined : false });
}

async function answerCurrent(choice) {
  const session = appState.activeSession;
  const decorated = decoratedSession(session);
  const question = decorated.questions[appState.currentIndex];
  const rawQuestion = questionMap().get(question.id);
  session.answers[question.id] = {
    choice,
    isCorrect: choice === rawQuestion.answer,
    answeredAt: nowIso(),
  };
  session.currentIndex = appState.currentIndex;
  session.elapsedSeconds = currentElapsed();
  session.updatedAt = nowIso();
  if (session.status === "paused") session.status = "in_progress";
  await saveState();
  renderQuiz();
}

async function pauseSession() {
  appState.activeSession.status = "paused";
  await saveSessionProgress(true);
  stopTimer();
  setView("dashboard");
}

async function submitSession() {
  const session = appState.activeSession;
  const progress = progressForSession(session);
  const ok = window.confirm(progress.remaining > 0 ? `还有 ${progress.remaining} 题未答，确定提交吗？` : "确定提交这套测试吗？");
  if (!ok) return;
  session.elapsedSeconds = currentElapsed();
  session.report = buildReport(session);
  session.status = "submitted";
  session.submittedAt = session.report.submittedAt;
  session.updatedAt = nowIso();
  updateWrongBook(session, session.report);
  await saveState();
  stopTimer();
  renderReport(session);
}

async function revealCurrent() {
  const session = appState.activeSession;
  const question = decoratedSession(session).questions[appState.currentIndex];
  session.revealed[question.id] = nowIso();
  session.updatedAt = nowIso();
  await saveState({ remote: false });
  renderQuiz();
}

async function applySyncForm(form) {
  saveConfig({
    owner: form.owner.value.trim(),
    repo: form.repo.value.trim(),
    branch: form.branch.value.trim() || "main",
    questionBankPath: form.questionBankPath.value.trim() || DEFAULT_BANK_PATH,
    statePath: form.statePath.value.trim() || DEFAULT_STATE_PATH,
    token: form.token.value.trim(),
    autoSync: form.autoSync.checked,
  });
  await loadQuestionBank();
  await loadState();
  render();
}

async function pullGithub() {
  if (!hasGithubConfig()) throw new Error("请先填写 GitHub 配置和 token");
  await loadQuestionBank();
  await loadState();
  saveLocalState();
  appState.lastSyncAt = nowIso();
  render();
}

async function pushGithub() {
  if (!hasGithubConfig()) throw new Error("请先填写 GitHub 配置和 token");
  const remote = await readGithubFile(appState.config.statePath);
  appState.githubStateSha = remote?.sha || null;
  if (remote) appState.state = mergeStates(appState.state, JSON.parse(remote.text));
  await saveState();
  toast("已推送到 GitHub");
  render();
}

document.addEventListener("click", async (event) => {
  const shortcut = event.target.closest("[data-view-shortcut]");
  if (shortcut) {
    setView(shortcut.dataset.viewShortcut);
    return;
  }

  const segmentButton = event.target.closest("[data-segment] button");
  if (segmentButton) {
    const group = segmentButton.closest("[data-segment]");
    group.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    segmentButton.classList.add("active");
    return;
  }

  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  try {
    if (action === "continue") {
      appState.activeSession = findSession(target.dataset.sessionId);
      appState.currentIndex = appState.activeSession.currentIndex || 0;
      appState.view = "quiz";
      updateTabs();
      renderQuiz();
    }
    if (action === "answer") await answerCurrent(target.dataset.choice);
    if (action === "pause") await pauseSession();
    if (action === "submit") await submitSession();
    if (action === "reveal") await revealCurrent();
    if (action === "prev") {
      appState.currentIndex = Math.max(0, appState.currentIndex - 1);
      await saveSessionProgress(false);
      renderQuiz();
    }
    if (action === "next") {
      appState.currentIndex = Math.min(decoratedSession(appState.activeSession).questions.length - 1, appState.currentIndex + 1);
      await saveSessionProgress(false);
      renderQuiz();
    }
    if (action === "jump") {
      appState.currentIndex = Number(target.dataset.index || 0);
      await saveSessionProgress(false);
      renderQuiz();
    }
    if (action === "start-wrong") await startSession({ mode: "wrong", count: "all" });
    if (action === "pull-github") await pullGithub();
    if (action === "push-github") await pushGithub();
  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (event.target.id === "startForm") await startSession();
    if (event.target.id === "syncForm") {
      await applySyncForm(event.target);
      toast("已连接同步源");
    }
  } catch (error) {
    toast(error.message);
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.id !== "bankFileInput") return;
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    appState.bank = parseQuestionBankMarkdown(text, file.name);
    localStorage.setItem(LOCAL_BANK_KEY, text);
    toast(`已导入 ${appState.bank.total} 道题`);
    render();
  } catch (error) {
    toast(error.message);
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

(async function boot() {
  app.innerHTML = `<section class="empty">正在加载题库和答题记录</section>`;
  try {
    await loadQuestionBank();
    await loadState();
    appState.activeSession = latestActiveSession();
    appState.currentIndex = appState.activeSession?.currentIndex || 0;
    render();
  } catch (error) {
    appState.view = "sync";
    updateTabs();
    statusLine.textContent = "需要配置题库";
    app.innerHTML = `
      <section class="notice">
        <div>
          <strong>题库还没加载成功</strong>
          <div class="subtle">${escapeHtml(error.message)}</div>
        </div>
        <button class="btn primary" data-view-shortcut="sync">去配置</button>
      </section>
    `;
  }
})();
