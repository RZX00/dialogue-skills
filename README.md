# socratic-skills · dialogue

![Socratic Thinking](assets/banner.png)

Language rules for AI agents that exchange intent with people. An always-on core rule governs how an agent writes for people and reads what they say; three situational skills cover relaying on a user's behalf, naming concepts, and thinking through ideas that have not yet formed. Works with Claude Code, Codex, Cursor and other tools that read the Agent Skills format. The rules are written in Chinese.

一组给 AI Agent 用的语言规范，管四件事：Agent 怎样对人说话，怎样读懂人的话，怎样替人对别人说话，怎样和人一起把还没成形的想法想清楚。本版（3.0）取代原来的 socratic-thinking：原技能的「轻档」并入常驻规则，「深档」成为 `dialogue-think`。

## 出发点

语言在对话里做三件事，每条规则都从这里推出来：

1. **语言完成思想。** 想法是在找到词、排成话的过程中成形的（Vygotsky 1934）。给人一个准确的现成术语，就是给他一件思考工具。
2. **说话就是做事。** 一句话在世界里做一个动作（Austin 1962）；断言等于说话人承诺「我认这句话、我能给理由」（Brandom 1994）；一个名字被一群人接受，就成了约定（Searle 1995）。所以转述要保持承诺不变，命名要先定准、定了不换。
3. **能传过去的只有公共的东西。** 私有的图景传不过去（Frege 1892；Wittgenstein《哲学研究》§243 起）；接收方用自己已有的知识把意思重建出来（Reddy 1979）。所以要把含糊的词拆成维度、换成现成术语，用接收方懂的词，并以接收方据此采取的行动判断是否传达成功。

另有一条管时机：精确只在一句话要被照着执行时才需要（Wittgenstein §87；Waismann 1945 的开放结构）。

由此得出四条原则：只求准确，不求文采（严复所说的信、达，不要雅）；补充的内容必须可追溯到对方的原话、决定或已定术语；精确只在可执行陈述上要求；Agent 是对话中用词更稳定的一方，其用词对用户有示范作用（Pickering & Garrod 2004）。

## 结构

技能只在模型判断相关时加载，而「准确表达」每一轮都要用。因此每轮都要遵守的部分放在常驻规则里，只在特定情形下用的部分做成技能，能机械检查的交给钩子。

| 层 | 文件 | 生效方式 |
|---|---|---|
| 常驻规则 | `core/core.md`、`core/chinese.md` | 每个会话加载；规则第 7 章写明何时加载哪个技能 |
| 情境技能 | `skills/dialogue-relay`（代理转述）、`skills/dialogue-naming`（概念命名）、`skills/dialogue-think`（共同思考） | 模型判断相关时加载 |
| 参考资料 | `shared/concepts.md`，安装时复制进需要它的技能 | 技能指明时读取 |
| 钩子 | `hooks/prompt-signals.mjs`、`skills/dialogue-naming/scripts/term-check.mjs` | 用户发消息时、每次答复结束时 |

钩子只在有具体信号时才输出：用户在举例，或使用了术语表中已停用的名称。

## 安装

**方式一：一键脚本（Claude Code、Codex、Cursor）。** 需要 Python 3。

macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/RZX00/socratic-skills/main/install.sh | bash
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/RZX00/socratic-skills/main/install.ps1 | iex
```

脚本运行 `install/sync.py`，完成六件事：

1. 把常驻规则写入 `~/.claude/rules/dialogue.md`。
2. 把三个技能装到 `~/.claude/skills/` 和 `~/.agents/skills/`，并把旧的 `socratic-thinking`、`socratic-coding` 移到 `~/.claude/skills-retired/`。
3. 把常驻规则写进 `~/.codex/AGENTS.md` 的一个标记段。
4. 生成供 Cursor User Rules 粘贴的副本 `~/.claude/exports/cursor-user-rules.md`。
5. 安装检查工具 `~/.claude/scripts/lint-spec.mjs`。
6. 打印两条可加入 Claude Code `settings.json` 的钩子。

`--home <目录>` 可先装到测试目录查看结果；`--extra-rule <文件>` 可把你自己的常驻规则一并同步到 Codex 和 Cursor。

**方式二：Claude Code 插件。**

```
/plugin marketplace add RZX00/socratic-skills
/plugin install dialogue@socratic-skills
```

插件不能安装规则文件，所以由一个会话开始时运行的钩子注入常驻规则。不要同时使用两种方式，否则规则会加载两次。

术语表放在项目的 `docs/glossary.md` 或根目录的 `GLOSSARY.md`；设置环境变量 `DIALOGUE_GLOSSARY` 可再加一份跨项目的个人术语表。

## 检验

- 触发：`evals/triggers/` 下每个技能 20 句，一半应触发，一半听起来相近但不应触发。每句运行 3 次，按 6:4 分为调整组和检验组，只用调整组的失败修改描述，按检验组的通过率选版本，至多 5 轮（方法见 agentskills.io 的描述优化指南）。
- 行为：`evals/behavior.md` 的六个场景，安装与不安装各运行三次，由人评判。

## 撰写约定

`core/` 和 `skills/` 中的文本供 Agent 执行，采用标准化文件体例（GB/T 1.1-2020）：依次写范围、术语和定义、要求；要求条款使用能愿动词「应 / 宜 / 可」；理由写在「注」中；示例放在 `<examples>` 中，示例中的用户话语可以保留口语。修改后运行：

```bash
node tools/lint-spec.mjs core skills shared
```

它检查要求条款是否带能愿动词、正文是否有口语词和全大写强调、技能的 name 与 description 是否符合 Agent Skills 规范。

## 出处

各项原则和做法的出处、证据强弱和争议见 `shared/concepts.md`。其中标〔未核〕的条目来自二手转述，引用前应先核对原文。

## 许可

MIT
