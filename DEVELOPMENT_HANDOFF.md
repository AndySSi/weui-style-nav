# 开发交接：WeUI Style Navigation

记录日期：2026-11-24。基线：0.1.0，提交 `b798484`。

本文件保存开发背景与维护约定；安装和使用步骤见 [README](README.md)。未来接手时先读本文件，再核对当前代码、Git 状态和 CHANGELOG，勿将历史记录视为当前验证结果。

## 1. 为什么开发

用户在 WeUI Quick Start 中同时使用 WeUI、UnoCSS 和自定义 SCSS，希望在编辑器里辨认样式来源，并直接查看 WeUI 的真实定义。

| 来源        | 期望体验                                     |
| ----------- | -------------------------------------------- |
| UnoCSS      | 保留原有 UnoCSS 扩展的虚线与提示             |
| WeUI        | 持续实线装饰、悬停预览、Ctrl+点击 / F12 跳转 |
| 自定义 SCSS | 继续由组件 style、全局样式及既有工具维护     |

**核心目的：减少查找成本，帮助理解项目正在使用的 WeUI。** 不追求把它扩展为通用 CSS 框架工具或另一套 UnoCSS 插件。

## 2. 必须保留的设计原则

- **以使用者项目为准。** 定义来源是当前工作区解析出的 `weui/dist/style/weui.css`，不能固定到开发机路径、扩展测试依赖或某个在线版本。
- **多项目隔离。** 每个工作区目录单独解析、缓存，不能把项目 A 的定义用于项目 B。
- **不制造不存在的定义。** 只有匹配实际 CSS 索引的类才显示装饰和跳转。
- **区分来源。** WeUI 实线、UnoCSS 虚线；不改写 UnoCSS 的配置、规则或生成样式。
- **轻量、可关闭。** 无运行时依赖，不递归扫描整个 node_modules，不加载或执行工作区配置，不修改业务代码。
- **维护单一来源。** 本仓库维护扩展代码，脚手架通过 Git Submodule 引用明确提交。

扩展身份为 `weui-quick-start.weui-style-navigation`。独立建仓后刻意保留 publisher/name，以便覆盖此前安装版本；不要仅因仓库重命名而改变身份。

## 3. 当前范围与限制

| 支持                                | 暂不支持                                |
| ----------------------------------- | --------------------------------------- |
| Vue、HTML，本地 file 文档           | WXML/WXSS、JSX/TSX、虚拟文档、Web 扩展  |
| 静态 class、绑定 class 中完整字面量 | 求值变量、函数或动态拼接类名            |
| 已安装的 npm/pnpm WeUI              | 仅通过远程 CDN 引入的样式               |
| 当前工作区目录下的依赖解析          | 自动发现任意嵌套包或任意自定义 CSS 来源 |

`core.cjs` 使用有边界的文本解析，不是完整 Vue/HTML/CSS AST。若扩展语法支持范围，先用真实失败案例补测试，不要假设当前正则适用于全部模板语法或未来 CSS 格式。

基础选择器优先；没有基础定义时回退到首次匹配的状态或媒体查询规则。悬停片段最多 1600 字符，位置偏移指向真实文件中的类名。存在多个定义时，目前不会列出所有规则。

## 4. 源码与数据流

```text
Vue / HTML 的 class 字面量
        │ classTokens：提取名称与源码偏移
        ▼
当前工作区 → require.resolve → 已安装的 WeUI CSS
                                │ indexStylesheet
                                ▼
                        类名 → 定义偏移 / CSS 片段
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
               实线           悬停预览      Definition Provider
```

| 文件                       | 职责                                                      |
| -------------------------- | --------------------------------------------------------- |
| `core.cjs`                 | 类名提取、注释遮罩、CSS 索引、依赖路径解析；不依赖 vscode |
| `extension.cjs`            | VS Code Provider、装饰、工作区缓存、日志、刷新与资源释放  |
| `test/core.test.cjs`       | 核心行为、真实 WeUI、性能问题的回归用例                   |
| `package.json`             | 扩展身份、激活条件、配置项、命令和版本                    |
| `.vscodeignore`            | 限制 VSIX 内容，排除测试、依赖和开发配置                  |
| `.vscode/launch.json`      | F5 启动 Extension Development Host                        |
| `.github/workflows/ci.yml` | Windows/Linux 的安装、格式检查和核心测试                  |

