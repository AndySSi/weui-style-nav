# WeUI Style Navigation

为 Vue / HTML 中的 WeUI 类名提供装饰与源码跳转的 VS Code 扩展。

| 功能            | 效果                         |
| --------------- | ---------------------------- |
| 实线装饰        | 标识当前项目中存在的 WeUI 类 |
| 悬停预览        | 查看对应 CSS 规则            |
| Ctrl+点击 / F12 | 跳到已安装 WeUI 的 CSS 定义  |

UnoCSS 的虚线仍由 UnoCSS 扩展提供，两者可同时使用。

## 安装与使用

构建环境：Node.js 22.12+，pnpm 9.9.0。编辑器：VS Code 1.96+。

```powershell
git clone https://github.com/AndySSi/weui-style-nav.git
cd weui-style-nav
pnpm install
pnpm package
pnpm install:local
```

在 VS Code 执行 **Developer: Reload Window**，然后打开安装了 WeUI 的项目：

```vue
<button class="weui-btn weui-btn_primary">提交</button>
```

在 `weui-btn_primary` 上按 Ctrl+点击或 F12，即可打开该项目的 `weui/dist/style/weui.css`。macOS 使用 Cmd+点击。

扩展当前通过本地 VSIX 安装，未发布至 Marketplace。扩展标识保留为 `weui-quick-start.weui-style-navigation`，与从脚手架安装的版本一致。

## 支持范围

- Vue、HTML 中的静态 class，以及 `:class` / `v-bind:class` 中的完整字面量类名。
- 多根工作区分别解析依赖，支持 pnpm，不扫描整个 node_modules。
- 优先定位基础定义；没有基础规则时回退到状态或媒体查询中的定义。
- 跳过 HTML 注释和 script/style 内容；不求值运行时拼接类名。
- 目标项目必须安装 WeUI；不支持远程 CDN 样式或自定义 CSS 类。

扩展无需运行时依赖，且不执行工作区配置。开发依赖中的 WeUI 仅用于测试，不会随扩展打包。

## 设置与排查

| 设置 / 命令                | 用途                       |
| -------------------------- | -------------------------- |
| `weuiStyles.enabled`       | 启用全部功能，默认 true    |
| `weuiStyles.decorations`   | 显示实线，默认 true        |
| `WeUI: Reload Style Index` | 安装或更新 WeUI 后重建索引 |
| 输出 → WeUI Styles         | 检查解析路径与加载错误     |

如果没有显示装饰，先确认目标项目已执行依赖安装，项目目录已加入工作区，再重建索引或重载窗口。

## 源码结构

```text
weui-style-nav/
├── extension.cjs          # VS Code 装饰、悬停和定义 Provider
├── core.cjs               # 类名提取、CSS 索引与依赖解析
├── test/core.test.cjs      # 核心行为与真实 WeUI 测试
├── .vscode/launch.json    # F5 启动扩展开发窗口
├── .github/workflows/     # Windows / Linux 自动检查
├── .vscodeignore          # VSIX 文件过滤
├── package.json           # 扩展清单与命令
└── LICENSE                # MIT
```

## 开发与验证

接手开发或准备迭代前，请先阅读 [开发交接文档](DEVELOPMENT_HANDOFF.md)，了解初衷、设计边界、已知限制及版本同步流程。

```powershell
pnpm format:check
pnpm test
pnpm package
```

使用 VS Code 打开仓库并按 F5，可启动扩展开发窗口；在新窗口中打开安装了 WeUI 的 Vue 项目进行点击和装饰验收。

`pnpm package` 使用固定版本的官方 `@vscode/vsce`，首次执行需访问 npm，生成根目录下的 `weui-style-navigation.vsix`。安装包和 node_modules 不提交到 Git。

自动测试覆盖类名识别、源码偏移、基础定义优先级、真实 WeUI 解析和长 source map 性能回归；编辑器交互需在扩展开发窗口中验收。
