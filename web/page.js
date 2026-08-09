(() => {
  const runtime = window.OneKVMPluginUI.v1
  const { computed, defineComponent, h, onBeforeUnmount, onMounted, ref } = runtime.vue
  const { NAlert, NButton, NInput, NInputNumber, NTag, useDialog, useMessage } = runtime.naive

  const messages = {
    en: {
      title: 'MCP connection',
      description: 'Let authenticated AI agents capture the screen and operate the keyboard, mouse, and available ATX controls.',
      endpoint: 'MCP endpoint',
      token: 'Access token',
      tokenHint: 'Enter 16–128 characters, or securely generate a static random token in this browser.',
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
    },
    'zh-CN': {
      title: 'MCP 连接',
      description: '让经过鉴权的 AI Agent 截取屏幕，并操作键盘、鼠标和可用的 ATX 控制。',
      endpoint: 'MCP 端点',
      token: '访问令牌',
      tokenHint: '输入 16–128 个字符，或使用浏览器安全生成一个静态随机令牌。',
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
    },
    'zh-TW': {
      title: 'MCP 連線',
      description: '讓經過鑑權的 AI Agent 擷取螢幕，並操作鍵盤、滑鼠和可用的 ATX 控制。',
      endpoint: 'MCP 端點',
      token: '存取權杖',
      tokenHint: '輸入 16–128 個字元，或使用瀏覽器安全產生一個靜態隨機權杖。',
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
    },
  }

  function resolveLocale(value) {
    const locale = String(value || '').trim().toLowerCase().replace(/_/g, '-')
    if (!locale) return ''
    if (locale === 'en' || locale.startsWith('en-')) return 'en'
    if (locale !== 'zh' && !locale.startsWith('zh-')) return ''
    const parts = locale.split('-')
    return parts.includes('hant') || parts.some((part) => ['tw', 'hk', 'mo'].includes(part))
      ? 'zh-TW'
      : 'zh-CN'
  }

  function detectLocale() {
    const browserLocales = navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
    const candidates = [document.documentElement.lang, ...browserLocales]
    for (const candidate of candidates) {
      const locale = resolveLocale(candidate)
      if (locale) return locale
    }
    return 'en'
  }

  function readTimeout(settings) {
    const value = Number(settings?.capture_timeout_seconds)
    return Number.isInteger(value) && value >= 1 && value <= 15 ? value : 5
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

  const Page = defineComponent({
    name: 'MCPPage',
    props: { host: { type: Object, required: true } },
    setup(props) {
      const initialTimeout = readTimeout(props.host.extension.value.settings)
      const captureTimeout = ref(initialTimeout)
      const savedTimeout = ref(initialTimeout)
      const tokenDraft = ref('')
      const tokenTouched = ref(false)
      const saving = ref(false)
      const error = ref('')
      const locale = ref(detectLocale())
      const dialog = useDialog()
      const message = useMessage()
      const t = (key) => messages[locale.value]?.[key] || messages.en[key] || key
      const endpoint = computed(() => {
        try {
          return new URL('/plugins/mcp', window.location.origin).href
        } catch (_) {
          return '/plugins/mcp'
        }
      })
      const configured = computed(() => props.host.extension.value.secrets_configured?.includes('/access_token') === true)
      const dirty = computed(() => tokenTouched.value || captureTimeout.value !== savedTimeout.value)
      const valid = computed(() => Number.isInteger(captureTimeout.value) && captureTimeout.value >= 1 && captureTimeout.value <= 15 &&
        (!tokenTouched.value || (tokenDraft.value.length >= 16 && tokenDraft.value.length <= 128)))
      const unregister = props.host.registerSettings({
        dirty,
        valid,
        showHostActions: false,
        collect: () => {
          const settings = { capture_timeout_seconds: captureTimeout.value }
          if (tokenTouched.value) settings.access_token = tokenDraft.value
          return settings
        },
        reset: (settings) => {
          const timeout = readTimeout(settings)
          captureTimeout.value = timeout
          savedTimeout.value = timeout
          tokenDraft.value = ''
          tokenTouched.value = false
          error.value = ''
        },
      })
      const localeObserver = new MutationObserver(() => {
        locale.value = detectLocale()
      })
      onMounted(() => {
        localeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['lang'],
        })
      })
      onBeforeUnmount(() => {
        unregister()
        localeObserver.disconnect()
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
          return await props.host.saveSettings()
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
      .mcp-description, .mcp-hint { margin: 0; color: var(--n-text-color-3, #888); }
      .mcp-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .45fr); gap: 14px; padding: 14px; border: 1px solid var(--n-border-color, #444); border-radius: 8px; background: transparent; }
      .mcp-token-card { grid-template-columns: 1fr; }
      .mcp-field { display: grid; gap: 7px; }
      .mcp-field > span { font-size: 13px; font-weight: 600; }
      .mcp-token-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .mcp-token-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; }
      .mcp-save { display: flex; justify-content: flex-end; }
      .mcp-token-dialog { display: grid; gap: 12px; }
      .mcp-token-dialog p { margin: 0; }
      @media (max-width: 700px) { .mcp-card, .mcp-token-actions { grid-template-columns: 1fr; } .mcp-token-actions .n-button { width: 100%; } }
    `],
  })
})()
