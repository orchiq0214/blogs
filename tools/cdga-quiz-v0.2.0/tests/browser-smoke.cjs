const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const TEST_URL = process.env.CDGA_QUIZ_TEST_URL || "http://localhost:5188/quiz-static-v0.2.0/";
const TEST_BANK = `# Test Bank

## Q001 测试题一
chapter: 测试章节
knowledge_point: 测试知识点

### 题干
下列哪一项是正确答案？

### 选项
A. 正确项
B. 干扰项
C. 干扰项
D. 干扰项

### 答案
A

### 解析
这是测试解析。

## Q002 测试题二
chapter: 测试章节
knowledge_point: 测试知识点

### 题干
下列哪一项是正确答案？

### 选项
A. 干扰项
B. 正确项
C. 干扰项
D. 干扰项

### 答案
B

### 解析
这是第二道测试解析。
`;

async function runFlow(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((markdown) => {
    localStorage.clear();
    localStorage.setItem("cdga_static_bank_markdown_v1", markdown);
  }, TEST_BANK);

  await page.goto(TEST_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("#startForm", { timeout: 10000 });

  assert.match(await page.locator(".brand").textContent(), /CDGA/);
  assert.equal(await page.locator("link[rel='manifest']").getAttribute("href"), "./manifest.webmanifest");
  assert.equal(await page.locator("meta[name='mobile-web-app-capable']").getAttribute("content"), "yes");

  await page.locator("[data-view='sync']").click();
  await page.waitForSelector("#syncForm", { timeout: 10000 });
  assert.equal(await page.locator("#ownerInput").inputValue(), "orchiq0214");
  assert.equal(await page.locator("#repoInput").inputValue(), "cdga-quiz-data");
  assert.equal(await page.locator("#branchInput").inputValue(), "main");
  assert.equal(await page.locator("#bankPathInput").inputValue(), "question-banks/CDGA100道模拟题.md");
  assert.equal(await page.locator("#statePathInput").inputValue(), "data/cdga-state.json");
  await page.locator("[data-view='dashboard']").click();
  await page.waitForSelector("#startForm", { timeout: 10000 });

  await page.selectOption("#countSelect", "10");
  await page.locator("#startForm button[type='submit']").click();
  await page.waitForSelector(".question-card", { timeout: 10000 });
  assert.equal(await page.locator(".mode-pill").textContent(), "考试模式");

  await page.locator(".option").first().click();
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".explanation").count(), 0);
  assert.match(await page.locator(".number-grid button").first().getAttribute("class"), /answered/);

  await page.locator("[data-action='toggle-study']").click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".mode-pill").textContent(), "背题模式");
  assert.equal(await page.locator(".explanation").count(), 1);
  assert.match(
    await page.locator(".number-grid button").first().getAttribute("class"),
    /card-(correct|wrong)/,
  );

  await context.close();
  assert.deepEqual(errors, [], `${label} console/page errors`);
  console.log(`ok - browser smoke ${label}`);
}

async function main() {
  const executablePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  await runFlow(browser, { width: 1366, height: 900 }, "desktop");
  await runFlow(browser, { width: 390, height: 844 }, "android");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
