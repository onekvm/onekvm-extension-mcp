(() => {
  const runtime = window.OneKVMPluginUI.v1
  const { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } = runtime.vue
  const { NAlert, NButton, NInput, NInputNumber, NSelect, NTag, useDialog, useMessage } = runtime.naive

  const messages = {
    en: {
      title: 'MCP connection',
      description: 'Let authenticated AI agents capture the screen and operate the keyboard, mouse, and available ATX controls.',
      endpoint: 'MCP endpoint',
      listen: 'Listen interface',
      listenHint: 'Choose 0.0.0.0, a network interface, or an IP address.',
      listenAll: 'All interfaces (0.0.0.0)',
      listenInterface: 'Interface',
      listenAddress: 'IP address',
      interfacePlaceholder: 'Choose an interface',
      addressPlaceholder: 'Enter an IP address',
      port: 'Port',
      direct: 'Direct address',
      directHint: 'MCP clients connect to this address and port with the access token. This address uses HTTP.',
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
    },
    zh: {
      title: 'MCP 连接',
      description: '让经过鉴权的 AI Agent 截取屏幕，并操作键盘、鼠标和可用的 ATX 控制。',
      endpoint: 'MCP 端点',
      listen: '监听接口',
      listenHint: '可以选择 0.0.0.0、一个网络接口，或填写 IP 地址。',
      listenAll: '所有接口（0.0.0.0）',
      listenInterface: '选择接口',
      listenAddress: 'IP 地址',
      interfacePlaceholder: '选择接口',
      addressPlaceholder: '输入 IP 地址',
      port: '端口',
      direct: '直接地址',
      directHint: 'MCP 客户端使用访问令牌连接这个地址和端口。这个地址使用 HTTP。',
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
    },
    'zh-TW': {
      title: 'MCP 連線',
      description: '讓經過鑑權的 AI Agent 擷取螢幕，並操作鍵盤、滑鼠和可用的 ATX 控制。',
      endpoint: 'MCP 端點',
      listen: '監聽介面',
      listenHint: '可以選擇 0.0.0.0、一個網路介面，或填寫 IP 位址。',
      listenAll: '所有介面（0.0.0.0）',
      listenInterface: '選擇介面',
      listenAddress: 'IP 位址',
      interfacePlaceholder: '選擇介面',
      addressPlaceholder: '輸入 IP 位址',
      port: '連接埠',
      direct: '直接位址',
      directHint: 'MCP 用戶端使用存取權杖連線這個位址和連接埠。這個位址使用 HTTP。',
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
    },
  }
  const t = runtime.i18n.createTranslator(messages)

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

  function useToolAccess(initial, invokeTools) {
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
    const rows = computed(() => {
      const installedNames = new Map(plugins.value.filter((item) => item?.installed && validID(item.id))
        .map((item) => [item.id, item.name || item.id]))
      const counts = new Map()
      inventory.value.filter((tool) => tool.source !== 'mcp').forEach((tool) => counts.set(tool.source, (counts.get(tool.source) || 0) + 1))
      const names = new Map([...counts.keys()].map((id) => [id, installedNames.get(id) || id]))
      Object.keys(rules.value).forEach((id) => { if (!names.has(id)) names.set(id, id) })
      return [...names].sort(([a], [b]) => a.localeCompare(b)).map(([id, name]) => ({
        id, name: installedNames.get(id) || name, rule: rules.value[id] || 'default', count: counts.get(id) || 0,
      }))
    })
    const tools = computed(() => inventory.value.map((tool) => ({ ...tool,
      sourceName: tool.source === 'mcp' ? t('builtin') : plugins.value.find((plugin) => plugin.id === tool.source)?.name || tool.source,
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
    async function load() {
      if (loading.value) return
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
        plugins.value = data
        inventory.value = result.tools
      } catch (reason) {
        if (reason?.name !== 'AbortError') loadError.value = t('pluginsFailed')
      } finally {
        loading.value = false
      }
    }
    reset(initial)
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
      return () => h('div', { class: 'mcp-tool-list' }, [
        h('h3', { id: 'mcp-tool-list-title' }, t('toolList')),
        h('p', { class: 'mcp-hint' }, t('toolListHint')),
        h('div', { class: 'mcp-tool-scroll', tabindex: 0, role: 'region', 'aria-labelledby': 'mcp-tool-list-title' }, [
          h('table', { class: 'mcp-tool-table', 'aria-labelledby': 'mcp-tool-list-title' }, [
            h('thead', [h('tr', ['toolName', 'toolSource', 'toolStatus'].map((key) => h('th', { scope: 'col' }, t(key))))]),
            h('tbody', props.tools.map((tool) => h('tr', { key: tool.name, 'data-tool': tool.name }, [
              h('td', [h('code', tool.name), tool.title ? h('strong', tool.title) : null, h('p', tool.description)]),
              h('td', tool.sourceName),
              h('td', [h(NTag, { type: tool.allowed ? 'success' : 'warning', bordered: false }, { default: () => tool.allowed ? t('available') : t('prohibited') })]),
            ]))),
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
        h('label', { class: 'mcp-field' }, [
          h('span', t('toolDefault')),
          h(NSelect, { value: props.policy, disabled: props.disabled,
            options: [{ label: t('allow'), value: 'allow' }, { label: t('deny'), value: 'deny' }],
            'aria-label': t('toolDefault'), 'onUpdate:value': (value) => emit('update:policy', value),
          }),
        ]),
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
      const toolAccess = useToolAccess(initial, () => props.host.invoke('tools', {}))
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
      onMounted(toolAccess.load)
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
        h('h2', t('title')),
        h('p', { class: 'mcp-description' }, t('description')),
        error.value ? h(NAlert, { type: 'error', showIcon: false }, { default: () => error.value }) : null,
        interfaceError.value ? h(NAlert, { type: 'warning', showIcon: false }, { default: () => interfaceError.value }) : null,
        h('article', { class: 'mcp-card' }, [
          h('label', { class: 'mcp-field' }, [
            h('span', t('listen')),
            h(NSelect, {
              value: listenMode.value,
              options: [
                { label: t('listenAll'), value: 'all' },
                { label: t('listenInterface'), value: 'interface' },
                { label: t('listenAddress'), value: 'address' },
              ],
              disabled: saving.value,
              'onUpdate:value': (value) => { listenMode.value = value === 'interface' || value === 'address' ? value : 'all' },
            }),
            h('small', t('listenHint')),
          ]),
          h('label', { class: 'mcp-field' }, [
            h('span', t('port')),
            h(NInputNumber, {
              value: listenPort.value,
              min: 1024,
              max: 65535,
              precision: 0,
              disabled: saving.value,
              'onUpdate:value': (value) => { listenPort.value = value },
            }),
          ]),
          listenMode.value === 'interface' ? h('label', { class: 'mcp-field mcp-span' }, [
            h('span', t('listenInterface')),
            h(NSelect, {
              value: listenInterface.value || null,
              options: interfaceOptions.value,
              placeholder: t('interfacePlaceholder'),
              filterable: true,
              disabled: saving.value,
              'onUpdate:value': (value) => { listenInterface.value = String(value || '') },
            }),
          ]) : null,
          listenMode.value === 'address' ? h('label', { class: 'mcp-field mcp-span' }, [
            h('span', t('listenAddress')),
            h(NInput, {
              value: listenAddress.value,
              placeholder: t('addressPlaceholder'),
              maxlength: 64,
              disabled: saving.value,
              status: listenAddress.value && !validIP(listenAddress.value.trim()) ? 'error' : undefined,
              'onUpdate:value': (value) => { listenAddress.value = String(value || '') },
            }),
          ]) : null,
          h('label', { class: 'mcp-field mcp-span' }, [
            h('span', t('direct')),
            h(NInput, { value: directEndpoint.value, readonly: true }),
            h('small', t('directHint')),
          ]),
        ]),
        h('article', { class: 'mcp-card' }, [
          h('label', { class: 'mcp-field' }, [
            h('span', t('endpoint')),
            h(NInput, { value: endpoint.value, readonly: true }),
          ]),
          h('label', { class: 'mcp-field' }, [
            h('span', t('timeout')),
            h(NInputNumber, {
              value: captureTimeout.value,
              min: 1,
              max: 15,
              precision: 0,
              disabled: saving.value,
              'onUpdate:value': (value) => { captureTimeout.value = value },
            }),
          ]),
        ]),
        h('article', { class: 'mcp-card mcp-token-card' }, [
          h('div', { class: 'mcp-token-heading' }, [
            h('strong', t('token')),
            h(NTag, { type: configured.value ? 'success' : 'warning', bordered: false }, { default: () => configured.value ? t('configured') : t('notConfigured') }),
          ]),
          h('p', { class: 'mcp-hint' }, t('tokenHint')),
          h('div', { class: 'mcp-token-actions' }, [
            h(NInput, {
              value: tokenDraft.value,
              type: 'password',
              showPasswordOn: 'click',
              maxlength: 128,
              autocomplete: 'new-password',
              placeholder: t('tokenPlaceholder'),
              disabled: saving.value,
              'onUpdate:value': setToken,
            }),
            h(NButton, { secondary: true, loading: saving.value, onClick: generate }, { default: () => configured.value ? t('regenerate') : t('generate') }),
          ]),
        ]),
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
      .mcp-page h2 { margin: 0; font-size: 18px; }
      .mcp-description, .mcp-hint, .mcp-field small { margin: 0; color: var(--n-text-color-3, #888); }
      .mcp-field small { font-size: 12px; line-height: 1.45; }
      .mcp-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .45fr); gap: 14px; padding: 14px; border: 1px solid var(--n-border-color, #444); border-radius: 8px; background: transparent; }
      .mcp-token-card { grid-template-columns: 1fr; }
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
      .mcp-tool-scroll { min-width: 0; overflow-x: auto; }
      .mcp-tool-table { width: 100%; min-width: 560px; border-collapse: collapse; text-align: left; font-size: 13px; }
      .mcp-tool-table th, .mcp-tool-table td { padding: 12px 8px; border-bottom: 1px solid var(--n-border-color, #444); vertical-align: top; }
      .mcp-tool-table th { font-weight: 600; }
      .mcp-tool-table td:first-child { width: 65%; overflow-wrap: anywhere; }
      .mcp-tool-table code, .mcp-tool-table strong { display: block; }
      .mcp-tool-table p { margin: 4px 0 0; color: var(--n-text-color-3, #888); line-height: 1.5; }
      @media (max-width: 440px) { .mcp-access-row { grid-template-columns: minmax(0, 1fr) auto; } .mcp-access-row > .n-select { grid-column: 1 / -1; } }
      @media (max-width: 700px) { .mcp-card, .mcp-token-actions { grid-template-columns: 1fr; } .mcp-token-actions .n-button { width: 100%; } }
    `],
  })
})()
