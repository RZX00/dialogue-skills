// 前后对比：同一句用户请求，同一模型，分别在「无 system prompt」和「带规则」两种配置下各调用一次，
// 原样保存请求和响应，并生成 docs/examples/ 下的对比记录。每个配置调用一次，不重试。
//
// 用法（OpenAI 兼容的 chat/completions 接口）：
//   LLM_BASE_URL=https://.../v1 LLM_API_KEY=... LLM_MODEL=... [LLM_TEMPERATURE=0] node evals/compare.mjs <场景> [--only baseline|with-rules] [--date YYYY-MM-DD]
// LLM_TEMPERATURE 不设时用模型默认值；有的模型（如 claude-sonnet-5-5）拒绝非默认值。
// 场景：homepage（evals/behavior.md 场景一）、relay（场景二）
//
// 「带规则」的 system prompt = install/sync.py 写入 ~/.claude/rules/dialogue.md 的那份常驻规则，
// 加上规则第 7 章要求加载的技能正文（去掉 frontmatter）。这是在裸模型上复现规则文本，不是完整的 Agent 会话。
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const SCENARIOS = {
  homepage: {
    title: "场景一：含糊的评价词「不够专业」",
    synthetic: true,
    behavior: "evals/behavior.md 场景一",
    user: () => `首页不够专业，改一下。\n\n\`\`\`html\n${read("evals/inputs/homepage.html").trimEnd()}\n\`\`\``,
    skills: [],
    check: null,
  },
  relay: {
    title: "场景二：转述时保留量词和条件",
    behavior: "evals/behavior.md 场景二",
    user: () => "跟开发说，有两个用户问过导出 CSV，这周排得开就做一个。",
    skills: ["dialogue-relay"],
    // behavior.md 写明这一场景可用脚本判：输出里同时出现「两个」和「排得开」
    check: (text) => ["两个", "排得开"].map((k) => [k, text.includes(k)]),
  },
};

const args = process.argv.slice(2);
const name = args.find((a) => SCENARIOS[a]);
const opt = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
if (!name) {
  console.error(`用法：node evals/compare.mjs <${Object.keys(SCENARIOS).join("|")}> [--only baseline|with-rules] [--date YYYY-MM-DD]`);
  process.exit(2);
}
const { LLM_BASE_URL: base, LLM_API_KEY: key, LLM_MODEL: model } = process.env;
if (!base || !key || !model) {
  console.error("需要环境变量 LLM_BASE_URL、LLM_API_KEY、LLM_MODEL");
  process.exit(2);
}
const date = opt("--date") ?? new Date().toISOString().slice(0, 10);
const only = opt("--only");
const sc = SCENARIOS[name];

// 与 install/sync.py 的 rule 拼法一致：core + 下调一级标题的 chinese
const demote = (t, n) => t.replace(/^(#{1,5}) /gm, (_, h) => "#".repeat(h.length + n) + " ");
const rule = `${read("core/core.md").trim()}\n\n${demote(read("core/chinese.md").trim(), 1)}\n`;
const skillBody = (s) => read(`skills/${s}/SKILL.md`).replace(/^---\n[\s\S]*?\n---\n/, "").trim();
const withRulesSystem = [rule.trim(), ...sc.skills.map((s) => `# 已加载的技能：${s}\n\n${skillBody(s)}`)].join("\n\n");
const sources = ["core/core.md", "core/chinese.md", ...sc.skills.map((s) => `skills/${s}/SKILL.md`)];

const user = sc.user();
const params = { model, ...(process.env.LLM_TEMPERATURE ? { temperature: Number(process.env.LLM_TEMPERATURE) } : {}), max_tokens: 4000 };
const configs = {
  baseline: [{ role: "user", content: user }],
  "with-rules": [{ role: "system", content: withRulesSystem }, { role: "user", content: user }],
};

const slug = model.replace(/[^\w.-]+/g, "-");
const stem = `${date}-${name}-${slug}`;
mkdirSync(join(root, "docs/examples/raw"), { recursive: true });
const result = {};

for (const [cfg, messages] of Object.entries(configs)) {
  if (only && only !== cfg) continue;
  const request = { ...params, messages };
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(request),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`${cfg}: HTTP ${res.status}\n${body.slice(0, 500)}`);
    process.exit(1);
  }
  const json = JSON.parse(body);
  // 网关的响应里还有余额、路由等账户信息，不能进公开仓库；只存模型名、输出和 token 用量
  const kept = Object.fromEntries(["id", "model", "created", "object", "choices", "usage"].filter((k) => k in json).map((k) => [k, json[k]]));
  writeFileSync(join(root, `docs/examples/raw/${stem}.${cfg}.request.json`), JSON.stringify(request, null, 2) + "\n");
  writeFileSync(join(root, `docs/examples/raw/${stem}.${cfg}.response.json`), JSON.stringify(kept, null, 2) + "\n");
  result[cfg] = { text: json.choices[0].message.content ?? "", usage: json.usage, finish: json.choices[0].finish_reason, model: json.model };
  console.log(`${cfg}: ok, ${JSON.stringify(json.usage)}`);
}