缓存按工作区路径保存，包括解析失败结果。包清单或 pnpm 锁文件变化、工作区变更、相关配置变化、手动重载会清缓存；当前不直接监听所有 CSS 文件。编辑文本后的装饰刷新防抖为 120ms。

## 5. 已踩过的坑

**大段 source map / 内嵌数据导致正则回溯。**

初版用贪婪匹配提取规则头，在真实 WeUI CSS 的大段数据和注释遮罩后的尾部空白上出现长时间阻塞。最终改为线性扫描 `{` / `}` 分隔符，再处理规则头。保留长 source map 的回归用例，勿改回对全文反复试探的表达式。

**pnpm dlx 的执行目录。**

扩展清单必须在本仓库根目录被打包工具读取。脚手架调用 `pnpm --dir tooling/weui-vscode run package`，由子模块自己的脚本完成打包。不要假设 vsce 支持 `--cwd`，也不要把 VSIX 输出路径写死为脚手架目录。

**Git 子模块不能直接连同 .git 指针复制。**

脚手架通过子模块固定版本；其模板复制命令导出源码快照，排除 `.git`、node_modules 和 VSIX，避免新项目引用原仓库路径。更新集成时需区分“子模块引用”和“模板快照”。

## 6. 接手后的最短路径

```powershell
git status -sb
git log -5 --oneline
pnpm install --frozen-lockfile
pnpm format:check
pnpm test
pnpm package
```

基线核心测试有 5 项：字面量提取与偏移、忽略范围与前缀、基础规则优先、真实 WeUI 定位、长 source map 回归。测试依赖 WeUI 2.6.26 仅作开发验证，不随 VSIX 分发，也不是用户项目的定义来源。

**自动检查不等于编辑器验收。** F5 打开扩展开发窗口，并在其中打开安装了 WeUI 的目标项目，验证：

- 静态 class 与绑定对象类名显示实线，未知类不装饰。
- Ctrl+点击 / F12 的目标路径、类名和行号正确。
- 两个安装不同 WeUI 版本的工作区分别跳转，无串用。
- UnoCSS 虚线仍正常；关闭 decorations 后仍可跳转；关闭 enabled 后全部停用。
- 文件编辑、依赖更新、手动重载和缺失依赖时无异常。

初版已验证核心测试、本地打包及 VS Code CLI 安装。未建立扩展宿主自动化测试；不要将核心测试通过描述为全部 UI、远程开发或跨平台交互已验收。

## 7. 版本迭代与脚手架同步

1. 从具体问题开始，补失败用例；优先保持上述目的与边界。
2. 修改实现，更新 README、CHANGELOG；设计或范围变化同步本交接文档。
3. 更新 package.json 中的版本；依赖变化时同步锁文件。
4. 执行核心检查、打包和编辑器验收，检查 VSIX 不包含依赖、测试或无关文件。
5. 经本次任务授权后提交、推送或打 tag；当前未发布 Marketplace，不应擅自加入市场发布流程。
6. 在消费脚手架中更新固定引用，验证后单独提交主仓库的子模块指针：

```powershell
# 在脚手架根目录；将 <commit> 替换为本仓库已推送并验证的提交
 git -C tooling/weui-vscode fetch origin
 git -C tooling/weui-vscode checkout <commit>
 pnpm --dir tooling/weui-vscode install --frozen-lockfile
 pnpm test:weui-editor
 pnpm weui:editor:package
```

脚手架远程为 `https://github.com/AndySSi/weui-quick-start.git`，子模块路径为 `tooling/weui-vscode`。子模块更新与扩展提交属于两个仓库，不能只推送其中一个就声称集成已更新。

## 8. 排障入口与后续方向

先看「输出 → WeUI Styles」中的实际解析路径，再检查项目依赖、工作区范围和配置，随后执行 **WeUI: Reload Style Index**。缺少装饰不一定是类名错误，也可能是扩展未启用或缓存的解析失败。

后续只有出现实际需求时再考虑：扩展宿主自动化测试、更多模板语法、复杂 CSS 的解析器、嵌套包根目录、CSS 文件监控。它们是候选方向，尚未实现或承诺。
