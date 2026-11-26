/**
 * Orzi Apps Bilingual Engine (English <-> Simplified Chinese).
 * Auto-detects Chinese browsers on first visit and provides an instant EN / 中文 nav toggle.
 */
(() => {
  const STORAGE_KEY = 'orzi_site_lang';

  const ZH_MAP = new Map([
    // Global nav & footer
    ['All Apps', '全部产品'],
    ['Privacy', '隐私政策'],
    ['Privacy Policy', '隐私政策'],
    ['Terms', '服务条款'],
    ['Terms & Refunds', '条款与退款'],
    ['Terms & 14-Day Refund Policy', '服务条款与 14 天退款保障'],
    ['Support', '问题反馈'],
    ['Features', '核心功能'],
    ['Pricing', '价格方案'],
    ['Screenshot Redactor', '截图打码工具'],
    ['Free Redactor Tool', '免费截图打码'],
    ['Prompt Scrubber', '提示词脱敏'],
    ['OKLCH & WCAG Tool', 'OKLCH 与对比度工具'],
    ['CSS → Tailwind', 'CSS → Tailwind'],
    ['OKLCH & WCAG', 'OKLCH 对比度'],
    ['by Orzi Apps', '· Orzi Apps 出品'],

    // Homepage (apps.orzi.me/)
    ['Independent Software Studio · Local-First · No Subscriptions', '独立软件工作室 · 100% 本地优先 · 拒绝月费订阅'],
    ['Small, Sharp Tools for Web Developers & AI Builders.', '为前端开发者与 AI 创作者打造的轻量高效工具。'],
    ['Orzi Apps builds focused browser extensions and developer utilities that run 100% locally in your browser—no telemetry, no bloated cloud accounts, and fair one-time Pro licenses backed by a 14-day refund guarantee.', 'Orzi Apps 专注打造 100% 在本地浏览器运行的高效扩展与开发工具——零遥测、免注册云账号、透明的一次性买断定价，并提供 14 天无理由退款保障。'],
    ['Explore DemoCloak', '了解 DemoCloak'],
    ['Explore SpecQuill', '了解 SpecQuill'],
    ['Free Screenshot Redactor', '免费本地截图打码'],
    ['Software Catalog', '产品目录'],
    ['Live on Chrome & Edge · v1.0', '已上架 Chrome 与 Edge 商店 · 支持 8 国语言'],
    ['DemoCloak — Screen Share Privacy Blur & Demo Mode', 'DemoCloak — 录屏/共享屏幕隐私模糊与假数据演示模式'],
    ['launch one-time (normally $39)', '首发买断价（原价 $39）'],
    ['Auto-detect & protect emails, Stripe/OpenAI/GitHub/AWS keys, revenue & cards', '自动识别并保护邮箱、Stripe/OpenAI/GitHub/AWS 密钥、营收金额与银行卡'],
    ['1-click Demo Data Mode: swap real numbers & emails into clean realistic placeholders', '一键「逼真假数据模式」：原地替换真实金额与客户邮箱，录屏演示清晰不糊屏'],
    ['Unlimited free Click-to-Blur, Draw Blur Boxes & Alt+Shift+B Panic Privacy Veil', '永久免费不限次：点击模糊元素、框选打码与 Alt+Shift+B 全屏紧急遮罩'],
    ['Auto-apply saved per-domain rules on Stripe, Gmail, AWS & CRMs + clean PNG capture', '按域名自动生效规则（Stripe/Gmail/AWS/后台）+ 一键导出脱敏清晰 PNG'],
    ['100% local execution with up to 3 device activations per Pro license', '100% 纯本地运行，单份 Pro 授权支持激活最多 3 台设备'],
    ['Add to Chrome (Free)', '免费安装 Chrome 版'],
    ['Add to Edge (Free)', '免费安装 Edge 版'],
    ['Details & $19 Pro License', '查看详情与 $19 永久版'],
    ['Live on Chrome & Edge · v1.1', '已上架 Chrome 与 Edge 商店 · 支持 8 国语言'],
    ['SpecQuill — UI Inspector, Design Tokens & Code Export', 'SpecQuill — 网页 UI 检查器、设计规范与 Tailwind 代码导出'],
    ['early bird one-time (normally $29)', '早鸟买断价（原价 $29）'],
    ['Hover any live webpage UI for dimensions, spacing redlines & WCAG AA/AAA contrast', '悬停任意网页元素即时查看尺寸、Alt 像素标尺与 WCAG AA/AAA 对比度'],
    ['Zero-bloat HTML + minimal CSS diffing (unlimited in Free tier)', '自动剔除浏览器默认冗余，导出精简 HTML + 最小 CSS（免费版不限次）'],
    ['One-click React JSX + Tailwind CSS v4 component compilation (with OKLCH & gradients)', '一键编译 React JSX + Tailwind CSS v4 类名（支持 OKLCH、渐变与毛玻璃）'],
    ['Token-budgeted coding-agent prompts, OKLCH palettes, W3C DTCG JSON & Figma Variables', '一键导出给 Cursor/Claude 用的 AI 组件规格、OKLCH 配色、W3C JSON 与 Figma 变量'],
    ['Details & $12 Pro License', '查看详情与 $12 永久版'],
    ['100% Free Local Web Tools', '100% 免费本地在线工具'],
    ['Try Our Local Utilities Right in Your Browser', '免安装，直接在浏览器本地使用'],
    ['no install · zero uploads · no ads', '免安装 · 零上传 · 无广告'],
    ['AI Prompt, JSON & Log PII Scrubber: Strip API keys, JWTs, emails, cards, IPs & revenue before pasting into ChatGPT or Claude — with 1-click local re-hydration', 'AI 提示词 / JSON / 日志敏感信息脱敏工具：发给 ChatGPT/Claude 前本地一键脱敏 API 密钥、邮箱、IP 与金额，AI 回复后一键还原'],
    ['Private Screenshot Blur & Redaction Tool (EXIF Stripper): Paste or drop any screenshot, draw blur/pixelate/blackout boxes locally, and download a clean EXIF-free PNG', '本地截图打码与去 EXIF 工具：粘贴或拖入截图，本地画框模糊/马赛克/涂黑并自动清除 EXIF 元数据导出 PNG'],
    ['CSS → Tailwind v4 & JSX Converter: Strip browser default bloat and compile clean Tailwind v4 utility classes instantly', 'CSS 转 Tailwind v4 与 React JSX 转换器：自动剔除默认样式，即时编译干净的 Tailwind v4 类名'],
    ['OKLCH & WCAG 2.1 Contrast Checker: Convert Hex/RGB to perceptual oklch(), audit AA/AAA ratios, and export Tailwind v4 @theme', 'OKLCH 与 WCAG 2.1 对比度检测器：Hex/RGB 转 oklch()，检测 AA/AAA 对比度并导出 Tailwind v4 @theme'],
    ['Open Prompt Scrubber', '打开提示词脱敏工具'],
    ['Open Screenshot Redactor', '打开截图打码工具'],
    ['Open CSS → Tailwind', '打开 CSS 转 Tailwind'],
    ['Open OKLCH & WCAG', '打开 OKLCH 检测器'],
    ['Our Principles', '我们的原则'],
    ['100% Local Processing', '100% 本地处理'],
    ['Your inspected webpages, styles, and documents stay inside your browser memory—never scraped to a third-party server.', '你检查的网页、样式与截图全部留在本地浏览器内存中，绝不上传第三方服务器。'],
    ['Pay Once, Own Forever', '一次买断，永久使用'],
    ['Utility tools should not trap you in endless monthly subscriptions. Every Pro upgrade is a single one-time payment processed via Creem.', '好用的效率工具不该用月费订阅捆绑用户。所有 Pro 升级均为通过 Creem 处理的一次性买断付款。'],
    ['14-Day No-Hassle Refunds', '14 天无忧退款'],
    ['Every paid license includes a generous free tier to test first, plus a straightforward 14-day full refund policy.', '每款产品都提供足够实用的免费版先试后买，并附带清晰透明的 14 天全额退款政策。'],

    // DemoCloak landing page
    ['Chrome & Edge Extension · 100% Local · One-Time License', 'Chrome 与 Edge 浏览器扩展 · 100% 本地运行 · 一次买断'],
    ['Hide Real Emails, Revenue & API Keys Before You Share Your Screen.', '共享屏幕、录屏与截图前，一键隐藏真实邮箱、营收与 API 密钥。'],
    ['Recording a Loom, presenting on Zoom/Google Meet, or grabbing SaaS screenshots? DemoCloak automatically detects sensitive customer emails, revenue figures, credit cards, and API keys—blurring them or swapping them in-place with realistic, deterministic Demo Data locally in your browser.', '正在录教程、开 Zoom/腾讯会议共享屏幕或截产品后台图？DemoCloak 自动识别客户邮箱、营收数字、银行卡号和 API 密钥，支持高斯模糊、纯黑涂抹，或原地一键替换为逼真一致的假数据（Demo Mode），100% 本地运行不上传。'],
    ['Get Lifetime Pro ($19 One-Time)', '获取永久 Pro 授权 ($19 买断)'],
    ['Live on Chrome Web Store & Microsoft Edge Add-ons · Free forever for unlimited Click-to-Blur, Draw Blur Boxes & Alt+Shift+B Panic Veil · 3 free daily Auto-Shield/Demo swaps · 14-day refund policy.', '已正式上架 Chrome 与 Edge 双商店（内置简体中文等 8 国语言）· 手动点击模糊/框选打码/全屏紧急遮罩永久免费不限次 · 每日 3 次免费自动脱敏/假数据转换 · 14 天退款保障。'],
    ['See DemoCloak in Action', '功能效果演示'],
    ['Realistic Demo Data Swap: Keep walkthroughs and marketing screenshots razor-sharp by replacing real revenue, emails, and secrets with clean placeholder data.', '逼真假数据模式（Demo Mode）：原地把真实营收、客户邮箱和密钥替换成自然一致的演示数据，产品演示和营销截图告别难看的马赛克。'],
    ['Click-to-Blur, Draw Boxes & Panic Veil: Blur any element or draw scroll-anchored boxes live on Zoom or Google Meet, or press Alt+Shift+B for an instant full-tab privacy veil.', '点击模糊、框选打码与紧急遮罩：会议共享时直接点选任意元素打码或拉出模糊框，遇到突发弹窗按 Alt+Shift+B 秒盖全屏。'],
    ['Auto-Apply Per-Site Rules & Honest Pricing: Save per-domain rules for Stripe, Gmail, or AWS so sensitive fields mask on load—pay once instead of monthly subscriptions.', '按站自动生效与良心买断价：给 Stripe、Gmail、AWS 等后台保存规则，打开网页即自动保护；一次买断，告别月费订阅。'],
    ['Built for Real Screen Shares, Demos & Bug Reports', '专为真实会议共享、产品演示与截图汇报打造'],
    ['Auto-PII & Secret Shield', '自动识别敏感信息与密钥'],
    ['Detects emails, Stripe/OpenAI/GitHub/AWS/Slack/JWT keys, currency amounts ($, €, £, ¥), Luhn-verified credit cards, phones, IPv4 addresses, and custom keywords or /regex/.', '自动识别邮箱、Stripe/OpenAI/GitHub/AWS/Slack/JWT 密钥、各国货币金额（$、€、£、¥）、经 Luhn 校验的银行卡、手机号、IPv4 以及自定义关键词或 /正则/。'],
    ['Deterministic Demo Mode', '一致性逼真假数据模式'],
    ['Replaces real production figures and customer emails with consistent realistic placeholders—matching your page\'s exact typography and layout—and restores original text in 1 click.', '将真实生产数据原地替换为同一页面内前后一致的逼真假数据，完全保留原排版字体与布局，并支持一键无损还原。'],
    ['Click-to-Blur & Draw Boxes', '点击模糊与自由框选'],
    ['Hover and click any element to blur or solid-redact it, or drag custom frosted boxes over charts and sidebars. Unlimited in the Free tier.', '悬停点击任意网页元素即可模糊或涂黑，也可在图表、侧边栏上方自由拖出随页面滚动的模糊框。免费版不限次。'],
    ['Auto-Apply Before Calls Start', '开会前按站自动生效'],
    ['Remember blurred selectors and Auto-Shield presets per domain (Stripe, Gmail, AWS, CRMs). Requests permission only for the specific site you choose to save.', '按域名记住打码元素与自动防护规则，下次打开后台即自动脱敏；仅为你主动保存的单个站点申请权限。'],
    ['Instant Panic Veil & Clean PNG', '一键紧急全屏遮罩与纯净截图'],
    ['Hit Alt+Shift+B if an unexpected DM or private tab appears mid-call, or click Clean PNG to download a crisp masked screenshot locally.', '共享屏幕时突然弹出私信或敏感页面？按 Alt+Shift+B 瞬间遮住整页；还可一键保存本地脱敏 PNG 截图。'],
    ['100% Local & Least-Privilege', '100% 纯本地与最小权限'],
    ['Zero page contents, emails, or screenshots ever leave your machine. No analytics, no cloud accounts, and no broad background permissions at install.', '网页内容、邮箱和截图绝不离开你的电脑。零统计追踪、免登录云账号，安装时不申请任何全网后台权限。'],
    ['Simple Pricing — Pay Once, Own Forever', '透明定价 — 一次买断，永久使用'],
    ['Free Forever', '永久免费'],
    ['DemoCloak Free', 'DemoCloak 免费版'],
    ['forever', '永久免费'],
    ['Unlimited Click-to-Blur & Solid Redact element picker', '不限次点击元素模糊与纯黑涂抹'],
    ['Unlimited custom Draw Blur Boxes', '不限次自定义框选模糊'],
    ['Instant Alt+Shift+B full-tab Panic Privacy Veil', 'Alt+Shift+B 一键全屏紧急隐私遮罩'],
    ['1-click local Clean PNG masked screenshot capture', '一键保存本地脱敏清晰 PNG 截图'],
    ['3 daily Auto-PII / Realistic Demo Mode page scans', '每日 3 次免费一键自动脱敏 / 假数据演示模式'],
    ['1 saved auto-apply domain & 2 custom keywords', '支持 1 个站点自动生效规则与 2 个自定义敏感词'],
    ['Add to Chrome — Free', '免费安装 Chrome 版'],
    ['Add to Microsoft Edge — Free', '免费安装 Microsoft Edge 版'],
    ['Launch Offer · No Subscription', '首发特惠 · 无订阅'],
    ['DemoCloak Pro', 'DemoCloak Pro 永久版'],
    ['one-time (normally $39)', '一次买断（原价 $39）'],
    ['Unlimited 1-click Auto-PII & Secret Shield scans', '无限次一键自动识别与脱敏全页'],
    ['Unlimited Realistic Demo Mode fake-data swaps', '无限次逼真假数据演示模式（Demo Mode）'],
    ['Unlimited saved Auto-Apply domains (Stripe, Gmail, AWS, CRMs)', '无限个按域名自动生效站点规则'],
    ['Unlimited custom keywords & /regex/ redaction rules', '无限个自定义敏感词与 /正则/ 脱敏规则'],
    ['Activate on up to 3 browsers/devices (Chrome, Edge, Brave, Arc)', '支持激活最多 3 台设备/浏览器（Chrome、Edge、Brave、Arc）'],
    ['7-day offline grace caching & 14-day full refund guarantee', '支持 7 天离线宽限缓存 + 14 天全额退款保障'],
    ['Buy Lifetime Pro License ($19)', '购买永久 Pro 授权 ($19)'],
    ['Install in 1 Click (Chrome, Edge, Brave & Arc)', '一键安装（支持 Chrome、Edge、Brave 与 Arc）'],
    ['Frequently Asked Questions', '常见问题'],
    ['Does DemoCloak upload my webpage data or screenshots?', 'DemoCloak 会上传我的网页数据或截图吗？'],
    ['Never. All PII detection, blurring, fake-data swapping, and PNG captures run 100% locally inside your browser. The only optional network request is verifying your Pro license key if you upgrade.', '绝对不会。所有敏感信息识别、模糊打码、假数据替换与 PNG 截图均 100% 在本地浏览器内完成。唯一可选的网络请求是当你升级 Pro 时验证授权码。'],
    ['Does Demo Mode modify my real Stripe/CRM database?', '假数据模式（Demo Mode）会改坏我真实的后台数据库吗？'],
    ['No. DemoCloak only edits the rendered text inside your local browser tab memory. Clicking Restore All or refreshing restores the original page immediately.', '完全不会。DemoCloak 只在当前浏览器标签页内存里临时修改渲染文本，点击「一键还原」或刷新页面即刻恢复原貌。'],
    ['Is this a subscription? What if it doesn\'t fit my workflow?', '这是按月扣费的订阅制吗？不合适可以退吗？'],
    ['Zero subscriptions. DemoCloak Pro is a single $19 one-time payment for up to 3 devices, backed by a straightforward 14-day full refund policy.', '零订阅。DemoCloak Pro 为 $19 一次性买断（支持 3 台设备），并享受 14 天全额退款政策。'],

    // SpecQuill landing page
    ['Chrome Extension · 100% Local · One-Time License', 'Chrome 与 Edge 扩展 · 100% 本地运行 · 一次买断'],
    ['Inspect Live Webpage UI. Export Zero-Bloat Code & Design Tokens.', '悬停检查任意网页 UI，一键导出零冗余代码与设计规范。'],
    ['Skip blurry screenshots and 200-line DevTools style dumps. Hover any component, audit WCAG contrast and spacing redlines, and export clean HTML/CSS, Tailwind v4 utility classes, React JSX, OKLCH design tokens, or structured coding-agent specs locally in your browser.', '告别模糊截图和 F12 里 200 行浏览器默认冗余样式。悬停任意组件即可查看间距标尺与 WCAG 对比度，并在本地一键导出精简 HTML/CSS、Tailwind v4 类名、React JSX、OKLCH 配色规范或结构化 AI 编程组件规格。'],
    ['Get Lifetime Pro ($12 Early Bird)', '获取永久 Pro 授权 ($12 早鸟价)'],
    ['Live on Chrome Web Store & Microsoft Edge Add-ons · Free forever for hover inspection, redlines, clean HTML/CSS & CSS variables · 3 free Pro exports/day · 14-day refund policy.', '已正式上架 Chrome 与 Edge 双商店（内置简体中文等 8 国语言）· 悬停检查、间距标尺、精简 HTML/CSS 与 CSS 变量永久免费 · 每日 3 次免费 Pro 导出 · 14 天退款保障。'],
    ['See SpecQuill in Action', '界面效果预览'],
    ['Built for Real Frontend & AI Coding Workflows', '专为真实前端开发与 AI 辅助编程打造'],
    ['Zero-Bloat Style Diffing', '零冗余样式差分'],
    ['Diffs every element against a clean tag baseline so browser defaults and redundant inherited CSS never pollute your exported code.', '自动将元素计算样式与纯净标签基准做差分，彻底过滤浏览器默认值和无用继承属性。'],
    ['Tailwind v4 + React JSX', 'Tailwind v4 + React JSX 编译'],
    ['Deterministic spacing, radius, color, and flex/grid compiler with automatic JSX attribute conversion (className, viewBox, strokeWidth).', '覆盖全部 21 套 Tailwind v4 色板、透明修饰符、渐变、毛玻璃与子像素网格，并自动转换 JSX 属性。'],
    ['Coding-Agent Prompt Packager', 'AI 编程组件规格打包'],
    ['Exports concise, token-budgeted <component_spec> prompts plus .cursor/rules/*.mdc and AGENTS.md guidelines for consistent UI generation.', '导出精炼结构化的组件规格提示词以及 .cursor/rules 与 AGENTS.md 规范，直接喂给 Cursor/Claude 高精度复刻 UI。'],
    ['OKLCH & WCAG 2.1 Contrast Audit', 'OKLCH 配色与 WCAG 对比度审计'],
    ['Scan any page into deduplicated semantic palettes, OKLCH values, Tailwind v4 @theme, W3C DTCG JSON, Figma Variables JSON, and AA/AAA contrast checks.', '一键扫描整页去重配色、OKLCH 色值、WCAG AA/AAA 对比度，导出 Tailwind v4 @theme、W3C JSON 或 Figma 变量。'],
    ['Redline Ruler & Keyboard DOM Nav', '像素间距标尺与键盘 DOM 导航'],
    ['Hold Alt for live pixel distance redlines and walk parent, child, and sibling nodes with arrow keys inside the Chrome Side Panel.', '悬停按住 Alt 查看元素间距红线，方向键快速在父子兄弟节点间精确切换。'],
    ['SpecQuill Free', 'SpecQuill 免费版'],
    ['Early Bird Launch Offer', '早鸟买断特惠'],
    ['SpecQuill Pro', 'SpecQuill Pro 永久版'],
    ['one-time early bird (normally $29)', '早鸟一次买断（原价 $29）'],
    ['Buy Lifetime Pro License ($12)', '购买永久 Pro 授权 ($12)'],
    ['Does SpecQuill send webpage data to a server?', 'SpecQuill 会把网页内容上传到服务器吗？'],
    ['Never. All DOM inspection, CSS diffing, utility compilation, and token extraction run 100% locally in your browser. The only optional network request is verifying your Pro license key if you activate Pro.', '绝不上传。所有 DOM 检查、CSS 差分、Tailwind 编译和 Token 提取均 100% 在本地浏览器执行。'],
    ['Is this a recurring subscription? What about refunds?', '这是按月订阅吗？支持退款吗？'],
    ['No subscriptions. SpecQuill Pro is a single one-time payment with 7-day offline grace caching and a 14-day full refund policy.', '无任何订阅费。SpecQuill Pro 一次买断永久使用，支持 7 天离线宽限缓存及 14 天全额退款。'],
    ['Why doesn\'t SpecQuill ask for all-website background permissions?', '为什么 SpecQuill 不在安装时申请“读取所有网站数据”权限？'],
    ['SpecQuill activates only on the active tab when you click the toolbar icon, press Alt+Shift+S, or explicitly grant per-site access from the side panel.', 'SpecQuill 遵循最小权限原则，仅在你点击图标或按快捷键时对当前标签页生效，后台不偷跑。'],

    // Tool: Prompt Sanitizer
    ['100% Local in Your Browser · Zero Server Upload · Reversible Tokens', '100% 浏览器本地运行 · 零服务器上传 · 支持一键还原'],
    ['AI Prompt, JSON & Log PII Scrubber', 'AI 提示词 / JSON / 日志敏感信息脱敏工具'],
    ['Safely sanitize API keys, JWTs, emails, customer cards, phone numbers, revenue figures, and IP addresses from logs or JSON before pasting into ChatGPT, Claude, or GitHub Issues—then restore the AI\'s reply back to your real values in 1 click.', '把报错日志、JSON 或 .env 发给 ChatGPT / Claude / GitHub Issues 前，在本地一键把 API 密钥、JWT、邮箱、银行卡、手机号、金额与 IP 替换成安全占位符——拿到 AI 回复后再一键还原回真实值。'],
    ['API Keys & JWT', 'API 密钥与 JWT'],
    ['Emails', '邮箱'],
    ['Revenue / $', '金额 / 营收'],
    ['Credit Cards', '银行卡'],
    ['Phones', '手机号'],
    ['IPv4', 'IPv4 地址'],
    ['Reversible Tokens ([EMAIL_1])', '可逆占位符 ([EMAIL_1])'],
    ['Realistic Fake Data', '逼真假数据'],
    ['Load Sample Log', '加载示例日志'],
    ['Clear', '清空'],
    ['1. Raw Prompt, Log, .env, or JSON', '1. 粘贴原始日志 / JSON / .env / 提示词'],
    ['2. Safe Sanitized Output (Ready for AI / Sharing)', '2. 脱敏后的安全文本（可直接发给 AI）'],
    ['Copy Safe Text', '复制安全文本'],
    ['3. Optional: Restore Original Values in AI\'s Reply (Local Re-hydration)', '3. 可选：将 AI 回复里的占位符一键还原回你的真实值（纯本地）'],
    ['Copy Restored Text', '复制还原结果'],
    ['Sharing Live Dashboards on Zoom, Google Meet, or Loom?', '需要在 Zoom / 腾讯会议 / Loom 共享网页时实时保护隐私？'],
    ['DemoCloak Brings This Same PII & Demo-Data Engine Directly Into Your Browser', 'DemoCloak 将这套敏感信息脱敏与假数据引擎直接带进你的浏览器'],
    ['Get DemoCloak →', '了解 DemoCloak →'],

    // Tool: Screenshot Redactor
    ['100% Client-Side · Zero Server Upload · Auto EXIF Stripper', '100% 本地前端处理 · 零上传 · 自动清除 EXIF 元数据'],
    ['Private Screenshot Blur, Pixelate & Redaction Tool', '本地隐私截图打码、马赛克与去 EXIF 工具'],
    ['Paste (Ctrl+V / ⌘V) or drop any PNG, JPG, or WebP screenshot, drag boxes over emails, API keys, or revenue figures, and download a clean PNG with all EXIF metadata stripped automatically.', '按 Ctrl+V / ⌘V 粘贴或拖入任意 PNG/JPG/WebP 截图，直接画框模糊、打马赛克或涂黑敏感信息，并自动清除 EXIF 元数据导出纯净 PNG。'],
    ['Blur', '高斯模糊'],
    ['Pixelate', '马赛克'],
    ['Solid Black', '纯黑涂抹'],
    ['Open Image', '打开图片'],
    ['Load Sample', '加载示例'],
    ['Undo', '撤销'],
    ['Clear Boxes', '清空打码框'],
    ['Copy PNG', '复制 PNG'],
    ['Download Clean PNG', '下载纯净 PNG'],
    ['Choose Screenshot', '选择截图文件'],
    ['Try Sample Dashboard', '加载示例后台截图'],
    ['Need Live Protection While Sharing Your Screen on Zoom, Meet, or Loom?', '开会共享屏幕或录屏时需要实时自动打码？'],
    ['Try DemoCloak — Auto-Blur PII & Realistic Demo Data Extension', '试试 DemoCloak — 网页自动脱敏与逼真假数据扩展'],
    ['Explore DemoCloak →', '了解 DemoCloak →'],

    // Tool: CSS -> Tailwind & OKLCH
    ['Free Local Developer Tool · Zero Ads · Zero Sign-Up', '免费本地开发工具 · 无广告 · 免登录'],
    ['CSS to Tailwind CSS v4 & React JSX Converter', 'CSS 转 Tailwind CSS v4 与 React JSX 转换器'],
    ['Paste any CSS block below to strip redundant defaults and compile deterministic Tailwind CSS v4 utility classes plus clean JSX markup—100% locally in your browser.', '粘贴任意 CSS 代码，自动剔除浏览器默认冗余，在本地即时编译干净的 Tailwind CSS v4 类名与 React JSX。'],
    ['Examples:', '示例：'],
    ['SaaS Card', 'SaaS 卡片'],
    ['Primary CTA Button', '主按钮'],
    ['Status Pill', '状态标签'],
    ['Raw CSS Input', '原始 CSS 输入'],
    ['Tailwind v4 Output', 'Tailwind v4 输出'],
    ['Copy Classes', '复制类名'],
    ['Copy Markup', '复制组件代码'],
    ['Live rendered preview:', '实时渲染预览：'],
    ['Explore SpecQuill Extension', '了解 SpecQuill 浏览器扩展'],
    ['Early Bird Pro ($12 One-Time)', '早鸟 Pro ($12 买断)'],
    ['Free Local Accessibility & Design Token Tool', '免费本地配色无障碍与设计规范工具'],
    ['OKLCH Color Converter, WCAG 2.1 Contrast Checker & Tailwind v4 @theme', 'OKLCH 颜色转换、WCAG 2.1 对比度检测与 Tailwind v4 @theme 生成器'],
    ['Text (Foreground)', '文字色（前景色）'],
    ['Background', '背景色'],
    ['⇄ Swap Colors', '⇄ 互换颜色'],
    ['+ Add Text to Palette', '+ 将文字色加入色板'],
    ['+ Add Background to Palette', '+ 将背景色加入色板'],
  ]);

  const origTextMap = new WeakMap();
  const origHtmlMap = new WeakMap();

  function norm(str) {
    return String(str || '').replace(/\s+/g, ' ').trim();
  }

  function detectInitialLang() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('lang');
    if (q === 'zh' || q === 'en') return q;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch {}
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : 'en';
  }

  function applyLanguage(lang) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';

    const targets = document.querySelectorAll(
      'header a, header small, main h1, main h2, main h3, main p, main li, main button, main a, main label, main span, main strong, main figcaption, footer a'
    );

    targets.forEach((el) => {
      if (el.id === 'lang-toggle-btn' || el.closest('pre, code')) return;

      // Save original HTML/text on first pass
      if (!origHtmlMap.has(el)) {
        origHtmlMap.set(el, el.innerHTML);
        origTextMap.set(el, norm(el.textContent));
      }

      if (lang === 'en') {
        if (el.dataset.orziTranslated === '1') {
          el.innerHTML = origHtmlMap.get(el);
          delete el.dataset.orziTranslated;
        }
        return;
      }

      // Translate leaf-ish or clean text elements directly matching ZH_MAP
      const key = origTextMap.get(el);
      if (key && ZH_MAP.has(key)) {
        // Avoid wiping interactive children like <input> inside <label>
        const hasInput = el.querySelector('input, select, textarea, svg');
        if (!hasInput) {
          el.textContent = ZH_MAP.get(key);
          el.dataset.orziTranslated = '1';
        }
      }
    });

    const toggle = document.getElementById('lang-toggle-btn');
    if (toggle) {
      toggle.textContent = lang === 'zh' ? 'EN' : '中文';
      toggle.setAttribute('aria-label', lang === 'zh' ? 'Switch language to English' : '切换为简体中文');
    }

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }

  function injectToggleButton(initialLang) {
    const navList = document.querySelector('.nav-list');
    if (!navList || document.getElementById('lang-toggle-btn')) return;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.id = 'lang-toggle-btn';
    btn.type = 'button';
    btn.className = 'lang-switch-btn';
    btn.textContent = initialLang === 'zh' ? 'EN' : '中文';
    btn.addEventListener('click', () => {
      const next = document.documentElement.lang === 'zh-CN' ? 'en' : 'zh';
      applyLanguage(next);
    });
    li.appendChild(btn);
    navList.appendChild(li);
  }

  function init() {
    const lang = detectInitialLang();
    injectToggleButton(lang);
    if (lang === 'zh') {
      applyLanguage('zh');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
