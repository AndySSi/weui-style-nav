const fs = require('node:fs')

// 只解析文本，不加载或执行工作区中的代码。
function resolveStylesheet(root) {
  return require.resolve('weui/dist/style/weui.css', { paths: [root] })
}

function mask(text, pattern) {
  return text.replace(pattern, (part) => part.replace(/[^\r\n]/g, ' '))
}

function indexStylesheet(text) {
  const source = mask(text, /\/\*[\s\S]*?\*\//g)
  const index = new Map()
  // 只扫描分隔符，尾部 source map 等长文本不会触发正则回溯。
  let cursor = 0
  for (const boundary of source.matchAll(/[{}]/g)) {
    const start = cursor
    cursor = boundary.index + 1
    if (boundary[0] !== '{') continue
    const header = source.slice(start, boundary.index)
    if (header.trimStart().startsWith('@')) continue
    for (const match of header.matchAll(/\.(weui-[\w-]+)/g)) {
      const name = match[1]
      const base = header.split(',').some((selector) => selector.trim() === `.${name}`)
      if (!index.has(name) || (base && !index.get(name).base)) {
        const end = source.indexOf('}', boundary.index + 1)
        index.set(name, {
          offset: start + match.index + 1,
          base,
          css: text
            .slice(start, end < 0 ? source.length : end + 1)
            .trim()
            .slice(0, 1600),
        })
      }
    }
  }
  return index
}

function classTokens(text) {
  let source = mask(text, /<!--[\s\S]*?-->/g)
  source = mask(source, /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi)
  const tokens = []
  const attributes = /(?<![\w:-])(?:class|:class|v-bind:class)\s*=\s*(["'])([\s\S]*?)\1/g
  for (const attribute of source.matchAll(attributes)) {
    const value = attribute[2]
    const start = attribute.index + attribute[0].indexOf(attribute[1]) + 1
    for (const token of value.matchAll(/(?<![\w-])weui-[\w-]+/g)) {
      tokens.push({
        name: token[0],
        start: start + token.index,
        end: start + token.index + token[0].length,
      })
    }
  }
  return tokens
}

function loadStylesheet(root) {
  const path = resolveStylesheet(root)
  return { path, index: indexStylesheet(fs.readFileSync(path, 'utf8')) }
}

module.exports = { classTokens, indexStylesheet, resolveStylesheet, loadStylesheet }
