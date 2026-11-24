const vscode = require('vscode')
const { classTokens, loadStylesheet } = require('./core.cjs')

function activate(context) {
  const cache = new Map()
  const output = vscode.window.createOutputChannel('WeUI Styles')
  const decoration = vscode.window.createTextEditorDecorationType({
    borderWidth: '0 0 1px 0',
    borderStyle: 'solid',
    borderColor: new vscode.ThemeColor('textLink.foreground'),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  })
  const selector = ['vue', 'html'].map((language) => ({ language, scheme: 'file' }))
  const supported = (document) =>
    ['vue', 'html'].includes(document.languageId) && document.uri.scheme === 'file'
  const config = (document) => vscode.workspace.getConfiguration('weuiStyles', document.uri)

  function stylesheet(document) {
    if (!supported(document) || !config(document).get('enabled', true)) return
    const folder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!folder || folder.uri.scheme !== 'file') return
    const root = folder.uri.fsPath
    if (!cache.has(root)) {
      try {
        const result = loadStylesheet(root)
        cache.set(root, result)
        output.appendLine(`Indexed ${result.index.size} classes from ${result.path}`)
      } catch (error) {
        cache.set(root, null)
        output.appendLine(
          `Cannot resolve WeUI in ${root}: ${error.message}. Install dependencies, then run WeUI: Reload Style Index.`,
        )
      }
    }
    return cache.get(root)
  }

  function matchAt(document, position) {
    const styles = stylesheet(document)
    if (!styles) return
    const offset = document.offsetAt(position)
    const token = classTokens(document.getText()).find(
      (item) => offset >= item.start && offset < item.end,
    )
    if (!token) return
    const rule = styles.index.get(token.name)
    if (!rule) return
    return {
      styles,
      token,
      rule,
      range: new vscode.Range(document.positionAt(token.start), document.positionAt(token.end)),
    }
  }

  function decorate(editor) {
    const styles = stylesheet(editor.document)
    const ranges =
      styles && config(editor.document).get('decorations', true)
        ? classTokens(editor.document.getText())
            .filter((token) => styles.index.has(token.name))
            .map(
              (token) =>
                new vscode.Range(
                  editor.document.positionAt(token.start),
                  editor.document.positionAt(token.end),
                ),
            )
        : []
    editor.setDecorations(decoration, ranges)
  }
  function refresh() {
    for (const editor of vscode.window.visibleTextEditors) decorate(editor)
  }
  function reload() {
    cache.clear()
    refresh()
  }
  let timer
  context.subscriptions.push(
    output,
    decoration,
    vscode.languages.registerDefinitionProvider(selector, {
      async provideDefinition(document, position, cancellation) {
        const match = matchAt(document, position)
        if (!match) return
        const target = await vscode.workspace.openTextDocument(vscode.Uri.file(match.styles.path))
        if (cancellation.isCancellationRequested) return
        return new vscode.Location(target.uri, target.positionAt(match.rule.offset))
      },
    }),
    vscode.languages.registerHoverProvider(selector, {
      provideHover(document, position) {
        const match = matchAt(document, position)
        if (!match) return
        const markdown = new vscode.MarkdownString()
        markdown.appendText(
          `WeUI · ${match.token.name}\n\nCtrl+点击 / F12：查看已安装的 WeUI CSS 定义。`,
        )
        markdown.appendCodeblock(match.rule.css, 'css')
        return new vscode.Hover(markdown, match.range)
      },
    }),
    vscode.commands.registerCommand('weuiStyles.reload', reload),
    vscode.window.onDidChangeVisibleTextEditors(refresh),
    vscode.workspace.onDidChangeTextDocument(() => {
      clearTimeout(timer)
      timer = setTimeout(refresh, 120)
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(reload),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('weuiStyles')) reload()
    }),
    {
      dispose() {
        clearTimeout(timer)
        cache.clear()
      },
    },
  )
  const watcher = vscode.workspace.createFileSystemWatcher('**/{package.json,pnpm-lock.yaml}')
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(reload),
    watcher.onDidCreate(reload),
    watcher.onDidDelete(reload),
  )
  refresh()
}

module.exports = { activate }
