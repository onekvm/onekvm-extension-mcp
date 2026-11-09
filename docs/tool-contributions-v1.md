# MCP tool contributions v1

MCP publishes the manifest extension point `extend.mcp`, version 1, owned by the
`mcp` plugin. `mcp.tool` remains a declared compatibility alias: the host merges
old and new contributors and deduplicates their local IDs. Tool names and
argument/result contracts are unchanged. Install the registry-capable host and
Core before upgrading the MCP provider or contributor declarations. It requires a
Core version with the local contribution bridge described in
`onekvm-core/docs/extension-contributions-v1.md`.

Contributors declare a public method and one contribution per tool:

```json
{
  "methods": [{"name": "status", "command": ["bin/status"]}],
  "contributions": [{
    "point": "extend.mcp",
    "id": "status",
    "version": 1,
    "method": "status",
    "data": {
      "title": "Service status",
      "description": "Read the service status.",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    }
  }]
}
```

For an extension named `example`, the MCP name is `example__status`. The local
contribution ID follows host ID rules (lowercase letters, digits and hyphens,
at most 63 characters). `description` is required and limited to 2,048 UTF-8
bytes; optional `title` is limited to 256. `inputSchema` must be an object schema.
The host limits each complete contribution to 16 KiB. MCP ignores incompatible
versions and invalid declarations. A plugin cannot claim another plugin's name.

### Localized display text

The settings tool table follows the current UI language. Contributors can add
`data.i18n` with `default` (English), `zh` and `zh-TW` catalogs containing
`title` and `description`. For example:

```json
"i18n": {
  "default": {"title": "Service status", "description": "Read the service status."},
  "zh": {"title": "服务状态", "description": "读取服务状态。"},
  "zh-TW": {"title": "服務狀態", "description": "讀取服務狀態。"}
}
```

Keep the canonical English `data.title` and `data.description`; `default` must
match them. Each translated field has the same UTF-8 byte limit as its canonical
field. The management inventory forwards valid display fields for `default`,
`en`, `zh` and `zh-TW`; malformed, empty or oversized fields are omitted. UI
locale matching and fallback use the shared extension translator. Missing
fields fall back to the canonical English text, including older tools without
translations. Switching language does not require a tool-list reload. Built-in
tools also have English, Simplified Chinese and Traditional Chinese display text.

MCP `tools/list` keeps the canonical English description and input schema, and
does not include this display metadata. Tool names, argument names and access
policy are independent of the UI language.

MCP forwards the arguments object unchanged through the host's declared method
interface. The handler must validate its arguments against its schema. Command
methods also receive the host's ordinary declared-argument validation. Return
one JSON value: MCP presents it as text, and object results also appear as
`structuredContent`. Handler failures return `isError: true`.

An image-producing contributor may instead return a complete MCP tool result:
an object with a `content` array and an object-valued `structuredContent` field.
The MCP host forwards that content array unchanged, so image blocks can use the
standard `type: "image"`, base64 `data`, and `mimeType` fields. Older object
results without both fields keep the text plus structured-content behavior above.

Every list and call resolves the active registry again. Disabled, removed and
pending-upgrade contributors are excluded; calls carry the observed lifecycle
generation and the bridge rejects stale entries. Discovery failure is an error,
not an empty registry. The stateless HTTP transport has no push notifications;
clients refresh the list with `tools/list`.

## Access settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `tool_default_policy` | `allow` | `allow` or `deny` for plugins without an override. |
| `tool_allowed_plugins` | empty | Comma-separated plugin IDs explicitly allowed. |
| `tool_denied_plugins` | empty | Comma-separated plugin IDs explicitly prohibited. |

Lists accept surrounding whitespace per ID and are limited to 4,096 bytes.
Malformed policies fail the health check. Prohibition wins if an ID appears in
both lists. The same check applies to listing and direct calls, including a
client's cached tool names. The built-in screenshot, HID and ATX tools retain
their existing names and behavior. These rules govern contributed tools.

The MCP settings page lists plugins with registered, valid tools and retained
overrides. Plugins without tools do not acquire a tool-access row merely by being
installed. An override is retained if its plugin is disabled or removed; its row
then reports no registered tools. Save settings to apply changes.

The tool table shows built-in and contributed tool names, descriptions, sources,
and availability under the saved policy. ATX tools follow the same capability
probe as MCP discovery. The authenticated `tools` extension method reads this
inventory without requiring or revealing the MCP bearer token. Prohibited tools
remain visible to administrators in this inventory, while MCP `tools/list` and
direct calls continue to exclude them. Discovery failures are reported as errors.
The settings page reuses one in-memory inventory snapshot for up to one minute
across navigation. Refresh tools and successful settings saves fetch it again;
plugin-change and access-change events clear it. Snapshots are keyed by the
device API URL, MCP version and saved access policy, contain only tool metadata
and plugin display names, and are discarded on a full page reload. This display
cache does not change MCP discovery or invocation authorization.

## Acceptance fixture

Build from the workspace's `onekvm-distro`:

```sh
ONEKVM_DEBUG_WORKTREES=onekvm-core,onekvm-extension-mcp \
  make ONEKVM_MACHINE=onekvm-nanokvm build package \
  onekvm-core onekvm-extension-mcp onekvm-extension-mcp-tool-probe
```

The probe is excluded from world builds and production images. Install it only
on a test device, enable it and MCP, then verify `mcp-tool-probe__status` appears
and returns an incrementing counter. Prohibiting the plugin must hide it and
reject direct calls without incrementing that counter. Also verify default
deny, explicit allow, disable/enable and removal. Purge the probe afterward.