if (!result.baseline || !result["with-rules"]) process.exit(0);

// 围栏长度取比内容里最长的反引号串多一个，保证原文原样放进代码块
const fence = (t) => {
  const longest = Math.max(2, ...[...t.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(longest + 1);
  return `${f}text\n${t.trimEnd()}\n${f}`;
};
const sha = createHash("sha256").update(withRulesSystem).digest("hex").slice(0, 12);
const checkLine = (cfg) =>
  sc.check ? sc.check(result[cfg].text).map(([k, ok]) => `「${k}」${ok ? "有" : "无"}`).join("，") : "无脚本判据，由人判定";
// 网关返回 Anthropic 风格的用量：输入 = prompt_tokens + 缓存读 + 缓存写
const inputTokens = (u) => (u ? (u.prompt_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : "?");
const row = (cfg, label) =>
  `| ${label} | ${inputTokens(result[cfg].usage)} | ${result[cfg].usage?.completion_tokens ?? "?"} | ${result[cfg].finish} | ${checkLine(cfg)} |`;

const md = `# 对比记录：${sc.title}

对应 ${sc.behavior}。同一句用户请求，同一个模型，只差有没有规则。每个配置只调用一次，没有挑选、没有重试；模型输出有随机性，一次结果不代表通则。

## 运行条件

- 日期：${date}
- 模型：\`${model}\`（接口返回的 model 字段：\`${result.baseline.model}\`）
- 接口：OpenAI 兼容的 chat/completions；temperature ${params.temperature ?? "用模型默认值"}，max_tokens ${params.max_tokens}
- 不带规则：只有下面这条用户消息，没有 system prompt
- 带规则：system prompt 是这些文件的正文，按 \`install/sync.py\` 的拼法拼成，共 ${withRulesSystem.length} 个字符，sha256 前 12 位 \`${sha}\`：${sources.map((s) => `\`${s}\``).join("、")}${sc.skills.length ? `（技能按规则第 7 章的要求加载，去掉了 frontmatter）` : "（本场景不触发情境技能，所以只有常驻规则）"}
- 原始请求和响应：\`docs/examples/raw/${stem}.*.json\`；复现命令见 \`evals/compare.mjs\` 文件头
- 局限：这是在裸模型上放入规则文本，不是 Claude Code 或 Codex 的完整会话；经网关转发，「不带规则」一栏的输入 token 比用户消息本身略多，上游是否带固定前缀〔待核〕${sc.synthetic ? "；用户消息里的示例材料是为评测写的合成输入" : ""}

## 用户消息（两个配置相同）

${fence(user)}

## 不带规则的输出

${fence(result.baseline.text)}

## 带规则的输出

${fence(result["with-rules"].text)}

## 用量与脚本判据

| 配置 | 输入 token | 输出 token | finish_reason | 脚本判据 |
|---|---|---|---|---|
${row("baseline", "不带规则")}
${row("with-rules", "带规则")}

通过标准以 ${sc.behavior} 为准，表达好坏由人判定。
`;
writeFileSync(join(root, `docs/examples/${stem}.md`), md);
console.log(`wrote docs/examples/${stem}.md`);
