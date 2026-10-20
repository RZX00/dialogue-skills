# 对比记录：场景一：含糊的评价词「不够专业」

对应 evals/behavior.md 场景一。同一句用户请求，同一个模型，只差有没有规则。每个配置只调用一次，没有挑选、没有重试；模型输出有随机性，一次结果不代表通则。

## 运行条件

- 日期：2026-10-20
- 模型：`claude-sonnet-5-5`（接口返回的 model 字段：`claude-sonnet-5-5`）
- 接口：OpenAI 兼容的 chat/completions；temperature 用模型默认值，max_tokens 4000
- 不带规则：只有下面这条用户消息，没有 system prompt
- 带规则：system prompt 是这些文件的正文，按 `install/sync.py` 的拼法拼成，共 2295 个字符，sha256 前 12 位 `b261df36164b`：`core/core.md`、`core/chinese.md`（本场景不触发情境技能，所以只有常驻规则）
- 原始请求和响应：`docs/examples/raw/2026-10-20-homepage-claude-sonnet-5-5.*.json`；复现命令见 `evals/compare.mjs` 文件头
- 局限：这是在裸模型上放入规则文本，不是 Claude Code 或 Codex 的完整会话；经网关转发，「不带规则」一栏的输入 token 比用户消息本身略多，上游是否带固定前缀〔待核〕；用户消息里的示例材料是为评测写的合成输入

## 用户消息（两个配置相同）

