// Tests for the scripts this package ships: the linter, the term checker, the two hooks and the installer.
// They check behaviour only; the wording of core/ and skills/ is not under test.
// Run: node --test "tests/*.test.mjs"   (needs Node 20+ and Python 3 on PATH)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// A Windows checkout may hold CRLF sources; the installer always writes LF, so compare with LF.
const read = (...parts) => readFileSync(join(...parts), "utf8").replace(/\r\n/g, "\n");

function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), "dialogue-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function put(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

function node(script, args = [], { cwd = root, input = "", env = {} } = {}) {
  return spawnSync(process.execPath, [join(root, script), ...args], {
    cwd,
    input,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

const python = ["python3", "python"].find((name) => spawnSync(name, ["--version"]).status === 0);

function sync(home, ...args) {
  assert.ok(python, "Python 3 is not on PATH");
  const run = spawnSync(python, [join(root, "install/sync.py"), "--home", home, ...args], {
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1" },
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout;
}

// ---------------------------------------------------------------- tools/lint-spec.mjs

test("lint-spec passes on the shipped rule and skills", () => {
  const run = node("tools/lint-spec.mjs", ["core", "skills", "shared"]);
  assert.equal(run.status, 0, run.stdout);
});

test("lint-spec reports a clause without a modal verb, a colloquial word and a wrong skill name", (t) => {
  const dir = tempDir(t);
  put(
    join(dir, "some-skill/SKILL.md"),
    "---\nname: other-name\ndescription: 测试用。\n---\n\n## 3 要求\n\n3.1 Agent 写出结论。\n\n3.2 Agent 应先搞清楚读者。\n",
  );
  const run = node("tools/lint-spec.mjs", [dir]);
  assert.equal(run.status, 1);
  assert.match(run.stdout, /SKILL\.md:1: error: name 应与目录名一致/);
  assert.match(run.stdout, /SKILL\.md:8: error: 要求条款缺少能愿动词/);
  assert.match(run.stdout, /SKILL\.md:10: error: 口语词「搞」/);
});

test("lint-spec leaves examples, quotations and descriptive sections alone", (t) => {
  const dir = tempDir(t);
  put(
    join(dir, "rule.md"),
    [
      "## 1 范围",
      "",
      "1.1 本规则适用于全部文本。",
      "",
      "## 2 要求",
      "",
      "2.1 Agent 不应沿用「搞」这类词。",
      "",
      "<examples>",
      "用户：帮我搞一下这个。",
      "</examples>",
      "",
    ].join("\n"),
  );
  const run = node("tools/lint-spec.mjs", [dir]);
  assert.equal(run.status, 0, run.stdout);
});

// ---------------------------------------------------------------- term-check.mjs

const TERM_CHECK = "skills/dialogue-naming/scripts/term-check.mjs";
const GLOSSARY = [
  "| 正式名 | 定义 | 正例 | 反例 | 不再用 | 来源 |",
  "|---|---|---|---|---|---|",
  "| 对话 | 多个 Agent 交换消息的地方 | 团队对话 | 单聊 | 房间、临时对话 | 2026-10 |",
  "| 群聊 | 即时通讯软件里的多人会话 | 微信群聊 | 对话 | 群 | 2026-10 |",
  "",
].join("\n");

function glossaryDir(t) {
  const dir = tempDir(t);
  put(join(dir, "GLOSSARY.md"), GLOSSARY);
  return dir;
}

test("term-check flags a retired name and names the official one", (t) => {
  const run = node(TERM_CHECK, ["--text", "把他拉进房间"], { cwd: glossaryDir(t), env: { DIALOGUE_GLOSSARY: "" } });
  assert.equal(run.status, 1);
  assert.equal(run.stdout.trim(), "同一律：「房间」应写作「对话」");
});

test("term-check accepts official names, quoted mentions and retired words inside an official name", (t) => {
  const cwd = glossaryDir(t);
  for (const text of ["发到这个对话里", "以前叫「房间」，现在不这么叫", "发到微信群聊"]) {
    const run = node(TERM_CHECK, ["--text", text], { cwd, env: { DIALOGUE_GLOSSARY: "" } });
    assert.equal(run.status, 0, `${text}: ${run.stdout}`);
  }
});

test("term-check reads a document with --file and does nothing without a glossary", (t) => {
  const cwd = glossaryDir(t);
  put(join(cwd, "doc.md"), "把消息发到群。\n");
  assert.equal(node(TERM_CHECK, ["--file", "doc.md"], { cwd, env: { DIALOGUE_GLOSSARY: "" } }).status, 1);
  assert.equal(node(TERM_CHECK, ["--text", "把他拉进房间"], { cwd: tempDir(t), env: { DIALOGUE_GLOSSARY: "" } }).status, 0);
});

test("the Stop hook blocks once when the last answer used a retired name, and never twice", (t) => {
  const cwd = glossaryDir(t);
  const transcript = join(cwd, "transcript.jsonl");
  const line = (type, text) => JSON.stringify({ type, message: { content: [{ type: "text", text }] } });
  put(transcript, [line("user", "之前的问题"), line("assistant", "房间"), line("user", "新的问题"), line("assistant", "我把他拉进了房间。")].join("\n") + "\n");

  const env = { DIALOGUE_GLOSSARY: "" };
  const first = node(TERM_CHECK, ["--hook-stop"], { cwd, env, input: JSON.stringify({ transcript_path: transcript }) });
  assert.equal(first.status, 0);
  const decision = JSON.parse(first.stdout);
  assert.equal(decision.decision, "block");
  assert.match(decision.reason, /「房间」应写作「对话」/);

  const second = node(TERM_CHECK, ["--hook-stop"], { cwd, env, input: JSON.stringify({ transcript_path: transcript, stop_hook_active: true }) });
  assert.deepEqual([second.status, second.stdout], [0, ""]);

  const broken = node(TERM_CHECK, ["--hook-stop"], { cwd, env, input: "not json" });
  assert.deepEqual([broken.status, broken.stdout], [0, ""]);
});

// ---------------------------------------------------------------- hooks/

test("prompt-signals adds a note only when the user's own words carry a signal", (t) => {
  const cwd = glossaryDir(t);
  // An empty home keeps the hook from finding a term checker installed on this machine.
  const home = tempDir(t);
  const env = { DIALOGUE_GLOSSARY: "", HOME: home, USERPROFILE: home };
  const hook = (prompt) => node("hooks/prompt-signals.mjs", [], { cwd, env, input: JSON.stringify({ prompt }) });

  assert.match(hook("比如登录页").stdout, /例子说明的是一类东西，不是范围/);
  assert.match(hook("把他拉进房间").stdout, /「房间」（术语表正式名「对话」）/);
  assert.equal(hook("把登录页改成蓝色").stdout, "");
  assert.equal(hook("<task-notification>比如</task-notification>").stdout, "");
  assert.equal(hook('<pasted_content id="1">比如，房间</pasted_content id="1">看一下这段').stdout, "");

  const broken = node("hooks/prompt-signals.mjs", [], { cwd, env, input: "not json" });
  assert.deepEqual([broken.status, broken.stdout], [0, ""]);
});

test("session-core prints the core rule followed by the Chinese rule", () => {
  const run = node("hooks/session-core.mjs");
  assert.equal(run.status, 0);
  assert.equal(run.stdout, `${read(root, "core/core.md").trim()}\n\n${read(root, "core/chinese.md").trim()}\n`);
});

// ---------------------------------------------------------------- install/sync.py

test("the concept library copies inside the skills match shared/concepts.md", () => {
  const shared = read(root, "shared/concepts.md");
  for (const skill of ["dialogue-naming", "dialogue-think"]) {
    assert.equal(read(root, "skills", skill, "references/concepts.md"), shared, `${skill}: run python install/sync.py`);
  }
});

test("sync installs the rule, the skills, the Codex block, the Cursor copy, the linter and the hook", (t) => {
  const home = tempDir(t);
  const out = sync(home);

  const rule = read(home, ".claude/rules/dialogue.md");
  assert.ok(rule.includes(read(root, "core/core.md").trim()), "rule file lacks core.md");
  assert.ok(!readFileSync(join(home, ".claude/rules/dialogue.md"), "utf8").includes("\r\n"), "rule file has CRLF line endings");
  for (const skill of ["dialogue-relay", "dialogue-naming", "dialogue-think"]) {
    for (const base of [".claude/skills", ".agents/skills"]) {
      assert.equal(read(home, base, skill, "SKILL.md"), read(root, "skills", skill, "SKILL.md"));
    }
  }
  const agents = read(home, ".codex/AGENTS.md");
  assert.match(agents, /^<!-- BEGIN dialogue:/);
  assert.match(agents, /<!-- END dialogue -->\n$/);
  assert.ok(existsSync(join(home, ".claude/exports/cursor-user-rules.md")));
  assert.equal(read(home, ".claude/scripts/lint-spec.mjs"), read(root, "tools/lint-spec.mjs"));
  assert.equal(read(home, ".claude/hooks/dialogue/prompt-signals.mjs"), read(root, "hooks/prompt-signals.mjs"));
  // settings.json belongs to the user: the installer prints the hook entries and writes nothing there.
  assert.ok(!existsSync(join(home, ".claude/settings.json")));
  assert.match(out, /UserPromptSubmit: node ".*prompt-signals\.mjs"/);
});

test("running sync twice changes nothing", (t) => {
  const home = tempDir(t);
  sync(home);
  const before = read(home, ".codex/AGENTS.md");
  const out = sync(home);
  assert.equal(read(home, ".codex/AGENTS.md"), before);
  assert.match(out, /cursor .*\(unchanged\)/);
});

test("sync keeps what is already in AGENTS.md and replaces only its own block", (t) => {
  const home = tempDir(t);
  put(join(home, ".codex/AGENTS.md"), "# My rules\n\nAlways run the tests.\n");
  sync(home);
  sync(home);
  const agents = read(home, ".codex/AGENTS.md");
  assert.ok(agents.startsWith("# My rules\n\nAlways run the tests.\n"));
  assert.equal(agents.split("<!-- BEGIN dialogue:").length - 1, 1);
});

test("sync moves the skills it replaces aside without deleting them", (t) => {
  const home = tempDir(t);
  put(join(home, ".claude/skills/socratic-thinking/SKILL.md"), "old skill\n");
  const out = sync(home);
  assert.ok(!existsSync(join(home, ".claude/skills/socratic-thinking")));
  assert.equal(read(home, ".claude/skills-retired/socratic-thinking-from-claude/SKILL.md"), "old skill\n");
  assert.match(out, /^retired /m);
});

test("personal rules reach Codex and Cursor: --extra-rule and ~/.claude/rules/dialogue-local.md", (t) => {
  const home = tempDir(t);
  const extra = join(home, "coaching.md");
  put(extra, "# 教练视角\n\n只在这台机器上的规则。\n");
  put(join(home, ".claude/rules/dialogue-local.md"), "# 本机记录\n\n只在这台机器上的记录。\n");
  sync(home, "--extra-rule", extra);
  for (const file of [".codex/AGENTS.md", ".claude/exports/cursor-user-rules.md"]) {
    const text = read(home, file);
    assert.ok(text.includes("只在这台机器上的规则。"), `${file} lacks the --extra-rule file`);
    assert.ok(text.includes("只在这台机器上的记录。"), `${file} lacks dialogue-local.md`);
  }
});
