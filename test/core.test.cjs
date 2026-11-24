const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { classTokens, indexStylesheet, loadStylesheet } = require('../core.cjs')

test('识别静态和绑定类名，并保留准确的源码位置', () => {
  const text = `<div class="weui-cell flex"><p :class="{ 'weui-cell__bd': active }" v-bind:class="['weui-btn']" /></div>`
  const tokens = classTokens(text)
  assert.deepEqual(
    tokens.map((token) => token.name),
    ['weui-cell', 'weui-cell__bd', 'weui-btn'],
  )
  for (const token of tokens) assert.equal(text.slice(token.start, token.end), token.name)
})

test('忽略注释、script/style 及非 class 属性，不误识别类名前缀', () => {
  const text = `<!-- <div class="weui-cell"/> --><script>const a = '<p class="weui-btn">'</script><style>.weui-cell{}</style><p title="weui-cell" class="my-weui-cell weui-btn_primary"/>`
  assert.deepEqual(
    classTokens(text).map((token) => token.name),
    ['weui-btn_primary'],
  )
})

test('索引只来自 CSS 选择器，优先基础定义并处理媒体查询', () => {
  const css = `/* .weui-fake {} */\n.weui-cell:hover { color:red }\n.weui-cell { color:blue }\n.weui-cell__bd { flex:1 }\n@media (min-width:1px){ .weui-only:hover { color:green } }`
  const index = indexStylesheet(css)
  assert.equal(index.has('weui-fake'), false)
  assert.equal(index.get('weui-cell').offset, css.indexOf('.weui-cell {') + 1)
  assert.ok(index.has('weui-only'))
  assert.equal(index.get('weui-cell__bd').css, '.weui-cell__bd { flex:1 }')
})

test('实际安装的 WeUI 可解析，跳转偏移准确且未知类不匹配', () => {
  const root = path.resolve(__dirname, '..')
  const styles = loadStylesheet(root)
  const css = require('node:fs').readFileSync(styles.path, 'utf8')
  for (const name of ['weui-btn', 'weui-btn_primary', 'weui-cell__bd', 'weui-bar__item_on']) {
    const definition = styles.index.get(name)
    assert.ok(definition, name)
    assert.equal(css.slice(definition.offset, definition.offset + name.length), name)
  }
  assert.equal(styles.index.has('weui-not-a-real-class'), false)
})

test('长 source map 注释与尾部空白不造成正则回溯', () => {
  const css = '.weui-cell { color:red }\n/*# sourceMappingURL=' + 'x'.repeat(500000) + '*/'
  const index = indexStylesheet(css)
  assert.equal(index.size, 1)
  assert.equal(index.get('weui-cell').offset, 1)
})
