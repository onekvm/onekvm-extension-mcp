import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../web/page.js', import.meta.url), 'utf8')
let now = 100_000
let definition
let lifecycle
let calls = 0
let catalogCalls = 0
let fail = false
let finish
const events = new EventTarget()
const inventory = [{ name: 'example__status', source: 'example', description: 'Read status.', allowed: true }]
const plugins = [{ id: 'example', installed: true, name: 'Example', settings: { secret: 'never cache settings' } }]
const runtime = {
  vue: {
    defineComponent: value => value,
    h: (type, props, children) => ({ type, props, children }),
    ref: value => ({ value }), computed: get => ({ get value() { return get() } }),
    onMounted: callback => lifecycle.mounted.push(callback),
    onBeforeUnmount: callback => lifecycle.unmounted.push(callback),
  },
  naive: { useDialog: () => ({}), useMessage: () => ({}) },
  i18n: { createTranslator: messages => key => messages.en?.[key] || messages.default?.[key] || key },
  register(_id, value) { definition = value },
}
const window = {
  OneKVMPluginUI: { v1: runtime }, location: { origin: 'https://device' },
  addEventListener: events.addEventListener.bind(events),
}
const context = {
  window, document: { querySelector: () => null }, URL, AbortController,
  Date: { now: () => now },
  fetch: async url => {
    if (url.endsWith('/api/extensions')) catalogCalls++
    return { ok: true, json: async () => url.endsWith('/api/extensions') ? plugins : [] }
  },
}

function mount(settings = {}, version = '1.1.2') {
  // The real host removes and re-evaluates the script on each navigation.
  runInNewContext(source, context)
  lifecycle = { mounted: [], unmounted: [] }
  let adapter
  const host = {
    extension: { value: { settings, version } },
    registerSettings(value) { adapter = value; return () => {} },
    async saveSettings() { adapter.reset({ tool_default_policy: 'deny' }); return true },
    async invoke() {
      calls++
      if (finish) await new Promise(resolve => { finish.resolve = resolve })
      if (fail) throw new Error('discovery failed')
      // Core UI currently emits this event for successful method invocations.
      events.dispatchEvent(new Event('onekvm:extensions-changed'))
      return { tools: inventory }
    },
  }
  const render = definition.component.setup({ host })
  const access = () => render().children.find(node => node?.type?.name === 'MCPToolAccessPanel').props
  const callbacks = lifecycle
  return {
    access, ready: () => Promise.all(callbacks.mounted.map(fn => fn())),
    leave: () => callbacks.unmounted.forEach(fn => fn()),
    save: () => render().children.find(node => node?.props?.class === 'mcp-save').children[0].props.onClick(),
  }
}

let page = mount()
await page.ready()
assert.equal(calls, 1)
assert.equal(catalogCalls, 1)
assert.equal(page.access().tools.length, 1)
page.leave()

page = mount()
assert.equal(page.access().tools.length, 1, 'cached rows are available before mounting')
await page.ready()
assert.equal(calls, 1, 're-evaluating the page bundle reuses the inventory')
assert.equal(catalogCalls, 1, 'a cache hit also skips plugin discovery')
assert.ok(!JSON.stringify(window[Symbol.for('onekvm.mcp.settings.tools.v1')]).includes('never cache settings'))

page.access().onRule('example', 'deny')
await page.access().onRefresh()
assert.equal(calls, 2, 'manual refresh always discovers tools')
page.leave()
page = mount()
await page.ready()
assert.equal(calls, 2, 'unsaved draft rules do not change the cached saved-policy key')
page.access().onRule('example', 'deny')
assert.equal(await page.save(), true)
assert.equal(calls, 3, 'saving settings refreshes the inventory')
page.leave()

page = mount({ tool_default_policy: 'deny' })
await page.ready()
assert.equal(calls, 3, 'saved settings use the newly refreshed snapshot')
page.leave()
page = mount({ tool_default_policy: 'allow' })
await page.ready()
assert.equal(calls, 4, 'changed saved policy invalidates the snapshot')
page.leave()

now += 60_001
page = mount()
assert.equal(page.access().tools.length, 1, 'expired rows remain visible while revalidating')
await page.ready()
assert.equal(calls, 5, 'expired snapshots are fetched again')
page.leave()
page = mount({}, '1.1.3')
assert.equal(page.access().tools.length, 0, 'upgrades do not reuse an older snapshot')
await page.ready()
assert.equal(calls, 6)
page.leave()

for (const event of ['onekvm:extensions-changed', 'onekvm:unauthorized', 'onekvm:permissions-changed']) {
  events.dispatchEvent(new Event(event))
  page = mount({}, '1.1.3')
  assert.equal(page.access().tools.length, 0, `${event} clears cached rows`)
  await page.ready()
  page.leave()
}
assert.equal(calls, 9)

page = mount({}, '1.1.3')
await page.ready()
fail = true
await page.access().onRefresh()
assert.ok(page.access().error)
page.leave()
fail = false
page = mount({}, '1.1.3')
assert.equal(page.access().tools.length, 0, 'failed refreshes do not leave a fresh snapshot')
await page.ready()
assert.equal(calls, 11)
page.leave()

events.dispatchEvent(new Event('onekvm:extensions-changed'))
finish = {}
page = mount({}, '1.1.3')
const pending = page.ready()
page.leave()
finish.resolve()
await pending
finish = null
page = mount({}, '1.1.3')
assert.equal(page.access().tools.length, 0, 'a disposed page cannot publish its late response')
await page.ready()
assert.equal(calls, 13)
page.leave()
console.log('MCP tool cache: remounts, expiry, refresh/save, policy/version/event invalidation, failure and disposal passed')
