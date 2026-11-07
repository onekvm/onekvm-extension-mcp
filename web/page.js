(() => {
  const runtime = window.OneKVMPluginUI.v1
  const { computed, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } = runtime.vue
  const { NAlert, NButton, NInput, NInputNumber, NPagination, NSelect, NTag, useDialog, useMessage } = runtime.naive

  const messages = {
    en: {
      endpoint: 'MCP address',
      advanced: 'Advanced connection settings',
      listen: 'Listen mode',
      listenAll: 'All interfaces (0.0.0.0)',
      listenInterface: 'Interface',
      listenAddress: 'IP address',
      interfacePlaceholder: 'Choose an interface',
      addressPlaceholder: 'Enter an IP address',
      port: 'Port',
      direct: 'TCP connection address',
      directHint: 'Direct TCP connections use the listen address and port below over HTTP. The MCP address above uses the OneKVM web port.',
      interfacesFailed: 'Network interfaces did not load.',
      token: 'Access token',
      tokenHint: 'Enter 16–128 characters, or generate one in this browser.',
      tokenPlaceholder: 'Enter a custom token',
      configured: 'Configured',
      notConfigured: 'Not configured',
      generate: 'Generate random token',
      regenerate: 'Regenerate token',
      timeout: 'Screen capture timeout (seconds)',
      save: 'Save settings',
      tokenReady: 'Random token saved',
      copyPrompt: 'This token is shown only in this dialog. Copy it now and store it securely.',
      copy: 'Copy and close',
      close: 'Close',
      copied: 'Token copied.',
      copyFailed: 'Automatic copy failed. Select and copy the token manually.',
      randomFailed: 'The browser cannot provide secure random values.',
      toolAccess: 'Plugin tools',
      toolDefault: 'Default access',
      allow: 'Allow',
      deny: 'Prohibit',
      followDefault: 'Follow default',
      toolHint: 'Allowed plugins can expose their declared tools to anyone with the MCP access token. Save settings to apply changes.',
      pluginsFailed: 'The tool list could not be loaded.',
      pluginsEmpty: 'No other plugins have registered MCP tools.',
      pluginsLoading: 'Loading tools…',
      refresh: 'Refresh tools',
      toolList: 'Tool list',
      toolName: 'Tool',
      toolSource: 'Source',
      toolStatus: 'Status',
      builtin: 'MCP built-in',
      available: 'Available',
      prohibited: 'Prohibited',
      noTools: 'No registered tools',
      toolCount: 'Tools',
      toolListHint: 'Tool availability reflects saved settings.',
      filterTools: 'Filter tools',
      toolFilterPlaceholder: 'Name, description or source',
      toolFilterResults: '{shown} of {total} tools match',
      toolsNoMatch: 'No matching tools.',
      allStatuses: 'All',
      toolPagination: 'Tool list pages',
      toolsPerPage: '{count} / page',
    },
    zh: {
      endpoint: 'MCP 地址',
      advanced: '高级连接设置',
      listen: '监听方式',
      listenAll: '所有接口（0.0.0.0）',
      listenInterface: '网络接口',
      listenAddress: 'IP 地址',
      interfacePlaceholder: '选择接口',
      addressPlaceholder: '输入 IP 地址',
      port: '端口',
      direct: 'TCP 连接地址',
      directHint: '独立 TCP 连接通过 HTTP 使用以下监听地址和端口；上方 MCP 地址使用 OneKVM 网页端口。',
      interfacesFailed: '网络接口没有加载出来。',
      token: '访问令牌',
      tokenHint: '输入 16–128 个字符，或在浏览器里生成一个。',
      tokenPlaceholder: '输入自定义令牌',
      configured: '已配置',
      notConfigured: '尚未配置',
      generate: '生成随机令牌',
      regenerate: '重新生成令牌',
      timeout: '屏幕截图超时（秒）',
      save: '保存设置',
      tokenReady: '随机令牌已保存',
      copyPrompt: '此令牌只会在本次弹窗中显示，请立即复制并妥善保存。',
      copy: '复制并关闭',
      close: '关闭',
      copied: '令牌已复制。',
      copyFailed: '无法自动复制，请手动选择并复制令牌。',
      randomFailed: '浏览器无法提供安全的随机数。',
      toolAccess: '插件工具',
      toolDefault: '默认接入',
      allow: '允许',
      deny: '禁止',
      followDefault: '跟随默认',
      toolHint: '允许接入的插件可向持有 MCP 访问令牌的人公开其声明的工具。修改后保存生效。',
      pluginsFailed: '无法加载工具列表。',
      pluginsEmpty: '当前没有其他插件注册 MCP 工具。',
      pluginsLoading: '正在加载工具…',
      refresh: '刷新工具',
      toolList: '工具列表',
      toolName: '工具',
      toolSource: '来源',
      toolStatus: '状态',
      builtin: 'MCP 内置',
      available: '可用',
      prohibited: '已禁止',
      noTools: '未注册工具',
      toolCount: '工具数',
      toolListHint: '工具可用状态以已保存的设置为准。',
      filterTools: '筛选工具',
      toolFilterPlaceholder: '名称、说明或来源',
      toolFilterResults: '匹配 {shown} / {total} 项工具',
      toolsNoMatch: '没有匹配的工具。',
      allStatuses: '全部',
      toolPagination: '工具列表分页',
      toolsPerPage: '{count} / 页',
    },
    'zh-TW': {
      endpoint: 'MCP 位址',
      advanced: '進階連線設定',
      listen: '監聽方式',
      listenAll: '所有介面（0.0.0.0）',
      listenInterface: '網路介面',
      listenAddress: 'IP 位址',
      interfacePlaceholder: '選擇介面',
      addressPlaceholder: '輸入 IP 位址',
      port: '連接埠',
      direct: 'TCP 連線位址',
      directHint: '獨立 TCP 連線透過 HTTP 使用以下監聽位址和連接埠；上方 MCP 位址使用 OneKVM 網頁連接埠。',
      interfacesFailed: '網路介面沒有載入。',
      token: '存取權杖',
      tokenHint: '輸入 16–128 個字元，或在瀏覽器裡產生一個。',
      tokenPlaceholder: '輸入自訂權杖',
      configured: '已設定',
      notConfigured: '尚未設定',
      generate: '產生隨機權杖',
      regenerate: '重新產生權杖',
      timeout: '螢幕擷取逾時（秒）',
      save: '儲存設定',
      tokenReady: '隨機權杖已儲存',
      copyPrompt: '此權杖只會在本次彈窗中顯示，請立即複製並妥善保存。',
      copy: '複製並關閉',
      close: '關閉',
      copied: '權杖已複製。',
      copyFailed: '無法自動複製，請手動選取並複製權杖。',
      randomFailed: '瀏覽器無法提供安全的隨機數。',
      toolAccess: '外掛工具',
      toolDefault: '預設接入',
      allow: '允許',
      deny: '禁止',
      followDefault: '跟隨預設',
      toolHint: '允許接入的外掛可向持有 MCP 存取權杖的人公開其宣告的工具。修改後儲存生效。',
      pluginsFailed: '無法載入工具清單。',
      pluginsEmpty: '目前沒有其他外掛註冊 MCP 工具。',
      pluginsLoading: '正在載入工具…',
      refresh: '重新整理工具',
      toolList: '工具清單',
      toolName: '工具',
      toolSource: '來源',
      toolStatus: '狀態',
      builtin: 'MCP 內建',
      available: '可用',
      prohibited: '已禁止',
      noTools: '未註冊工具',
      toolCount: '工具數',
      toolListHint: '工具可用狀態以已儲存的設定為準。',
      filterTools: '篩選工具',
      toolFilterPlaceholder: '名稱、說明或來源',
      toolFilterResults: '符合 {shown} / {total} 個工具',
      toolsNoMatch: '沒有符合條件的工具。',
      allStatuses: '全部',
      toolPagination: '工具清單分頁',
      toolsPerPage: '{count} / 頁',
    },
  }
  const t = runtime.i18n.createTranslator(messages)

  const builtinToolMessages = {
    screen_capture: {
      default: { title: 'Capture screen' },
      zh: { title: '屏幕截图', description: '将当前 OneKVM 画面截为 JPEG 图像，并返回 mouse_move 使用的像素尺寸。' },
      'zh-TW': { title: '螢幕擷取', description: '將目前 OneKVM 畫面擷取為 JPEG 圖像，並傳回 mouse_move 使用的像素尺寸。' },
    },
    keyboard_key: {
      default: { title: 'Send key' },
      zh: { title: '发送按键', description: '发送一个 USB HID 键盘键码，修饰键使用 USB HID 位图。' },
      'zh-TW': { title: '傳送按鍵', description: '傳送一個 USB HID 鍵盤鍵碼，修飾鍵使用 USB HID 點陣圖。' },
    },
    keyboard_type: {
      default: { title: 'Type text' },
      zh: { title: '输入文本', description: '通过 USB HID 键盘报告输入 US-ASCII 文本。' },
      'zh-TW': { title: '輸入文字', description: '透過 USB HID 鍵盤報告輸入 US-ASCII 文字。' },
    },
    mouse_move: {
      default: { title: 'Move mouse' },
      zh: { title: '移动鼠标', description: '将绝对鼠标指针移至最近一次 screen_capture 图像中的像素位置。请先调用 screen_capture；x 从左侧的 0 开始，y 从顶部的 0 开始。' },
      'zh-TW': { title: '移動滑鼠', description: '將絕對滑鼠指標移至最近一次 screen_capture 圖像中的像素位置。請先呼叫 screen_capture；x 從左側的 0 開始，y 從頂部的 0 開始。' },
    },
    mouse_click_at: {
      default: { title: 'Move and click' },
      zh: { title: '移动并点击', description: '把绝对指针移到最近一次屏幕截图中的像素并在该处点击。请先截图；x 从左侧的 0 开始，y 从顶部的 0 开始。' },
      'zh-TW': { title: '移動並點擊', description: '把絕對指標移到最近一次螢幕擷取中的像素並在該處點擊。請先擷取；x 從左側的 0 開始，y 從頂部的 0 開始。' },
    },
    mouse_click: {
      default: { title: 'Click mouse' },
      zh: { title: '点击鼠标', description: '在指针当前位置单击或双击左键、右键或中键。' },
      'zh-TW': { title: '點擊滑鼠', description: '在指標目前位置單擊或雙擊左鍵、右鍵或中鍵。' },
    },
    mouse_scroll: {
      default: { title: 'Scroll mouse' },
      zh: { title: '滚动鼠标', description: '发送相对鼠标滚轮报告。' },
      'zh-TW': { title: '捲動滑鼠', description: '傳送相對滑鼠滾輪報告。' },
    },
    atx_status: {
      default: { title: 'Read ATX status' },
      zh: { title: '读取 ATX 状态', description: '读取被控电脑的 ATX 电源和硬盘指示灯状态。' },
      'zh-TW': { title: '讀取 ATX 狀態', description: '讀取被控電腦的 ATX 電源和硬碟指示燈狀態。' },
    },
    atx_action: {
      default: { title: 'Operate ATX controls' },
      zh: { title: '操作 ATX 控制', description: '操作被控电脑的 ATX 前面板：power_short 短按电源键，power_long 长按电源键以强制关机，reset 按下复位键。' },
      'zh-TW': { title: '操作 ATX 控制', description: '操作被控電腦的 ATX 前面板：power_short 短按電源鍵，power_long 長按電源鍵以強制關機，reset 按下重設鍵。' },
    },
  }

  function localizedTool(tool) {
    const catalog = tool.source === 'mcp' ? builtinToolMessages[tool.name] : tool.i18n
    const fallback = { title: tool.title || catalog?.default?.title || '', description: tool.description }
    const translate = runtime.i18n.createTranslator({ ...catalog, default: fallback, en: fallback })
    return { ...tool, title: fallback.title ? translate('title') : '', description: translate('description') }
  }

  function pluginName(plugin) {
    if (!plugin) return ''
    return runtime.i18n.createTranslator({ ...plugin.i18n, default: { name: plugin.name || plugin.id } })('name')
  }

  function readTimeout(settings) {
    const value = Number(settings?.capture_timeout_seconds)
    return Number.isInteger(value) && value >= 1 && value <= 15 ? value : 5
  }

  function readMode(settings) {
    const value = settings?.listen_mode
    return value === 'interface' || value === 'address' ? value : 'all'
  }

  function readPort(settings) {
    const value = Number(settings?.port)
    return Number.isInteger(value) && value >= 1024 && value <= 65535 ? value : 9710
  }

  function readText(settings, name) {
    const value = settings?.[name]
    return typeof value === 'string' ? value : ''
  }

  function validInterfaceName(value) {
    return /^[A-Za-z][A-Za-z0-9_.:-]{0,14}$/.test(value)
  }

  function validIP(value) {
    if (!value || value.includes('%') || value.includes('/') || /\s/.test(value)) return false
    if (value.includes('.')) {
      const parts = value.split('.')
      if (parts.length !== 4 || value.includes(':')) return false
      return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255 && String(Number(part)) === String(Number(part)) && !(part.length > 1 && part.startsWith('0')))
    }
    if (!value.includes(':')) return false
    try {
      const url = new URL(`http://[${value}]/`)
      return url.hostname === `[${value}]` || url.hostname.toLowerCase() === value.toLowerCase()
    } catch (_) {
      return false
    }
  }

  function addressText(value) {
    return String(value || '').replace(/\/\d+$/, '')
  }

  function formatHost(host) {
    if (!host) return ''
    return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  }

  function apiURL(path) {
    const base = document.querySelector('meta[name="onekvm-service-base"]')?.content || ''
    if (!base) return path
    try {
      const url = new URL(base, window.location.origin)
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/device-ui/')) return path
      return `${url.href.replace(/\/$/, '')}${path}`
    } catch (_) {
      return path
    }
  }

  function randomToken(errorMessage) {
    if (!globalThis.crypto?.getRandomValues) throw new Error(errorMessage)
    const bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  }

  async function copyText(value, errorMessage) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      return
    }
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.readOnly = true
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    textarea.remove()
    if (!copied) throw new Error(errorMessage)
  }

  // The host evaluates this bundle again on each visit. Keep one bounded,
  // document-local snapshot across those evaluations, without storing settings.
  const toolCacheID = Symbol.for('onekvm.mcp.settings.tools.v1')
  const toolCache = window[toolCacheID] ||= { entry: null, listening: false }
  const toolCacheTTL = 60_000
  if (!toolCache.listening) {
    for (const event of ['onekvm:extensions-changed', 'onekvm:unauthorized', 'onekvm:permissions-changed']) {
      window.addEventListener(event, () => { toolCache.entry = null })
    }
    toolCache.listening = true
  }

  function useToolAccess(initial, invokeTools, version) {
    const defaultPolicy = ref('allow')
    const rules = ref(Object.create(null))
    const saved = ref('')
    const plugins = ref([])
    const inventory = ref([])
    const loading = ref(false)
    const loadError = ref('')
    const controller = new AbortController()
    const validID = (id) => /^[a-z0-9][a-z0-9-]{0,62}$/.test(id)
    const signature = computed(() => JSON.stringify([defaultPolicy.value, Object.entries(rules.value).sort(([a], [b]) => a.localeCompare(b))]))
    const cacheKey = () => JSON.stringify([apiURL('/api/extensions'), version, saved.value])
    function applySnapshot(snapshot) {
      plugins.value = snapshot.plugins
      inventory.value = snapshot.tools
    }
    const rows = computed(() => {
      const installedNames = new Map(plugins.value.filter((item) => item?.installed && validID(item.id))
        .map((item) => [item.id, pluginName(item)]))
      const counts = new Map()
      inventory.value.filter((tool) => tool.source !== 'mcp').forEach((tool) => counts.set(tool.source, (counts.get(tool.source) || 0) + 1))
      const names = new Map([...counts.keys()].map((id) => [id, installedNames.get(id) || id]))
      Object.keys(rules.value).forEach((id) => { if (!names.has(id)) names.set(id, id) })
      return [...names].sort(([a], [b]) => a.localeCompare(b)).map(([id, name]) => ({
        id, name: installedNames.get(id) || name, rule: rules.value[id] || 'default', count: counts.get(id) || 0,
      }))
    })
    const tools = computed(() => inventory.value.map((tool) => ({ ...localizedTool(tool),
      sourceName: tool.source === 'mcp' ? t('builtin') : pluginName(plugins.value.find((plugin) => plugin.id === tool.source)) || tool.source,
    })))
    function collect() {
      const ids = Object.keys(rules.value).sort()
      return {
        tool_default_policy: defaultPolicy.value,
        tool_allowed_plugins: ids.filter((id) => rules.value[id] === 'allow').join(','),
        tool_denied_plugins: ids.filter((id) => rules.value[id] === 'deny').join(','),
      }
    }
    function reset(settings) {
      defaultPolicy.value = settings?.tool_default_policy === 'deny' ? 'deny' : 'allow'
      const next = Object.create(null)
      for (const [key, value] of [['tool_allowed_plugins', 'allow'], ['tool_denied_plugins', 'deny']]) {
        readText(settings, key).split(',').map((id) => id.trim()).filter((id) => validID(id) && id !== 'mcp')
          .forEach((id) => { next[id] = value })
      }
      rules.value = next
      saved.value = signature.value
    }
    function setRule(id, value) {
      const next = Object.assign(Object.create(null), rules.value)
      if (value === 'allow' || value === 'deny') next[id] = value
      else delete next[id]
      rules.value = next
    }
    async function load(refresh = true) {
      if (loading.value) return
      const key = cacheKey()
      if (!refresh && toolCache.entry?.key === key && Date.now() < toolCache.entry.expires) return
      toolCache.entry = null
      loading.value = true
      loadError.value = ''
      try {
        const [data, result] = await Promise.all([
          fetch(apiURL('/api/extensions'), { credentials: 'same-origin', cache: 'no-store', signal: controller.signal }).then((response) => {
            if (!response.ok) throw new Error(t('pluginsFailed'))
            return response.json()
          }),
          invokeTools(),
        ])
        if (controller.signal.aborted) return
        if (!Array.isArray(data) || !Array.isArray(result?.tools) || result.tools.some((tool) =>
          !validID(tool?.source) || typeof tool.name !== 'string' || typeof tool.description !== 'string' || typeof tool.allowed !== 'boolean'))
          throw new Error(t('pluginsFailed'))
        const snapshot = {
          key, expires: Date.now() + toolCacheTTL, tools: result.tools,
          plugins: data.map(({ id, installed, name, i18n }) => ({ id, installed, name, i18n })),
        }
        applySnapshot(snapshot)
        toolCache.entry = snapshot
      } catch (reason) {
        if (reason?.name !== 'AbortError') loadError.value = t('pluginsFailed')
      } finally {
        loading.value = false
      }
    }
    reset(initial)
    if (toolCache.entry?.key === cacheKey()) applySnapshot(toolCache.entry)
    onBeforeUnmount(() => controller.abort())
    return { defaultPolicy, rows, tools, loading, loadError, load, collect, reset, setRule,
      dirty: computed(() => signature.value !== saved.value),
      valid: computed(() => Object.values(collect()).every((value) => value.length <= 4096)),
    }
  }

  const ToolList = defineComponent({
    name: 'MCPToolList',
    props: { tools: Array },
    setup(props) {
      const query = shallowRef('')
      const status = shallowRef('all')
      const page = shallowRef(1)
      const pageSize = shallowRef(10)
      const filtered = computed(() => {
        const terms = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
        if (!terms.length && status.value === 'all') return props.tools
        return props.tools.filter((tool) => {
          if ((status.value === 'available' && !tool.allowed) || (status.value === 'prohibited' && tool.allowed)) return false
          const text = [tool.name, tool.title, tool.description, tool.source, tool.sourceName].join('\n').toLowerCase()
          return terms.every((term) => text.includes(term))
        })
      })
      const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
      const currentPage = computed(() => Math.min(page.value, pageCount.value))
      const visible = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
      watch(() => filtered.value.length, () => { page.value = currentPage.value })
      return () => h('div', { class: 'mcp-tool-list' }, [
        h('h3', { id: 'mcp-tool-list-title' }, t('toolList')),
        h('p', { class: 'mcp-hint' }, t('toolListHint')),
        h('div', { class: 'mcp-tool-filters' }, [settingField('mcp-tool-filter', t('filterTools'), h(NInput, {
          value: query.value, clearable: true, placeholder: t('toolFilterPlaceholder'),
          inputProps: { id: 'mcp-tool-filter', 'aria-labelledby': 'mcp-tool-filter-label', 'aria-describedby': 'mcp-tool-filter-results' },
          'onUpdate:value': (value) => { query.value = value || ''; page.value = 1 },
        })), settingField('mcp-tool-status-filter', t('toolStatus'), h(NSelect, {
          value: status.value,
          options: [{ label: t('allStatuses'), value: 'all' }, { label: t('available'), value: 'available' }, { label: t('prohibited'), value: 'prohibited' }],
          inputProps: { id: 'mcp-tool-status-filter', 'aria-labelledby': 'mcp-tool-status-filter-label', 'aria-describedby': 'mcp-tool-filter-results' },
          'onUpdate:value': (value) => { status.value = value; page.value = 1 },
        }))]),
        h('p', { id: 'mcp-tool-filter-results', class: 'mcp-hint', role: 'status', 'aria-atomic': 'true' },
          t('toolFilterResults').replace('{shown}', filtered.value.length).replace('{total}', props.tools.length)),
        h('div', { class: 'mcp-tool-scroll', tabindex: 0, role: 'region', 'aria-labelledby': 'mcp-tool-list-title' }, [
          h('table', { class: 'mcp-tool-table', 'aria-labelledby': 'mcp-tool-list-title' }, [
            h('thead', [h('tr', ['toolName', 'toolSource', 'toolStatus'].map((key) => h('th', { scope: 'col' }, t(key))))]),
            h('tbody', filtered.value.length ? visible.value.map((tool) => h('tr', { key: tool.name, 'data-tool': tool.name }, [
              h('td', [h('code', tool.name), tool.title ? h('strong', tool.title) : null, h('p', tool.description)]),
              h('td', tool.sourceName),
              h('td', [h(NTag, { type: tool.allowed ? 'success' : 'warning', bordered: false }, { default: () => tool.allowed ? t('available') : t('prohibited') })]),
            ])) : [h('tr', [h('td', { colspan: 3 }, t('toolsNoMatch'))])]),
          ]),
        ]),
        filtered.value.length ? h('nav', { class: 'mcp-tool-pagination', 'aria-label': t('toolPagination') }, [
          h(NPagination, { page: currentPage.value, pageSize: pageSize.value, itemCount: filtered.value.length,
            pageSlot: 3, showSizePicker: true, pageSizes: [10, 20, 50].map((value) => ({ value, label: t('toolsPerPage').replace('{count}', value) })),
            'onUpdate:page': (value) => { page.value = value },
            'onUpdate:pageSize': (value) => { pageSize.value = value; page.value = 1 },
          }),
        ]) : null,
      ])
    },
  })

  function settingField(id, title, control, wide = false) {
    return h('div', { class: ['mcp-field', wide && 'mcp-span'], role: 'group',
      'aria-labelledby': `${id}-label`, 'data-field': id }, [
      h('span', { id: `${id}-label` }, title), control,
    ])
  }

  const ConnectionSettings = defineComponent({
    name: 'MCPConnectionSettings',
    props: { endpoint: String, direct: String, draft: Object, interfaces: Array,
      configured: Boolean, saving: Boolean, interfaceError: String },
    emits: ['change', 'generate'],
    setup(props, { emit }) {
      const change = (field, value) => emit('change', field, value)
      const inputProps = (id) => ({ id, 'aria-labelledby': `${id}-label` })
      return () => h('div', { class: 'mcp-connection' }, [
        h('article', { class: 'mcp-card mcp-connection-card' }, [
          settingField('mcp-endpoint', t('endpoint'), h(NInput, {
            value: props.endpoint, readonly: true, inputProps: inputProps('mcp-endpoint'),
          })),
          h('div', { class: 'mcp-token-group', role: 'group', 'aria-labelledby': 'mcp-token-label' }, [
            h('div', { class: 'mcp-token-heading' }, [
              h('strong', { id: 'mcp-token-label' }, t('token')),
              h(NTag, { type: props.configured ? 'success' : 'warning', bordered: false },
                { default: () => props.configured ? t('configured') : t('notConfigured') }),
            ]),
            h('div', { class: 'mcp-token-actions' }, [
              h(NInput, { value: props.draft.token, type: 'password', showPasswordOn: 'click',
                maxlength: 128, autocomplete: 'new-password', placeholder: t('tokenPlaceholder'),
                inputProps: { 'aria-labelledby': 'mcp-token-label' }, disabled: props.saving,
                'onUpdate:value': (value) => change('token', value),
              }),
              h(NButton, { secondary: true, loading: props.saving, onClick: () => emit('generate') },
                { default: () => props.configured ? t('regenerate') : t('generate') }),
            ]),
            h('p', { class: 'mcp-hint' }, t('tokenHint')),
          ]),
        ]),
        h('details', { class: 'mcp-card mcp-advanced' }, [
          h('summary', t('advanced')),
          h('div', { class: 'mcp-advanced-grid' }, [
            h('p', { class: 'mcp-hint mcp-span' }, t('directHint')),
            settingField('mcp-listen-mode', t('listen'), h(NSelect, {
              value: props.draft.mode, inputProps: inputProps('mcp-listen-mode'),
              options: [{ label: t('listenAll'), value: 'all' }, { label: t('listenInterface'), value: 'interface' },
                { label: t('listenAddress'), value: 'address' }], disabled: props.saving,
              'onUpdate:value': (value) => change('mode', value),
            })),
            settingField('mcp-listen-port', t('port'), h(NInputNumber, {
              value: props.draft.port, min: 1024, max: 65535, precision: 0, disabled: props.saving,
              inputProps: inputProps('mcp-listen-port'), 'onUpdate:value': (value) => change('port', value),
            })),
            props.draft.mode === 'interface' ? settingField('mcp-listen-interface', t('listenInterface'), h(NSelect, {
              value: props.draft.interface || null, options: props.interfaces, placeholder: t('interfacePlaceholder'),
              filterable: true, disabled: props.saving, inputProps: inputProps('mcp-listen-interface'),
              'onUpdate:value': (value) => change('interface', String(value || '')),
            }), true) : null,
            props.draft.mode === 'interface' && props.interfaceError
              ? h(NAlert, { class: 'mcp-span', type: 'warning', showIcon: false }, { default: () => props.interfaceError }) : null,
            props.draft.mode === 'address' ? settingField('mcp-listen-address', t('listenAddress'), h(NInput, {
              value: props.draft.address, placeholder: t('addressPlaceholder'), maxlength: 64, disabled: props.saving,
              inputProps: inputProps('mcp-listen-address'),
              status: props.draft.address && !validIP(props.draft.address.trim()) ? 'error' : undefined,
              'onUpdate:value': (value) => change('address', String(value || '')),
            }), true) : null,
            settingField('mcp-direct-address', t('direct'), h('output', { class: 'mcp-derived-address' }, props.direct), true),
            settingField('mcp-capture-timeout', t('timeout'), h(NInputNumber, {
              value: props.draft.timeout, min: 1, max: 15, precision: 0, disabled: props.saving,
              inputProps: inputProps('mcp-capture-timeout'), 'onUpdate:value': (value) => change('timeout', value),
            })),
          ]),
        ]),
      ])
    },
  })

  const ToolAccessPanel = defineComponent({
    name: 'MCPToolAccessPanel',
    props: { policy: String, rows: Array, tools: Array, loading: Boolean, error: String, disabled: Boolean },
    emits: ['update:policy', 'rule', 'refresh'],
    setup(props, { emit }) {
      return () => h('article', { class: 'mcp-card mcp-access-card' }, [
        h('div', { class: 'mcp-token-heading' }, [
          h('strong', t('toolAccess')),
          h(NButton, { secondary: true, loading: props.loading, disabled: props.disabled, onClick: () => emit('refresh') }, { default: () => t('refresh') }),
        ]),
        settingField('mcp-tool-default', t('toolDefault'), h(NSelect, { value: props.policy, disabled: props.disabled,
          options: [{ label: t('allow'), value: 'allow' }, { label: t('deny'), value: 'deny' }],
          inputProps: { 'aria-labelledby': 'mcp-tool-default-label' },
          'onUpdate:value': (value) => emit('update:policy', value),
        })),
        h('p', { class: 'mcp-hint' }, t('toolHint')),
        props.error ? h(NAlert, { type: 'error', showIcon: false }, { default: () => props.error }) : null,
        !props.rows.length ? h('p', { class: 'mcp-hint', role: 'status' }, props.loading ? t('pluginsLoading') : props.error ? '' : t('pluginsEmpty')) : null,
        !props.error ? h('div', { class: 'mcp-access-list' }, props.rows.map((row) => h('div', { class: 'mcp-access-row', key: row.id, 'data-plugin': row.id }, [
          h('div', { class: 'mcp-access-name' }, [h('strong', row.name), row.name !== row.id ? h('small', row.id) : null]),
          h(NTag, { bordered: false }, { default: () => row.count ? `${t('toolCount')}: ${row.count}` : t('noTools') }),
          h(NSelect, { value: row.rule, disabled: props.disabled,
            options: [{ label: t('followDefault'), value: 'default' }, { label: t('allow'), value: 'allow' }, { label: t('deny'), value: 'deny' }],
            'aria-label': `${row.name} · ${t('toolAccess')}`,
            'onUpdate:value': (value) => emit('rule', row.id, value),
          }),
        ]))) : null,
        !props.error && props.tools.length ? h(ToolList, { tools: props.tools }) : null,
      ])
    },
  })

  const Page = defineComponent({
    name: 'MCPPage',
    props: { host: { type: Object, required: true } },
    setup(props) {
      const initial = props.host.extension.value.settings || {}
      const toolAccess = useToolAccess(initial, () => props.host.invoke('tools', {}), props.host.extension.value.version)
      const initialTimeout = readTimeout(initial)
      const captureTimeout = ref(initialTimeout)
      const savedTimeout = ref(initialTimeout)
      const listenMode = ref(readMode(initial))
      const savedMode = ref(listenMode.value)
      const listenInterface = ref(readText(initial, 'listen_interface'))
      const savedInterface = ref(listenInterface.value)
      const listenAddress = ref(readText(initial, 'listen_address'))
      const savedAddress = ref(listenAddress.value)
      const listenPort = ref(readPort(initial))
      const savedPort = ref(listenPort.value)
      const interfaces = ref([])
      const interfaceError = ref('')
      const tokenDraft = ref('')
      const tokenTouched = ref(false)
      const saving = ref(false)
      const error = ref('')
      const dialog = useDialog()
      const message = useMessage()
      const endpoint = computed(() => {
        try {
          return new URL('/plugins/mcp', window.location.origin).href
        } catch (_) {
          return '/plugins/mcp'
        }
      })
      const interfaceOptions = computed(() => {
        const options = interfaces.value
          .filter((item) => item && validInterfaceName(item.name))
          .map((item) => {
            const addresses = (item.addresses || []).map(addressText).filter(Boolean)
            const address = addresses.find((value) => value.includes('.')) || addresses[0]
            return { value: item.name, label: address ? `${item.name} · ${address}` : item.name }
          })
        if (listenInterface.value && !options.some((item) => item.value === listenInterface.value))
          options.unshift({ value: listenInterface.value, label: listenInterface.value })
        return options
      })
      const directHost = computed(() => {
        if (listenMode.value === 'interface') {
          const selected = interfaces.value.find((item) => item?.name === listenInterface.value)
          const addresses = (selected?.addresses || []).map(addressText).filter(Boolean)
          return addresses.find((value) => value.includes('.')) || addresses[0] || ''
        }
        if (listenMode.value === 'address') return listenAddress.value.trim()
        return window.location.hostname || '0.0.0.0'
      })
      const directEndpoint = computed(() => {
        const host = formatHost(directHost.value)
        return host && Number.isInteger(listenPort.value) ? `http://${host}:${listenPort.value}/` : ''
      })
      const configured = computed(() => props.host.extension.value.secrets_configured?.includes('/access_token') === true)
      const listenValid = computed(() => {
        if (!Number.isInteger(listenPort.value) || listenPort.value < 1024 || listenPort.value > 65535) return false
        if (listenMode.value === 'interface') return validInterfaceName(listenInterface.value)
        if (listenMode.value === 'address') return validIP(listenAddress.value.trim())
        return listenMode.value === 'all'
      })
      const dirty = computed(() => toolAccess.dirty.value || tokenTouched.value || captureTimeout.value !== savedTimeout.value ||
        listenMode.value !== savedMode.value || listenInterface.value !== savedInterface.value ||
        listenAddress.value !== savedAddress.value || listenPort.value !== savedPort.value)
      const valid = computed(() => toolAccess.valid.value && listenValid.value && Number.isInteger(captureTimeout.value) &&
        captureTimeout.value >= 1 && captureTimeout.value <= 15 &&
        (!tokenTouched.value || (tokenDraft.value.length >= 16 && tokenDraft.value.length <= 128)))
      const unregister = props.host.registerSettings({
        dirty,
        valid,
        showHostActions: false,
        collect: () => {
          const settings = {
            ...toolAccess.collect(),
            capture_timeout_seconds: captureTimeout.value,
            listen_mode: listenMode.value,
            listen_interface: listenInterface.value,
            listen_address: listenAddress.value.trim(),
            port: listenPort.value,
          }
          if (tokenTouched.value) settings.access_token = tokenDraft.value
          return settings
        },
        reset: (settings) => {
          toolAccess.reset(settings)
          const timeout = readTimeout(settings)
          captureTimeout.value = timeout
          savedTimeout.value = timeout
          listenMode.value = readMode(settings)
          savedMode.value = listenMode.value
          listenInterface.value = readText(settings, 'listen_interface')
          savedInterface.value = listenInterface.value
          listenAddress.value = readText(settings, 'listen_address')
          savedAddress.value = listenAddress.value
          listenPort.value = readPort(settings)
          savedPort.value = listenPort.value
          tokenDraft.value = ''
          tokenTouched.value = false
          error.value = ''
        },
      })
      onBeforeUnmount(unregister)
      onMounted(() => toolAccess.load(false))
      onMounted(async () => {
        try {
          const response = await fetch(apiURL('/api/network/interfaces'), { credentials: 'same-origin', cache: 'no-store' })
          if (!response.ok) throw new Error(t('interfacesFailed'))
          const data = await response.json()
          interfaces.value = Array.isArray(data) ? data : []
        } catch (_) {
          interfaceError.value = t('interfacesFailed')
        }
      })

      function setToken(value) {
        tokenDraft.value = String(value || '')
        tokenTouched.value = true
      }

      function showToken(token) {
        dialog.success({
          title: t('tokenReady'),
          content: () => h('div', { class: 'mcp-token-dialog' }, [
            h('p', t('copyPrompt')),
            h(NInput, {
              value: token,
              readonly: true,
              type: 'text',
              onFocus: (event) => event.target?.select?.(),
            }),
          ]),
          positiveText: t('copy'),
          negativeText: t('close'),
          maskClosable: false,
          onPositiveClick: async () => {
            try {
              await copyText(token, t('copyFailed'))
              message.success(t('copied'))
              return true
            } catch (_) {
              message.error(t('copyFailed'))
              return false
            }
          },
        })
      }

      async function save() {
        if (!dirty.value || !valid.value || saving.value) return false
        saving.value = true
        error.value = ''
        try {
          const saved = await props.host.saveSettings()
          if (saved) await toolAccess.load()
          return saved
        } catch (reason) {
          error.value = reason instanceof Error ? reason.message : String(reason)
          return false
        } finally {
          saving.value = false
        }
      }

      async function generate() {
        if (saving.value) return
        let token
        try {
          token = randomToken(t('randomFailed'))
        } catch (reason) {
          error.value = reason instanceof Error ? reason.message : String(reason)
          return
        }
        setToken(token)
        if (await save()) showToken(token)
      }

      return () => h('section', { class: 'mcp-page' }, [
        error.value ? h(NAlert, { type: 'error', showIcon: false }, { default: () => error.value }) : null,
        h(ConnectionSettings, {
          endpoint: endpoint.value, direct: directEndpoint.value, interfaces: interfaceOptions.value,
          configured: configured.value, saving: saving.value, interfaceError: interfaceError.value,
          draft: { mode: listenMode.value, port: listenPort.value, interface: listenInterface.value,
            address: listenAddress.value, timeout: captureTimeout.value, token: tokenDraft.value },
          onChange: (field, value) => {
            if (field === 'token') setToken(value)
            else ({ mode: listenMode, port: listenPort, interface: listenInterface,
              address: listenAddress, timeout: captureTimeout })[field].value = value
          },
          onGenerate: generate,
        }),
        h(ToolAccessPanel, {
          policy: toolAccess.defaultPolicy.value, rows: toolAccess.rows.value, tools: toolAccess.tools.value, loading: toolAccess.loading.value,
          error: toolAccess.loadError.value, disabled: saving.value,
          'onUpdate:policy': (value) => { toolAccess.defaultPolicy.value = value },
          onRule: toolAccess.setRule, onRefresh: toolAccess.load,
        }),
        h('div', { class: 'mcp-save' }, [
          h(NButton, { type: 'primary', loading: saving.value, disabled: !dirty.value || !valid.value, onClick: save }, { default: () => t('save') }),
        ]),
      ])
    },
  })

  runtime.register('mcp', {
    apiVersion: 1,
    component: Page,
    styles: [`
      .mcp-page { display: grid; gap: 14px; }
      .mcp-hint, .mcp-field small { margin: 0; color: var(--n-text-color-3, #888); }
      .mcp-field small { font-size: 12px; line-height: 1.45; }
      .mcp-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .45fr); gap: 14px; padding: 14px; border: 1px solid var(--n-border-color, #444); border-radius: 8px; background: transparent; }
      .mcp-connection { display: grid; gap: 14px; min-width: 0; }
      .mcp-connection-card { grid-template-columns: minmax(0, 1fr); }
      .mcp-token-group { display: grid; gap: 10px; }
      .mcp-advanced { display: block; }
      .mcp-advanced summary { cursor: pointer; font-weight: 600; }
      .mcp-advanced-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .45fr); gap: 14px; margin-top: 14px; }
      .mcp-derived-address { font-family: monospace; overflow-wrap: anywhere; user-select: all; }
      .mcp-field { display: grid; gap: 7px; }
      .mcp-span { grid-column: 1 / -1; }
      .mcp-field > span { font-size: 13px; font-weight: 600; }
      .mcp-token-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .mcp-token-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; }
      .mcp-save { display: flex; justify-content: flex-end; }
      .mcp-token-dialog { display: grid; gap: 12px; }
      .mcp-token-dialog p { margin: 0; }
      .mcp-access-card { grid-template-columns: minmax(0, 1fr); }
      .mcp-access-list { display: grid; gap: 12px; max-height: 360px; overflow-y: auto; padding-right: 4px; }
      .mcp-access-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(140px, 180px); gap: 12px; align-items: center; }
      .mcp-access-name { display: grid; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
      .mcp-access-name small { color: var(--n-text-color-3, #888); }
      .mcp-tool-list { display: grid; gap: 12px; min-width: 0; }
      .mcp-tool-list h3 { margin: 0; font-size: 15px; }
      .mcp-tool-filters { display: grid; grid-template-columns: minmax(0, 1fr) minmax(140px, 180px); gap: 12px; align-items: end; }
      .mcp-tool-pagination { display: flex; justify-content: flex-end; min-width: 0; }
      .mcp-tool-pagination .n-pagination { flex-wrap: wrap; justify-content: flex-end; }
      .mcp-tool-scroll { min-width: 0; overflow-x: auto; }
      .mcp-tool-table { width: 100%; min-width: 560px; border-collapse: collapse; text-align: left; font-size: 13px; }
      .mcp-tool-table th, .mcp-tool-table td { padding: 12px 8px; border-bottom: 1px solid var(--n-border-color, #444); vertical-align: top; }
      .mcp-tool-table th { font-weight: 600; }
      .mcp-tool-table td:first-child { width: 65%; overflow-wrap: anywhere; }
      .mcp-tool-table code, .mcp-tool-table strong { display: block; }
      .mcp-tool-table p { margin: 4px 0 0; color: var(--n-text-color-3, #888); line-height: 1.5; }
      @media (max-width: 440px) { .mcp-access-row { grid-template-columns: minmax(0, 1fr) auto; } .mcp-access-row > .n-select { grid-column: 1 / -1; } }
      @media (max-width: 700px) { .mcp-card, .mcp-token-actions, .mcp-advanced-grid, .mcp-tool-filters { grid-template-columns: 1fr; } .mcp-token-actions .n-button { width: 100%; } }
    `],
  })
})()
