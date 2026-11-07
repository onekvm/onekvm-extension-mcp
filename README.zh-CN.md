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

打开 OneKVM 中的 MCP 扩展页面，复制 **MCP 地址**，并配置 16–128 个字符的
**访问令牌**。也可以在浏览器里生成密码学安全的 64 字符令牌；保存后请立即
从一次性弹窗复制并妥善保存。MCP 地址使用 OneKVM 网页端口：

```text
https://<你的-onekvm-地址>/plugins/mcp
```

展开 **高级连接设置** 可以配置独立 TCP 连接：

- **监听方式：** 选择所有接口（`0.0.0.0`）、网络接口或 IP 地址。
  选择网络接口时，监听该接口的地址。
- **端口：** 可设为 1024–65535，默认 9710。这是独立 TCP 端口；
  网页 MCP 地址继续使用 OneKVM 网页端口。
- **TCP 连接地址：** 客户端直接连接时，可复制生成的
  `http://<设备地址>:<端口>/`。监听所有接口时显示设备的可访问地址。
  独立连接使用 HTTP。
- **屏幕截图超时：** 等待视频帧的时间，可设为 1–15 秒，默认 5 秒。

已有监听和端口设置会保留。使用网页 MCP 地址时无需修改这些设置。

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
| `screen_capture` | 返回整屏 JPEG，并把这一帧保存 30 秒。 |
| `screen_changes` | 返回相对已保存画面有变化的区域；没变化则不返回图片。已保存的画面 30 秒后失效。 |
| `keyboard_key` | 发送一个 USB HID 键盘用法，可带修饰键和 `press`、`down` 或 `up` 行为。 |
| `keyboard_type` | 输入最多 1,024 字节的 US-ASCII 文本，字符间隔可设为 0–1,000 ms。 |
| `mouse_move` | 按最近一次截图中的 `x`、`y` 像素坐标移动绝对指针。 |
| `mouse_click_at` | 把绝对指针移到 `x`、`y` 像素并在该处点击。`button` 为 `left`、`right` 或 `middle`，`count` 为 1 或 2。 |
| `mouse_click` | 在指针当前位置单击或双击左键、右键或中键。 |
| `mouse_scroll` | 发送 -127 到 127 的相对滚轮值。 |
| `atx_status` | 返回可用的电源灯和硬盘灯状态；仅在设备提供 ATX 控制时发布。 |
| `atx_action` | 执行 `power_short`、`power_long` 或 `reset`；仅在设备提供 ATX 控制时发布。 |

使用 `mouse_move` 或 `mouse_click_at` 前应先调用 `screen_capture`。坐标从左上角 `0,0` 开始，
并且必须位于最近一次整屏截图返回的尺寸范围内。`screen_changes` 的图片只是变化区域，
要把返回的起点加到 `x`、`y` 上。已保存的画面保留 30 秒。

`keyboard_type` 使用美式键盘布局，只接受 US-ASCII。它无法直接表达的按键
或快捷键，请改用 `keyboard_key`，传入 USB HID usage ID 和修饰键位图。

## 插件工具接入

MCP 设置页的“插件工具”可控制其他插件是否公开其声明的工具。默认允许接入，
也可以改为默认禁止；每个插件可单独选择“跟随默认”“允许”或“禁止”。保存后生效。
接入列表只显示已注册工具的插件和已保存单独策略的插件；未注册工具会明确标出。
“工具列表”显示内置及插件工具的名称、用途、来源和已生效的可用状态。
可按名称、说明或来源搜索，不区分大小写，并按“全部”“可用”“已禁止”筛选状态。
筛选结果支持分页，每页可显示 10、20 或 50 项；修改关键词或状态后回到第一页。
同一标签页内再次进入设置页时会复用一分钟内的列表；过期后自动更新。保存设置或插件发生变更后重新获取，
“刷新工具”始终获取最新列表。
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
