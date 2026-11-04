# OneKVM MCP 扩展

[English](README.md) | 简体中文

为经过鉴权的 AI Agent 提供 Model Context Protocol（MCP）端点，用于查看
和操作 OneKVM 所连接的计算机。Agent 可以截取当前画面、发送键盘和鼠标
输入，并在设备支持时使用 ATX 电源控制。

扩展与 OneKVM Core 分开安装，可以独立启用、停用或卸载，无需修改 Core。

> **构建说明：** 本仓库只包含扩展源码。正式软件包由 `onekvm-distro` 中的
> OpenEmbedded（OE）配方统一构建；本仓库不提供独立的正式构建流程。

## 可以做什么

- 将当前 OneKVM 视频帧截取为 JPEG 图片
- 发送单个 USB HID 按键用法，包括修饰键以及按下、保持或释放事件
- 输入 US-ASCII 文本，并配置字符之间的延迟
- 按最近一次截图的像素坐标移动指针
- 单击或双击鼠标左键、右键、中键，并滚动滚轮
- 在设备支持 ATX 时读取目标计算机的电源灯和硬盘灯状态
- 在设备支持 ATX 时短按电源键、长按强制关机或按下重启键
- 通过独立 Bearer Token 保护的无状态 Streamable HTTP 端点连接 MCP 客户端

## 安装与启用

软件包名称是 `onekvm-extension-mcp`。请通过 OneKVM 发行版的软件包或镜像
安装，然后使用插件管理器控制扩展：

```sh
onekvm-extension enable mcp
onekvm-extension disable mcp
```

## 配置与连接

打开 OneKVM 中的 MCP 扩展页面并配置：

- **监听接口：** 选择 `0.0.0.0`、一个网络接口，或填写 IP 地址。选择网络接口时，
  服务监听该接口的地址。已有配置会继续监听 `0.0.0.0`。
- **端口：** 选择 1024 到 65535 的 TCP 端口，默认 9710。已有配置使用这个端口。
- **访问令牌：** 自行填写 16–128 个字符的令牌，也可以让浏览器生成一个
  密码学安全的 64 字符令牌。生成的令牌保存后只显示一次，请立即复制并
  安全保存。
- **屏幕截图超时：** 服务等待视频帧的时间，可设为 1 到 15 秒，默认 5 秒。

将 MCP 客户端连接到页面上显示的直接地址：

```text
http://<设备地址>:<端口>/
```

监听接口为 `0.0.0.0` 时，使用设备上可访问的地址和所配置的端口。直接地址
使用 HTTP。也可以继续使用 OneKVM 网页地址：

```text
https://<你的-onekvm-地址>/plugins/mcp
```

每次请求都必须携带已配置的令牌。网页地址只检查这个令牌，不需要设备登录。

```http
Authorization: Bearer <访问令牌>
```

端点使用无状态 Streamable HTTP，支持 MCP 协议版本 `2024-11-05`、
`2025-03-26` 和 `2025-06-18`。MCP 客户端必须支持自定义 HTTP 鉴权头。

请将令牌视为密码；通过不可信网络访问 OneKVM 时必须使用 HTTPS。任何持有
令牌的人都可能看到目标计算机画面、控制键盘和鼠标，并可能操作电源控制。

## 可用工具

| 工具 | 说明 |
| --- | --- |
| `screen_capture` | 返回当前画面的 JPEG 图片及其像素尺寸。 |
| `keyboard_key` | 发送一个 USB HID 键盘用法，可带修饰键和 `press`、`down` 或 `up` 行为。 |
| `keyboard_type` | 输入最多 1,024 字节的 US-ASCII 文本，字符间隔可设为 0–1,000 ms。 |
| `mouse_move` | 按最近一次截图中的 `x`、`y` 像素坐标移动绝对指针。 |
| `mouse_click` | 单击或双击鼠标左键、右键或中键。 |
| `mouse_scroll` | 发送 -127 到 127 的相对滚轮值。 |
| `atx_status` | 返回可用的电源灯和硬盘灯状态；仅在设备提供 ATX 控制时发布。 |
| `atx_action` | 执行 `power_short`、`power_long` 或 `reset`；仅在设备提供 ATX 控制时发布。 |

使用 `mouse_move` 前应先调用 `screen_capture`。坐标从左上角 `0,0` 开始，
并且必须位于最近一次截图返回的尺寸范围内。

`keyboard_type` 使用美式键盘布局，只接受 US-ASCII。它无法直接表达的按键
或快捷键，请改用 `keyboard_key`，传入 USB HID usage ID 和修饰键位图。

## 插件工具接入

MCP 设置页的“插件工具”可控制其他插件是否公开其声明的工具。默认允许接入，
也可以改为默认禁止；每个插件可单独选择“跟随默认”“允许”或“禁止”。保存后生效。
接入列表只显示已注册工具的插件和已保存单独策略的插件；未注册工具会明确标出。
“工具列表”显示内置及插件工具的名称、用途、来源和已生效的可用状态，可点击“刷新工具”更新。
禁止的插件不会出现在 MCP 客户端的工具列表中，已缓存的工具名也无法调用。内置截图、键鼠和
ATX 工具继续可用。客户端若缓存了工具列表，可刷新列表或重新连接以更新显示。

其他插件通过 `mcp.tool` 扩展点声明工具，公开名称为 `<插件ID>__<工具ID>`。
参数、返回值及最小示例见 [工具贡献协议](docs/tool-contributions-v1.md)。

## 实现说明

- OneKVM 在 `/plugins/mcp` 发布扩展，并把请求代理到私有 Unix Socket。服务也在配置的 TCP 地址和端口上接受同样的请求。
- C++20 服务实现无状态 Streamable HTTP，以及 MCP 的 `initialize`、`ping`、
  `tools/list` 和 `tools/call` 方法。
- 截图来自 OneKVM 的 MJPEG 媒体 API；键盘、鼠标和 ATX 操作通过已鉴权的
  扩展控制 API 完成。
- Bearer Token 作为敏感扩展设置保存，每次 MCP 请求都会进行常量时间比较。
- ATX 工具动态探测；设备不提供 ATX 控制时，不会出现在 `tools/list` 中。
- 设置页面复用 OneKVM UI 提供的 Vue 和 Naive UI，不重复打包前端框架。

## 开发时需要注意

OneKVM 会把扩展版本写入 Web 资源 URL，并把这些资源标记为不可变缓存。
因此，只要修改了 `web/` 下的文件，就必须同步提升 manifest 和软件包版本。
只增加 package revision，浏览器仍可能继续使用旧版设置页面。

## 许可证

本项目使用 GNU General Public License v3.0，完整条款见
[`LICENSE`](LICENSE)。
