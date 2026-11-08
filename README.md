# OneKVM MCP Extension

English | [简体中文](README.zh-CN.md)

This extension gives authenticated AI agents a Model Context Protocol (MCP) endpoint for viewing and operating the computer connected to OneKVM. An agent can capture the current screen, send keyboard and mouse input, and use the device's ATX controls when they are available.

It is installed separately from OneKVM Core, so you can enable, disable, or remove it without modifying Core itself.

> **Build note:** This repository contains the extension source code only. Release packages are built by the OpenEmbedded recipes in `onekvm-distro`; there is currently no standalone release build in this repository.

## What you can do

- Capture the current OneKVM video frame as a JPEG image
- Send individual USB HID key usages, including modifiers and key-down or key-up events
- Type US-ASCII text with a configurable delay between keystrokes
- Move the pointer using pixel coordinates from the most recent screen capture
- Click the left, right, or middle mouse button and scroll the mouse wheel
- Read the attached computer's power and disk LED state when ATX control is available
- Briefly press the power button, hold it to force power off, or press reset when ATX control is available
- Connect MCP clients through a stateless Streamable HTTP endpoint protected by a dedicated bearer token
- Run a local MCP client such as Codex through the standard stdin/stdout transport as the dedicated `codex` user

## Install and enable

The package name is `onekvm-extension-mcp`. Install it through your OneKVM distribution package or image, then use the plugin manager to enable or disable it:

```sh
onekvm-extension enable mcp
onekvm-extension disable mcp
```

## Configure and connect

Open the MCP extension page, copy the **MCP address**, and configure an
**Access token** of 16–128 characters. You can also generate a cryptographically
secure 64-character token in the browser; copy it from the one-time dialog
after it is saved. The MCP address uses the OneKVM web port:

```text
https://<your-onekvm-host>/plugins/mcp
```

Expand **Advanced connection settings** to configure direct TCP connections:

- **Listen mode:** choose all interfaces (`0.0.0.0`), a network interface, or an IP address. Interface mode listens on that interface's address.
- **Port:** choose 1024–65535, default 9710. This is the direct TCP port; the web MCP address keeps using the OneKVM web port.
- **TCP connection address:** copy the resulting `http://<device-address>:<port>/` address if your client connects directly. All-interface mode shows a reachable device address. Direct connections use HTTP.
- **Screen capture timeout:** choose how long to wait for a video frame, from 1 to 15 seconds, default 5.

Existing listen and port settings are preserved. You do not need to change them
to use the web MCP address.

Every request must include the configured token. The web address checks only this token. A device login is not required.

```http
Authorization: Bearer <access-token>
```

The endpoint accepts MCP over stateless Streamable HTTP and supports protocol versions `2024-11-05`, `2025-03-26`, and `2025-06-18`. Your MCP client must support custom HTTP authorization headers.

The package also provides a local stdio entrypoint at `/usr/bin/onekvm-mcp-stdio` when the Codex integration package is installed. It forwards JSON-RPC lines to the enabled MCP service over its Unix socket. The service accepts this local transport only from the `codex` system user; network connections and other local users still require the bearer token.

Treat the token as a password and use HTTPS whenever OneKVM is accessed over an untrusted network. Anyone with the token can view the connected computer, control its keyboard and mouse, and potentially operate its power controls.

## Available tools

| Tool | Description |
| --- | --- |
| `screen_capture` | Returns the full screen as JPEG and stores that frame for 30 seconds. |
| `screen_changes` | Returns only the region that changed since the stored frame, or no image when nothing changed. The stored frame expires after 30 seconds. |
| `keyboard_key` | Sends one USB HID keyboard usage with optional modifiers and `press`, `down`, or `up` behavior. |
| `keyboard_type` | Types up to 1,024 bytes of US-ASCII text with an optional 0–1,000 ms interval between characters. |
| `mouse_move` | Moves the absolute pointer to an `x`, `y` pixel coordinate from the most recent capture. |
| `mouse_click_at` | Moves the absolute pointer to an `x`, `y` pixel and clicks there. `button` is `left`, `right`, or `middle`; `count` is 1 or 2. |
| `mouse_click` | Clicks the left, right, or middle button once or twice at the pointer's current position. |
| `mouse_scroll` | Sends a relative mouse-wheel value from -127 to 127. |
| `atx_status` | Reports available power and disk LED state. Advertised only when the device exposes ATX control. |
| `atx_action` | Performs `power_short`, `power_long`, or `reset`. Advertised only when the device exposes ATX control. |

Call `screen_capture` before `mouse_move` or `mouse_click_at`. Coordinates start at `0,0` in the top-left corner and must remain inside the dimensions reported by the latest full capture. A `screen_changes` image is only the changed region: add its origin to `x` and `y`. The stored frame lasts 30 seconds.

`keyboard_type` uses a US keyboard layout and accepts US-ASCII only. For keys or shortcuts that it cannot represent directly, use `keyboard_key` with USB HID usage IDs and modifier bits.

## Plugin tool access

The MCP settings page controls which plugins can expose their declared tools.
Access defaults to allowed and can be changed to prohibited. Each plugin can
follow the default, be explicitly allowed, or be explicitly prohibited. Save
settings to apply changes. Prohibited tools are hidden from MCP clients and direct calls using
cached names are rejected. Built-in capture, HID and ATX tools remain available.
The access list shows plugins with registered tools and plugins with saved
overrides; a retained override without tools is labeled accordingly. The tool
list groups tools by source, with each source's tool count and a Details button.
Sources start collapsed; expand one to see tool names, descriptions and availability
under the saved settings, then use Collapse to close it.
Search matches tool names, descriptions and sources without regard to case.
Combine it with the All, Available or Prohibited status filter.
Only matching tools and their sources are shown. Each expanded source with more
than 10 matching tools has its own pagination, with 10, 20 or 50 tools per page.
Changing search or status returns each source to its first page.
Revisiting the settings page in the same tab reuses
the list for one minute, then refreshes it automatically on entry. Saving settings
or changing plugins invalidates it; Refresh tools always fetches the latest list.
Prohibited tools remain
visible here for management and are excluded from MCP client discovery and calls.
Clients that cache tool lists can refresh the list or reconnect to update their display.

Plugins declare tools through `mcp.tool`, with names `<plugin-id>__<tool-id>`.
See the [tool contribution protocol](docs/tool-contributions-v1.md) for arguments,
results and a minimal example.

## How it works

- OneKVM publishes the extension at `/plugins/mcp` and proxies requests to its private Unix socket. The service also accepts the same requests on the configured TCP address and port.
- The C++20 service implements stateless Streamable HTTP and the MCP `initialize`, `ping`, `tools/list`, and `tools/call` methods.
- Screen captures come from OneKVM's MJPEG media API; keyboard, mouse, and ATX operations go through the authenticated extension control API.
- The bearer token is stored as a secret extension setting and compared in constant time for every MCP request.
- ATX tools are detected dynamically and omitted from `tools/list` when the connected device does not expose ATX controls.
- The settings page uses the Vue and Naive UI environments provided by OneKVM UI instead of bundling another copy of either framework.

## Development note

OneKVM includes the extension version in web asset URLs and marks those assets as immutable. Whenever files under `web/` change, increment the manifest/package version as well. Increasing only the package revision can leave browsers using an older cached version of the settings page.

## License

This project is licensed under the GNU General Public License v3.0. See [`LICENSE`](LICENSE).
