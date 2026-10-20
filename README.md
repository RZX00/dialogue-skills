# socratic-skills

让 Claude Code、Codex 里的 Agent 把话说准、转述不走样，你说不清时陪你想清楚。

<p align="center">
  <img src="./docs/assets/banner.jpg" alt="陶罐画风格的头图：左边坐着的哲人伸出双手，递出一团乱线；线在中间理成一条直线，连着三个圆点，右边站着的人手托下巴在听；上方写着 SOCRATIC SKILLS 和 Rules for clear intent" width="100%" />
</p>

## 实际效果

同一个模型（claude-sonnet-5-5），同一句话，只差有没有装规则。下面是输出原文，没有改写。

**你说：「首页不够专业，改一下。」**（附一页首页 HTML）

不带规则：

> 我把页面改成了更克制的风格：统一的蓝色主色、系统字体、卡片式功能区，去掉了虚线边框、Comic Sans 和感叹号，并加了响应式布局。文案保留，只去掉了"最强神器"这类夸张说法。

带规则：

> 已按"与常见财务类 SaaS 官网相比，配色过多、装饰过重、用语夸张"改写首页。原话"不够专业"没有指明比较对象，若你有对标页面，请给出名称。

「不够专业」没说和谁比。带规则的输出先写明按什么标准改，并请你给出对标页面。不带规则的输出只说改成「更克制的风格」，没说和谁比；它还说「文案保留」，页面里却新增了原稿没有的「把月底对账的时间，还给真正的工作。」

**你说：「跟开发说，有两个用户问过导出 CSV，这周排得开就做一个。」**

不带规则（第 1 次）：

> 这周如果排期允许，想请你排一个导出 CSV 的功能。目前有两位用户专门问过这个需求。不算紧急，有空档时做就行。

带规则：

> 用户称有两个用户问过能否导出 CSV。若本周排得开，请做一个 CSV 导出功能。排不开时怎么处理，用户未说明。

你没说「不算紧急」，不带规则的两次输出里都写了；带规则的输出保留了「两个」和「排得开」，并写明用户没说的事项。

样本很小：首页例子每边 1 次；转述例子不带规则 2 次、带规则 1 次，完整记录都在 [`docs/examples/`](./docs/examples/)。这是在模型接口上直接放入规则文本跑的，不是完整的 Agent 会话；首页是为评测写的合成页面，不是真实网站。〔待补：Claude Code 里的真实会话截图〕

## 状态与限制

- **能用在哪**：Claude Code、Codex。作者在本机确认过这两个宿主会加载常驻规则（Claude Code 读 `~/.claude/rules/dialogue.md`，Codex 读 `~/.codex/AGENTS.md` 里的一段）。Cursor 只生成一份供粘贴的副本，未测试，不列为支持。
- **语言**：规则正文和评测用例都是中文；英文对话未测试。
- **只管准确**：规则取准确、舍文采（规则 3.1），不适合要文案润色或营销腔调的场景。
- **占用**：常驻规则每个会话占约 1,900 token（按 claude-sonnet-5-5 的用量实测）；加载 `dialogue-relay` 再占约 2,300 token。
- **读写哪些文件、联不联网**：安装脚本写入 `~/.claude`、`~/.agents`、`~/.codex` 下的文件，清单见 [`docs/install.md`](./docs/install.md)；`dialogue-naming` 在你确认名称后写项目的 `docs/glossary.md`。钩子和脚本运行时不联网、不需要凭据；只有安装脚本会从 GitHub 下载本仓库。
- **验证范围**：`install/sync.py` 在 Windows 11、Python 3.13 上用 `--home` 临时目录跑通；`install.sh` 和 `install.ps1` 没有逐个实测〔待核〕。
- **维护**：个人项目，当前版本 3.1.0，没有发布 release；问题请提 Issue。许可证 MIT。

## 安装

前置条件：Python 3（安装脚本用）；Node.js 可选（钩子和术语检查脚本用）。

**推荐**：把这句话发给你的 Agent，它会按 [`docs/install.md`](./docs/install.md) 装到正确的位置。

```text
帮我安装 socratic-skills：https://raw.githubusercontent.com/RZX00/socratic-skills/main/docs/install.md
```

