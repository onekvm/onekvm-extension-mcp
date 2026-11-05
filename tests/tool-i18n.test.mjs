import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

let language = 'en'
let definition
let calls = 0
const mounted = []
const h = (type, props, children) => ({ type, props, children })
const builtinNames = ['screen_capture', 'keyboard_key', 'keyboard_type', 'mouse_move', 'mouse_click', 'mouse_scroll', 'atx_status', 'atx_action']
const example = { i18n: { default: { name: 'Example' }, zh: { name: '示例' }, 'zh-TW': { name: '範例' } } }
const contributed = { title: 'Read status', description: 'Read service status.', i18n: { default: { title: 'Read status', description: 'Read service status.' }, zh: { title: '读取状态', description: '读取服务状态。' }, 'zh-TW': { title: '讀取狀態', description: '讀取服務狀態。' } } }
const inventory = [
  ...builtinNames.map(name => ({ name, source: 'mcp', description: `English ${name}`, allowed: true })),
  { ...contributed, name: 'example__status', source: 'example', allowed: true },
  { name: 'legacy__status', source: 'legacy', description: 'Legacy English description', allowed: false },
  { name: 'partial__status', source: 'partial', title: 'Canonical title', description: 'Canonical description', allowed: true,
    i18n: { default: { title: 'Wrong fallback', description: 'Wrong fallback' }, zh: { title: '部分翻译' } } },
]
const plugins = [{ id: 'example', installed: true, name: 'Example', i18n: example.i18n }]
const runtime = {
  vue: {
    defineComponent: component => component,
    h, ref: value => ({ value }), computed: get => ({ get value() { return get() } }),
    onMounted: callback => mounted.push(callback), onBeforeUnmount() {},
  },
  naive: Object.fromEntries(['NAlert', 'NButton', 'NInput', 'NInputNumber', 'NSelect', 'NTag'].map(name => [name, name])),
  i18n: {
    createTranslator(messages) {
      return key => messages[language]?.[key] || messages.default?.[key] || messages.en?.[key] || key
    },
  },
  register(id, value) { assert.equal(id, 'mcp'); definition = value },
}
runtime.naive.useDialog = () => ({})
runtime.naive.useMessage = () => ({})
runInNewContext(readFileSync(new URL('../web/page.js', import.meta.url), 'utf8'), {
  window: { OneKVMPluginUI: { v1: runtime }, location: { origin: 'https://device' }, addEventListener() {} },
  document: { querySelector: () => null }, URL, AbortController,
  fetch: async url => ({ ok: true, json: async () => url.endsWith('/api/extensions') ? plugins : [] }),
})
const host = {
  extension: { value: { settings: {} } }, registerSettings: () => () => {},
  async invoke(method) { assert.equal(method, 'tools'); calls++; return { tools: inventory } },
}
const render = definition.component.setup({ host })
await Promise.all(mounted.map(callback => callback()))
const access = () => render().children.find(node => node?.type?.name === 'MCPToolAccessPanel').props
for (const locale of ['zh', 'zh-TW', 'en', 'fr']) {
  language = locale
  const props = access()
  assert.equal(props.tools.length, inventory.length)
  for (const tool of props.tools) {
    const original = inventory.find(entry => entry.name === tool.name)
    assert.equal(tool.allowed, original.allowed, 'language changes preserve access decisions')
    if (tool.source === 'example') {
      const expected = original.i18n[locale] || original.i18n.default
      assert.equal(tool.title, expected.title)
      assert.equal(tool.description, expected.description)
      assert.equal(tool.sourceName, (example.i18n[locale] || example.i18n.default).name)
    } else if (tool.source === 'mcp') {
      assert.ok(tool.title)
      assert.ok(locale === 'zh' || locale === 'zh-TW' ? /[\u3400-\u9fff]/u.test(tool.description) : tool.description === original.description)
    } else {
      assert.equal(tool.description, original.description, 'missing translations use canonical English')
    }
  }
  assert.equal(props.tools.find(tool => tool.source === 'partial').title, locale === 'zh' ? '部分翻译' : 'Canonical title')
  assert.equal(props.rows.find(row => row.id === 'example').name, (example.i18n[locale] || example.i18n.default).name)
}
assert.equal(calls, 1, 'switching language uses the loaded inventory')
console.log('MCP tool i18n: built-ins and contributed tools, live language changes, legacy/partial/English fallback and access preservation passed')
