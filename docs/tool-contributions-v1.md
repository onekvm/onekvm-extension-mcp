# MCP tool contributions v1

MCP publishes the manifest extension point `mcp.tool`, version 1. It requires a
Core version with the local contribution bridge described in
`onekvm-core/docs/extension-contributions-v1.md`.

Contributors declare a public method and one contribution per tool:

```json
{
  "methods": [{"name": "status", "command": ["bin/status"]}],
  "contributions": [{
    "point": "mcp.tool",
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

MCP forwards the arguments object unchanged through the host's declared method
interface. The handler must validate its arguments against its schema. Command
methods also receive the host's ordinary declared-argument validation. Return
one JSON value: MCP presents it as text, and object results also appear as
`structuredContent`. Handler failures return `isError: true`.

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

The MCP settings page lists installed plugins and retained overrides, including
disabled plugins, so access can be configured in advance. Save settings to
apply changes; the existing settings lifecycle restarts the MCP service.

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
