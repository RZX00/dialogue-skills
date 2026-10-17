// Lints agent-facing normative text (SKILL.md, rule files) for the register this package requires:
// numbered requirement clauses carry a modal verb, no colloquial verbs or idioms, no person-specific
// pronouns, no all-caps emphasis, and Agent Skills frontmatter within spec limits.
// Example blocks and quoted user speech are exempt: examples are meant to sound like real users.
// Usage: node lint-spec.mjs <file-or-dir> [...]   exit 1 if any error
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const COLLOQUIAL = [
  "一下", "搞", "弄", "挺", "蛮", "就行", "拿出来", "卡在", "帮法", "说得通", "当真", "照念",
  "啥", "咋", "咱", "俩", "反正", "其实", "不就是", "动笔", "少一块", "往前推", "说白了", "大白话",
];
const MODAL = /应|宜|可|不必|方可|须/;
const CLAUSE = /^(\d+\.\d+|[a-e]\))\s/;

function exempt(text) {
  return text
    .replace(/<examples>[\s\S]*?<\/examples>/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/<example>[\s\S]*?<\/example>/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/`[^`\n]*`|「[^」\n]*」|“[^”\n]*”/g, (m) => " ".repeat(m.length));
}

function lintFile(path) {
  const raw = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  const problems = [];
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (basename(path) === "SKILL.md") {
    const name = fm?.[1].match(/^name:\s*(.+)$/m)?.[1].trim();
    const desc = fm?.[1].match(/^description:\s*(.+)$/m)?.[1].trim();
    if (!name || name !== basename(dirname(path))) problems.push([1, "error", "name 应与目录名一致"]);
    if (name && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push([1, "error", "name 只可含小写字母、数字和单个连字符"]);
    if (!desc) problems.push([1, "error", "缺少 description"]);
    else if (desc.length > 1024) problems.push([1, "error", `description ${desc.length} 字符，超过 1024`]);
  }
  const body = exempt(fm ? raw.replace(fm[0], (m) => m.replace(/[^\n]/g, " ")) : raw);
  // Clauses under 范围 / 术语和定义 / 示例 describe rather than require, so they need no modal verb.
  let descriptive = false;
  body.split("\n").forEach((line, i) => {
    const n = i + 1;
    const text = line.trim();
    if (!text) return;
    if (text.startsWith("#")) descriptive = /范围|术语|定义|示例/.test(text);
    for (const word of COLLOQUIAL) if (text.includes(word)) problems.push([n, "error", `口语词「${word}」`]);
    if (/\b(MUST|CRITICAL|ALWAYS|NEVER|IMPORTANT)\b/.test(text)) problems.push([n, "warn", "全大写强调；宜改为说明理由"]);
    if (/[他我]/.test(text.replace(/其他|他人|他们|我们/g, ""))) problems.push([n, "warn", "出现「他」「我」；规范正文宜用「用户」「Agent」「接收方」"]);
    const clause = text.replace(/^-\s*/, "");
    if (!descriptive && CLAUSE.test(clause) && !MODAL.test(clause)) {
      problems.push([n, "error", "要求条款缺少能愿动词（应、宜、可、不必）"]);
    }
  });
  return problems;
}

function files(target) {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target, { recursive: true })
    .map((p) => join(target, String(p)))
    .filter((p) => p.endsWith(".md") && statSync(p).isFile());
}

let errors = 0;
for (const target of process.argv.slice(2)) {
  for (const path of files(target)) {
    for (const [line, level, msg] of lintFile(path)) {
      if (level === "error") errors++;
      console.log(`${path}:${line}: ${level}: ${msg}`);
    }
  }
}
process.exit(errors ? 1 : 0);
