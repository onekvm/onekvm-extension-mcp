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

## Install and enable

The package name is `onekvm-extension-mcp`. Install it through your OneKVM distribution package or image, then use the plugin manager to enable or disable it:

```sh
onekvm-plugin-manager enable mcp
onekvm-plugin-manager disable mcp
```

## Configure and connect

Open the MCP extension page in OneKVM and configure:

- **Access token:** enter a custom token of 16–128 characters, or generate a cryptographically secure 64-character token in the browser. A generated token is shown only once after it is saved, so copy it immediately and store it securely.
- **Screen capture timeout:** choose how long the server waits for a video frame, from 1 to 15 seconds. The default is 5 seconds.

Point your MCP client at:

```text
https://<your-onekvm-host>/plugins/mcp
```

Every request must include the configured token:

```http
Authorization: Bearer <access-token>
```

The endpoint accepts MCP over stateless Streamable HTTP and supports protocol versions `2024-11-05`, `2025-03-26`, and `2025-06-18`. Your MCP client must support custom HTTP authorization headers.

Treat the token as a password and use HTTPS whenever OneKVM is accessed over an untrusted network. Anyone with the token can view the connected computer, control its keyboard and mouse, and potentially operate its power controls.

## Available tools

| Tool | Description |
| --- | --- |
| `screen_capture` | Returns the current screen as JPEG together with its pixel dimensions. |
| `keyboard_key` | Sends one USB HID keyboard usage with optional modifiers and `press`, `down`, or `up` behavior. |
| `keyboard_type` | Types up to 1,024 bytes of US-ASCII text with an optional 0–1,000 ms interval between characters. |
| `mouse_move` | Moves the absolute pointer to an `x`, `y` pixel coordinate from the most recent capture. |
| `mouse_click` | Clicks the left, right, or middle button once or twice. |
| `mouse_scroll` | Sends a relative mouse-wheel value from -127 to 127. |
| `atx_status` | Reports available power and disk LED state. Advertised only when the device exposes ATX control. |
| `atx_action` | Performs `power_short`, `power_long`, or `reset`. Advertised only when the device exposes ATX control. |

Call `screen_capture` before `mouse_move`. Coordinates start at `0,0` in the top-left corner and must remain inside the dimensions reported by the latest capture.

`keyboard_type` uses a US keyboard layout and accepts US-ASCII only. For keys or shortcuts that it cannot represent directly, use `keyboard_key` with USB HID usage IDs and modifier bits.

## How it works

- OneKVM publishes the extension at `/plugins/mcp` and proxies requests to its private Unix socket.
- The C++20 service implements stateless Streamable HTTP and the MCP `initialize`, `ping`, `tools/list`, and `tools/call` methods.
- Screen captures come from OneKVM's MJPEG media API; keyboard, mouse, and ATX operations go through the authenticated extension control API.
- The bearer token is stored as a secret extension setting and compared in constant time for every MCP request.
- ATX tools are detected dynamically and omitted from `tools/list` when the connected device does not expose ATX controls.
- The settings page uses the Vue and Naive UI environments provided by OneKVM UI instead of bundling another copy of either framework.

## Development note

OneKVM includes the extension version in web asset URLs and marks those assets as immutable. Whenever files under `web/` change, increment the manifest/package version as well. Increasing only the package revision can leave browsers using an older cached version of the settings page.

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).
