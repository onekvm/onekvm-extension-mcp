# OneKVM MCP

[English](README.md) | 简体中文

> **构建说明：** 本仓库只包含扩展源码。扩展统一由 `onekvm-distro` 中的
> OpenEmbedded（OE）配方构建和打包；本仓库不提供独立的正式构建流程。

这是一个供 AI Agent 使用、带鉴权且无状态的 Streamable HTTP MCP 服务。
OneKVM 会将 `/plugins/mcp` 请求代理到扩展的私有 Unix Socket。

扩展提供以下工具：

- `screen_capture`：截取 OneKVM 画面
- `keyboard_key`：发送键盘按键
- `keyboard_type`：输入 US-ASCII 文本
- `mouse_move`：按最近一次截图的像素坐标移动鼠标
- `mouse_click`：点击鼠标
- `mouse_scroll`：滚动鼠标
- `atx_status`：读取 ATX 状态（设备支持 ATX 时可用）
- `atx_action`：执行 ATX 操作（设备支持 ATX 时可用）

每次 MCP 请求都必须携带 `Authorization: Bearer <访问令牌>`。扩展页面可
生成并保存加密安全的随机静态令牌；保存后，明文只会在复制对话框中显示
一次。
