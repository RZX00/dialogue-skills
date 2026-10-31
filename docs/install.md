# 安装说明（供 Agent 执行）

## 1 范围

本文件供 Agent 在用户要求安装 dialogue-skills 时执行。安装内容是一条常驻规则和三个技能：`dialogue-relay`、`dialogue-naming`、`dialogue-think`。

## 2 术语和定义

2.1 常驻规则：每个会话开始时加载的规则文本，由 `core/core.md` 和 `core/chinese.md` 拼成。

2.2 安装脚本：`install/sync.py`。`install.sh`（macOS / Linux）和 `install.ps1`（Windows）先下载本仓库，再运行它。

2.3 标记段：安装脚本写入 `~/.codex/AGENTS.md` 的一段文本，以 `<!-- BEGIN dialogue` 开头，以 `<!-- END dialogue -->` 结尾。

## 3 前置条件

3.1 应先确认已安装 Python 3：macOS / Linux 运行 `python3 --version`，Windows 运行 `python --version` 或 `py --version`。未安装时，应告知用户并停止，不应自行安装 Python。

3.2 宜确认已安装 Node.js。钩子和 `term-check.mjs` 需要它；常驻规则和技能不需要。

## 4 安装步骤

4.1 应先问清用户使用的宿主。已测试的宿主是 Claude Code 和 Codex。Cursor 只会得到一份供粘贴的规则副本，本仓库未测试，应如实告知用户。

4.2 应在运行前向用户列出将写入的位置：

| 位置 | 内容 |
|---|---|
| `~/.claude/rules/dialogue.md` | 常驻规则（Claude Code 每个会话自动加载） |
| `~/.claude/skills/dialogue-*`、`~/.agents/skills/dialogue-*` | 三个技能 |
| `~/.codex/AGENTS.md` | 常驻规则的标记段；标记段以外的内容不改 |
| `~/.claude/exports/cursor-user-rules.md` | 供粘贴到 Cursor User Rules 的副本 |
| `~/.claude/scripts/lint-spec.mjs` | 撰写规则文本用的检查脚本 |
| `~/.claude/hooks/dialogue/prompt-signals.mjs` | 钩子脚本，只复制，不启用 |
| `~/.claude/skills-retired/` | 旧的 `socratic-thinking`、`socratic-coding` 存在时，移到这里，不删除 |

4.3 应选择下列一种方式，不应同时使用，否则常驻规则会加载两次。

方式 A（脚本，推荐；Claude Code 和 Codex 都适用）：

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/RZX00/dialogue-skills/main/install.sh | bash
```

```powershell
# Windows PowerShell
irm https://raw.githubusercontent.com/RZX00/dialogue-skills/main/install.ps1 | iex
```

用户想先看结果时，可克隆本仓库后运行 `python install/sync.py --home <临时目录>`，内容装到该目录而不是用户主目录。

方式 B（仅 Claude Code，插件）：

```text
/plugin marketplace add RZX00/dialogue-skills
/plugin install dialogue@dialogue-skills
```

注：插件不能携带规则文件，由会话开始时运行的钩子注入常驻规则。

4.4 脚本末尾打印两条钩子配置。应把它们展示给用户；不应自行修改 `settings.json`，用户同意后再添加。

## 5 验证

5.1 应提示用户开一个新会话，常驻规则和技能在会话开始时加载。

5.2 新会话中，应确认三个技能在技能列表里，并确认常驻规则已加载：Claude Code 看 `~/.claude/rules/dialogue.md` 是否存在，Codex 看 `~/.codex/AGENTS.md` 是否含标记段。

5.3 应把第一句可用的话告诉用户，见示例。

## 6 卸载

6.1 应删除 4.2 表中的前三行内容，并从 `~/.codex/AGENTS.md` 删去标记段（含两行标记）。`lint-spec.mjs` 可能被其他规则文本使用，宜保留。

## 7 示例

<examples>
<example>
用户：帮我安装 dialogue-skills。
Agent：先确认 Python 3 已装好，再问用户用 Claude Code 还是 Codex，随后列出将写入的位置。用户同意后运行方式 A 的命令，把末尾的两条钩子配置展示给用户，等用户决定是否添加。最后说：「请开一个新会话，然后对我说：用 dialogue-relay，跟开发说，有两个用户问过导出 CSV，这周排得开就做一个。」
</example>
</examples>