自己装，一条命令（Claude Code 和 Codex 都适用）：

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/RZX00/socratic-skills/main/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/RZX00/socratic-skills/main/install.ps1 | iex
```

装完开一个新会话。

只用 Claude Code、不想跑脚本时，可以装插件（插件名叫 `dialogue`）：

```text
/plugin marketplace add RZX00/socratic-skills
/plugin install dialogue@socratic-skills
```

插件不能放规则文件，所以由会话开始时运行的钩子注入常驻规则。脚本和插件不要同时用，否则规则加载两次。插件清单已通过 `claude plugin validate`（1 条警告），没有在干净环境逐步安装过〔待核〕。

## 第一次使用

开新会话后，常驻规则自动生效，不用点名。三个技能点名更可靠：据 Claude Code 文档，技能列表有字数预算，描述被省略时，不点名的请求可能被别的技能接走。

对 Agent 说：

```text
用 dialogue-relay，跟开发说：有两个用户问过导出 CSV，这周排得开就做一个。
```

你会得到：一段可以直接转给开发的话，保留「两个」和「排得开」，没有加你没说的催促或截止时间；你没说的事项标「用户未说明」。上面「实际效果」里带规则的那段输出属于同一类结果。

另外两个技能，预期行为取自 [`evals/behavior.md`](./evals/behavior.md) 的评测标准：

| 对 Agent 说 | 预期 |
|---|---|
| `用 dialogue-naming，统一一下文档里「房间」「群」「对话」的叫法` | 先确认三个词是否同指，再出一张术语卡请你定；不直接全局替换 |
| `用 dialogue-think，我说不清我们的产品到底好在哪` | 第一问是问一件具体发生过的事，一轮只问一个，不给候选说法 |

## 为什么用它

上面不带规则的输出，改首页时没说和谁比，替你转话时补上了你没说的「不算紧急」。本仓库把这两类做法写成可检查的条款：改完点明标准，转述保留量词、条件和语气。条款的依据和争议见 [`shared/concepts.md`](./shared/concepts.md)。

## 能力与工作原理

技能只在模型判断相关时加载，而「准确表达」每一轮都要用。所以每轮都要守的部分放在常驻规则里，只在特定情形下用的部分做成技能，能机械检查的交给钩子。

| 层 | 文件 | 生效方式 |
|---|---|---|
| 常驻规则 | `core/core.md`、`core/chinese.md` | 每个会话加载；规则第 7 章写明何时加载哪个技能 |
| 情境技能 | `skills/dialogue-relay`、`skills/dialogue-naming`、`skills/dialogue-think` | 模型判断相关时加载 |
| 参考资料 | `shared/concepts.md`，安装时复制进需要它的技能 | 技能指明时读取 |
| 钩子 | `hooks/prompt-signals.mjs`、`skills/dialogue-naming/scripts/term-check.mjs` | 用户发消息时、每次答复结束时 |

三个技能各管一件事：

| 技能 | 管什么 | 何时加载 |
|---|---|---|
| `dialogue-relay` | 替你向别人或别的 Agent 转述、委派；依据别人转来的话行动 | 你说「跟某某说」「转告」「帮我回他」「让 Codex 看一下」时 |
| `dialogue-naming` | 给新概念命名、写定义、维护术语表，一个对象只有一个名字 | 新功能、指标、角色需要命名，或同一对象出现两个名字时 |
| `dialogue-think` | 想法没成形时一起想；判断权归你 | 你说「一起想想」「我说不清」，或在同一问题上反复没进展时 |

钩子只在有具体信号时才输出：你在举例，或用了术语表里已停用的名称。

### 配置

- 术语表放在项目的 `docs/glossary.md` 或根目录的 `GLOSSARY.md`；环境变量 `DIALOGUE_GLOSSARY` 指向的文件可再加一份跨项目的个人术语表。
- 钩子由你自己加进 `settings.json`；安装脚本末尾会打印两条配置，不会替你改。
- `install/sync.py --home <目录>` 先装到测试目录看结果；`--extra-rule <文件>` 把你自己的常驻规则一并同步到 Codex 和 Cursor。
- 从旧的 `socratic-thinking` 升级：脚本会把它和 `socratic-coding` 移到 `~/.claude/skills-retired/`，不删除。原「轻档」并入了常驻规则，「深档」成为 `dialogue-think`。
- 卸载：见 [`docs/install.md`](./docs/install.md) 第 6 章。

### 检验

- 触发：`evals/triggers/` 下每个技能 20 句，一半应触发，一半听起来相近但不应触发。每句运行 3 次，按 6:4 分为调整组和检验组，只用调整组的失败修改描述，按检验组的通过率选版本，至多 5 轮（方法见 agentskills.io 的描述优化指南）。
- 行为：`evals/behavior.md` 的七个场景，安装与不安装各运行三次，由人评判。
- 前后对比：`evals/compare.mjs` 用同一个模型、同一句话，跑「不带规则」和「带规则」各一次，并生成 [`docs/examples/`](./docs/examples/) 下的记录。需要自备 OpenAI 兼容接口的地址和密钥。

### 撰写约定

`core/` 和 `skills/` 中的文本供 Agent 执行，采用标准化文件体例（GB/T 1.1-2020）：依次写范围、术语和定义、要求；要求条款使用能愿动词「应 / 宜 / 可」；理由写在「注」中；示例放在 `<examples>` 中，示例中的用户话语可以保留口语。修改后运行：

```bash
node tools/lint-spec.mjs core skills shared
```

它检查要求条款是否带能愿动词、正文是否有口语词和全大写强调、技能的 name 与 description 是否符合 Agent Skills 规范。

## 出发点

<details>
<summary>语言在对话里做的三件事，以及由此得出的四条原则</summary>

语言在对话里做三件事，每条规则都从这里推出来：

1. **语言完成思想。** 想法是在找到词、排成话的过程中成形的（Vygotsky 1934）。给人一个准确的现成术语，就是给他一件思考工具。
2. **说话就是做事。** 一句话在世界里做一个动作（Austin 1962）；断言等于说话人承诺「我认这句话、我能给理由」（Brandom 1994）；一个名字被一群人接受，就成了约定（Searle 1995）。所以转述要保持承诺不变，命名要先定准、定了不换。
3. **能传过去的只有公共的东西。** 私有的图景传不过去（Frege 1892；Wittgenstein《哲学研究》§243 起）；接收方用自己已有的知识把意思重建出来（Reddy 1979）。所以要把含糊的词拆成维度、换成现成术语，用接收方懂的词，并以接收方据此采取的行动判断是否传达成功。

另有一条管时机：精确只在一句话要被照着执行时才需要（Wittgenstein §87；Waismann 1945 的开放结构）。

由此得出四条原则：只求准确，不求文采（严复所说的信、达，不要雅）；补充的内容必须可追溯到对方的原话、决定或已定术语；精确只在可执行陈述上要求；Agent 是对话中用词更稳定的一方，其用词对用户有示范作用（Pickering & Garrod 2004）。

各项原则和做法的出处、证据强弱和争议见 [`shared/concepts.md`](./shared/concepts.md)。其中标〔未核〕的条目来自二手转述，引用前应先核对原文。

</details>

## 许可证

MIT，详见 [`LICENSE`](./LICENSE)。