````text
首页不够专业，改一下。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>小账本 - 自由职业者的记账工具</title>
  <style>
    body { font-family: Comic Sans MS, sans-serif; background: #fff8e1; margin: 0; }
    header { background: #ff6f00; color: white; padding: 30px; text-align: center; font-size: 40px; }
    h2 { color: #d50000; font-size: 28px; text-align: center; }
    .box { width: 600px; margin: 10px auto; padding: 18px; background: #e0f7fa; border: 3px dashed #00838f; font-size: 17px; }
    .btn { display: block; width: 200px; margin: 20px auto; padding: 14px; background: #7cb342; color: white; text-align: center; font-size: 22px; }
    footer { font-size: 11px; color: #999; text-align: center; padding: 40px; }
  </style>
</head>
<body>
  <header>小账本!!!</header>
  <h2>自由职业者的最强记账神器</h2>
  <div class="box">每笔收入、每张发票，拍照就能记。月底自动算出要交多少税。</div>
  <div class="box">支持微信、支付宝、银行卡流水导入，三分钟对完一个月的账。</div>
  <div class="box">发票到期前三天提醒你催款，不再漏收一分钱。</div>
  <a class="btn" href="/signup">立即免费注册</a>
  <footer>© 2026 小账本 · 京ICP备00000000号</footer>
</body>
</html>
```
````

## 不带规则的输出

````text
我把页面改成了更克制的风格：统一的蓝色主色、系统字体、卡片式功能区，去掉了虚线边框、Comic Sans 和感叹号，并加了响应式布局。文案保留，只去掉了"最强神器"这类夸张说法。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>小账本 - 自由职业者的记账工具</title>
  <meta name="description" content="为自由职业者设计的记账工具：拍照记账、流水导入、税费估算、发票催款提醒。">
  <style>
    :root {
      --primary: #1d4ed8;
      --primary-dark: #1e40af;
      --text: #111827;
      --muted: #4b5563;
      --border: #e5e7eb;
      --bg: #f9fafb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
      color: var(--text);
      background: var(--bg);
      line-height: 1.6;
    }
    .nav {
      background: #fff;
      border-bottom: 1px solid var(--border);
    }
    .nav-inner {
      max-width: 1040px;
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 20px; font-weight: 700; color: var(--primary); }
    .nav a.link { color: var(--muted); text-decoration: none; font-size: 15px; }
    .nav a.link:hover { color: var(--text); }

    .hero {
      background: #fff;
      text-align: center;
      padding: 80px 24px 72px;
      border-bottom: 1px solid var(--border);
    }
    .hero h1 { margin: 0 0 16px; font-size: 40px; line-height: 1.25; letter-spacing: 0.5px; }
    .hero p { margin: 0 auto 32px; max-width: 560px; font-size: 18px; color: var(--muted); }

    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: var(--primary);
      color: #fff;
      font-size: 17px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      transition: background 0.15s;
    }
    .btn:hover { background: var(--primary-dark); }
    .btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
    .hint { margin-top: 12px; font-size: 14px; color: var(--muted); }

    .features {
      max-width: 1040px;
      margin: 0 auto;
      padding: 64px 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px 24px;
    }
    .card h2 { margin: 0 0 8px; font-size: 18px; }
    .card p { margin: 0; color: var(--muted); font-size: 15px; }

    .cta { text-align: center; padding: 8px 24px 72px; }
    .cta h2 { margin: 0 0 20px; font-size: 26px; }

    footer {
      border-top: 1px solid var(--border);
      background: #fff;
      text-align: center;
      padding: 28px 24px;
      font-size: 13px;
      color: var(--muted);
    }

    @media (max-width: 600px) {
      .hero { padding: 56px 20px 48px; }
      .hero h1 { font-size: 30px; }
    }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner">
      <span class="logo">小账本</span>
      <a class="link" href="/signup">注册</a>
    </div>
  </header>

  <main>
    <section class="hero">
      <h1>自由职业者的记账工具</h1>
      <p>收入、发票、税费，一个地方理清。把月底对账的时间，还给真正的工作。</p>
      <a class="btn" href="/signup">免费注册</a>
      <div class="hint">无需绑定银行卡</div>
    </section>

    <section class="features" aria-label="核心功能">
      <article class="card">
        <h2>拍照记账</h2>
        <p>每笔收入、每张发票，拍照就能记。月底自动算出要交多少税。</p>
      </article>
      <article class="card">
        <h2>流水导入</h2>
        <p>支持微信、支付宝、银行卡流水导入，三分钟对完一个月的账。</p>
      </article>
      <article class="card">
        <h2>催款提醒</h2>
        <p>发票到期前三天提醒你催款，不再漏收一分钱。</p>
      </article>
    </section>

    <section class="cta">
      <h2>现在开始整理你的账目</h2>
      <a class="btn" href="/signup">免费注册</a>
    </section>
  </main>

  <footer>© 2026 小账本 · 京ICP备00000000号</footer>
</body>
</html>
```

有两点我自己定了，你可以改：
- "无需绑定银行卡"是我加的提示语，如果与实际注册流程不符，请删掉。
- 顶部导航暂时只有"注册"，如果有登录、定价等页面，可以补上。

你没给文件路径，所以我没有直接写入文件。告诉我路径，我可以直接替换。
````

## 带规则的输出

````text
已按"与常见财务类 SaaS 官网相比，配色过多、装饰过重、用语夸张"改写首页。原话"不够专业"没有指明比较对象，若你有对标页面，请给出名称。我未在浏览器中渲染，对比度数值按色值计算，视觉效果未核实。

主要改动：

- 字体：Comic Sans 改为系统无衬线字体栈。
- 配色：原有橙、红、青、绿、米黄五种高饱和色，收敛为一个深蓝主色加中性灰。
- 装饰：去掉虚线边框和感叹号，卡片改为白底细边框。
- 文案：「最强记账神器」改为「为自由职业者设计的记账工具」，描述其功能而非自我评价。
- 可读性：页脚文字 #999 对白底对比度约 2.8:1，改为 #6b7280（约 4.8:1）；白字配 #ff6f00 的对比度不足，随主色一并替换。
- 布局：固定 600px 宽改为 max-width，窄屏下不再横向溢出。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>小账本 - 自由职业者的记账工具</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f9fafb;
      color: #111827;
      margin: 0;
      line-height: 1.6;
    }
    header {
      background: #1d4ed8;
      color: #fff;
      padding: 24px 16px;
      text-align: center;
      font-size: 28px;
      font-weight: 600;
    }
    h1 {
      font-size: 32px;
      font-weight: 600;
      text-align: center;
      margin: 48px 16px 24px;
    }
    .box {
      max-width: 640px;
      margin: 12px auto;
      padding: 20px 24px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
    }
    .btn {
      display: block;
      width: 200px;
      margin: 32px auto;
      padding: 12px;
      background: #1d4ed8;
      color: #fff;
      text-align: center;
      text-decoration: none;
      font-size: 18px;
      border-radius: 6px;
    }
    .btn:hover { background: #1e40af; }
    .btn:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
    footer {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      padding: 40px 16px;
    }
    @media (max-width: 680px) {
      .box { margin-left: 16px; margin-right: 16px; }
    }
  </style>
</head>
<body>
  <header>小账本</header>
  <main>
    <h1>为自由职业者设计的记账工具</h1>
    <div class="box">每笔收入、每张发票，拍照就能记。月底自动算出要交多少税。</div>
    <div class="box">支持微信、支付宝、银行卡流水导入，三分钟对完一个月的账。</div>
    <div class="box">发票到期前三天提醒你催款，不再漏收一分钱。</div>
    <a class="btn" href="/signup">免费注册</a>
  </main>
  <footer>© 2026 小账本 · 京ICP备00000000号</footer>
</body>
</html>
```

标题由 h2 改为 h1，并把正文包进 main，页面结构更符合语义。
````

## 用量与脚本判据

| 配置 | 输入 token | 输出 token | finish_reason | 脚本判据 |
|---|---|---|---|---|
| 不带规则 | 571 | 1998 | stop | 无脚本判据，由人判定 |
| 带规则 | 2473 | 1211 | stop | 无脚本判据，由人判定 |

通过标准以 evals/behavior.md 场景一 为准，表达好坏由人判定。
